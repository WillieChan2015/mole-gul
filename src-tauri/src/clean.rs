use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::thread;
use std::time::{Duration, Instant};
use tauri::Emitter;
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanResult {
    pub raw_output: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanListPath {
    pub path: String,
    pub size_hint: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanListSection {
    pub name: String,
    pub items: Vec<CleanListPath>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanListResult {
    pub sections: Vec<CleanListSection>,
}

#[tauri::command]
pub fn clean_scan(app_handle: tauri::AppHandle) -> Result<CleanResult, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    // 发送扫描开始事件
    let _ = app_handle.emit("clean:scan_started", ());

    let mut cmd = super::mole::mole_dry_run_command(&mole_path, "clean");
    let mut child = cmd.spawn().map_err(|e| format!("spawn failed: {}", e))?;

    let timeout = Duration::from_secs(300);
    let start = Instant::now();

    // Take stdout and read line by line in a separate thread
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let app_handle_clone = app_handle.clone();
    let stdout_thread = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut all_lines = Vec::new();
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    let _ = app_handle_clone.emit("clean:progress", &line);
                    all_lines.push(line);
                }
                Err(_) => break,
            }
        }
        all_lines.join("\n")
    });

    // Take stderr
    let stderr_thread = {
        let stderr = child.stderr.take();
        super::mole::take_and_read(stderr)
    };

    // Poll for exit with timeout
    let timed_out = super::mole::poll_child_with_timeout(&mut child, timeout, start);

    // Collect output
    let stdout_output = stdout_thread.join().unwrap_or_default();
    let stderr_output = stderr_thread.join().unwrap_or_default();

    if timed_out {
        return Err(format!(
            "timed out ({:.1}s >= {:.1}s)",
            start.elapsed().as_secs_f64(),
            timeout.as_secs_f64()
        ));
    }

    let status = child.wait().map_err(|e| format!("wait failed: {}", e))?;
    let code = status.code().unwrap_or(-1);

    if code != 0 {
        return Err(format!(
            "mole clean exited with {}\n{}",
            code, stderr_output
        ));
    }

    // 发送扫描完成事件
    let _ = app_handle.emit("clean:scan_completed", ());

    Ok(CleanResult {
        raw_output: stdout_output,
    })
}

#[tauri::command]
pub fn clean_execute(app_handle: tauri::AppHandle) -> Result<CleanResult, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;
    let (code, stdout, stderr) = super::mole::run_mole(&mole_path, "clean", &[], &[])
        .map_err(|e| format!("mole clean failed: {}", e))?;
    if code != 0 {
        return Err(format!("mole clean exited with {}\n{}", code, stderr));
    }
    let _ = app_handle
        .notification()
        .builder()
        .title("Cleanup complete")
        .body("Cleanup operation finished successfully.")
        .show();
    Ok(CleanResult { raw_output: stdout })
}

#[tauri::command]
pub fn clean_list_scan() -> Result<CleanListResult, String> {
    let home = std::env::var("HOME").map_err(|e| format!("cannot determine home: {}", e))?;
    let list_path = PathBuf::from(&home).join(".config/mole/clean-list.txt");
    let content = std::fs::read_to_string(&list_path)
        .map_err(|e| format!("cannot read {}: {}", list_path.display(), e))?;
    Ok(parse_clean_list(&content))
}

#[tauri::command]
pub fn clean_execute_selected(
    paths: Vec<String>,
    app_handle: tauri::AppHandle,
) -> Result<CleanResult, String> {
    if paths.is_empty() {
        return Err("no paths selected".to_string());
    }
    let mut deleted = 0u32;
    let mut errors: Vec<String> = Vec::new();
    for p in &paths {
        let path = PathBuf::from(p);
        if !path.exists() {
            continue;
        }
        match trash::delete(&path) {
            Ok(_) => deleted += 1,
            Err(_) => {
                // Fallback: direct removal
                let result = if path.is_dir() {
                    std::fs::remove_dir_all(&path)
                } else {
                    std::fs::remove_file(&path)
                };
                match result {
                    Ok(_) => deleted += 1,
                    Err(e) => errors.push(format!("{}: {}", p, e)),
                }
            }
        }
    }
    let _ = app_handle
        .notification()
        .builder()
        .title("Cleanup complete")
        .body(&format!("Deleted {} items.", deleted))
        .show();
    if errors.is_empty() {
        Ok(CleanResult {
            raw_output: format!("Deleted {} selected items.", deleted),
        })
    } else {
        Err(format!(
            "Deleted {} items, {} errors:\n{}",
            deleted,
            errors.len(),
            errors.join("\n")
        ))
    }
}

fn parse_clean_list(content: &str) -> CleanListResult {
    let mut sections: Vec<CleanListSection> = Vec::new();
    let mut current_section: Option<CleanListSection> = None;

    for line in content.lines() {
        let trimmed = line.trim();

        // Section header: === Section Name ===
        if trimmed.starts_with("===") && trimmed.ends_with("===") {
            // Save previous section
            if let Some(sec) = current_section.take() {
                sections.push(sec);
            }
            let name = trimmed
                .trim_start_matches("===")
                .trim_end_matches("===")
                .trim()
                .to_string();
            current_section = Some(CleanListSection {
                name,
                items: Vec::new(),
            });
            continue;
        }

        // Skip comments and empty lines
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Path line: /path/to/something  # optional comment
        if let Some(ref mut section) = current_section {
            let (path_part, size_hint) = if let Some(hash_pos) = trimmed.find('#') {
                let path = trimmed[..hash_pos].trim().to_string();
                let hint = trimmed[hash_pos + 1..].trim().to_string();
                (path, hint)
            } else {
                (trimmed.to_string(), String::new())
            };
            if !path_part.is_empty() {
                section.items.push(CleanListPath {
                    path: path_part,
                    size_hint,
                });
            }
        }
    }

    // Don't forget the last section
    if let Some(sec) = current_section {
        sections.push(sec);
    }

    CleanListResult { sections }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clean_result_serializes_with_camel_case() {
        let result = CleanResult {
            raw_output: "some output".to_string(),
        };
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["rawOutput"], "some output");
    }

    #[test]
    fn clean_result_serializes_raw_output_correctly() {
        let result = CleanResult {
            raw_output: "line1\nline2\nline3".to_string(),
        };
        let json = serde_json::to_string(&result).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["rawOutput"].as_str().unwrap(), "line1\nline2\nline3");
    }

    #[test]
    fn parse_clean_list_sections_and_paths() {
        let input = r#"# Header
=== User essentials ===
/path/a  # 5.8MB, 4 items
/path/b  # 204KB

=== App caches ===
/path/c  # 1.8MB, 57 items
"#;
        let result = parse_clean_list(input);
        assert_eq!(result.sections.len(), 2);
        assert_eq!(result.sections[0].name, "User essentials");
        assert_eq!(result.sections[0].items.len(), 2);
        assert_eq!(result.sections[0].items[0].path, "/path/a");
        assert_eq!(result.sections[0].items[0].size_hint, "5.8MB, 4 items");
        assert_eq!(result.sections[0].items[1].path, "/path/b");
        assert_eq!(result.sections[0].items[1].size_hint, "204KB");
        assert_eq!(result.sections[1].name, "App caches");
        assert_eq!(result.sections[1].items.len(), 1);
        assert_eq!(result.sections[1].items[0].path, "/path/c");
    }

    #[test]
    fn parse_clean_list_empty() {
        let result = parse_clean_list("");
        assert_eq!(result.sections.len(), 0);
    }

    #[test]
    fn parse_clean_list_no_size_hint() {
        let input = "=== Section ===\n/path/no-hint\n";
        let result = parse_clean_list(input);
        assert_eq!(result.sections[0].items[0].path, "/path/no-hint");
        assert_eq!(result.sections[0].items[0].size_hint, "");
    }

    #[test]
    fn clean_list_result_serializes_camel_case() {
        let result = CleanListResult {
            sections: vec![CleanListSection {
                name: "Test".to_string(),
                items: vec![CleanListPath {
                    path: "/a".to_string(),
                    size_hint: "1MB".to_string(),
                }],
            }],
        };
        let json = serde_json::to_value(&result).unwrap();
        assert!(json["sections"].is_array());
        assert_eq!(json["sections"][0]["items"][0]["sizeHint"], "1MB");
    }
}
