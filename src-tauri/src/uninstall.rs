use std::io::{BufRead, BufReader};
use std::thread;
use std::time::Duration;
use tauri::Emitter;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub bundle_id: String,
    pub source: String,
    pub uninstall_name: String,
    pub path: String,
    pub size: String,
}

#[tauri::command]
pub fn uninstall_list(app_handle: tauri::AppHandle) -> Result<Vec<AppInfo>, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    // 发送扫描开始事件
    let _ = app_handle.emit("uninstall:scan_started", ());

    let mut cmd = super::mole::mole_command(&mole_path, "uninstall");
    cmd.arg("--list");
    let mut child = cmd.spawn().map_err(|e| format!("spawn failed: {}", e))?;

    let timeout = Duration::from_secs(300);
    let start = std::time::Instant::now();

    // Take stdout and read line by line in a separate thread
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let app_handle_clone = app_handle.clone();
    let stdout_thread = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut all_lines = Vec::new();
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    let _ = app_handle_clone.emit("uninstall:progress", &line);
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
            "mole uninstall --list exited with {}\n{}",
            code, stderr_output
        ));
    }

    // 发送扫描完成事件
    let _ = app_handle.emit("uninstall:scan_completed", ());

    serde_json::from_str(&stdout_output).map_err(|e| format!("failed to parse app list: {}", e))
}

#[tauri::command]
pub fn uninstall_app(app_handle: tauri::AppHandle, name: String) -> Result<String, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    // 发送卸载开始事件
    let _ = app_handle.emit("uninstall:uninstall_started", ());

    let mut cmd = super::mole::mole_command(&mole_path, "uninstall");
    cmd.arg(&name);
    let mut child = cmd.spawn().map_err(|e| format!("spawn failed: {}", e))?;

    let timeout = Duration::from_secs(300);
    let start = std::time::Instant::now();

    // Take stdout and read line by line in a separate thread
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let app_handle_clone = app_handle.clone();
    let stdout_thread = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        let mut all_lines = Vec::new();
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    let _ = app_handle_clone.emit("uninstall:progress", &line);
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
            "mole uninstall exited with {}\n{}",
            code, stderr_output
        ));
    }

    // 发送卸载完成事件
    let _ = app_handle.emit("uninstall:uninstall_completed", ());

    Ok(stdout_output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_info_deserializes_from_json() {
        let json = r#"{
            "name": "Safari",
            "bundle_id": "com.apple.Safari",
            "source": "system",
            "uninstall_name": "Safari",
            "path": "/Applications/Safari.app",
            "size": "120MB"
        }"#;
        let info: AppInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.name, "Safari");
        assert_eq!(info.bundle_id, "com.apple.Safari");
        assert_eq!(info.source, "system");
        assert_eq!(info.uninstall_name, "Safari");
        assert_eq!(info.path, "/Applications/Safari.app");
        assert_eq!(info.size, "120MB");
    }

    #[test]
    fn app_info_serializes_to_json() {
        let info = AppInfo {
            name: "Safari".to_string(),
            bundle_id: "com.apple.Safari".to_string(),
            source: "system".to_string(),
            uninstall_name: "Safari".to_string(),
            path: "/Applications/Safari.app".to_string(),
            size: "120MB".to_string(),
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["name"], "Safari");
        assert_eq!(json["bundle_id"], "com.apple.Safari");
        assert_eq!(json["source"], "system");
        assert_eq!(json["uninstall_name"], "Safari");
        assert_eq!(json["path"], "/Applications/Safari.app");
        assert_eq!(json["size"], "120MB");
    }
}
