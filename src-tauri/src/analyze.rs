use std::io::{BufRead, BufReader};
use std::thread;
use std::time::Duration;
use tauri::Emitter;

#[tauri::command]
pub fn analyze_path(app_handle: tauri::AppHandle, path: String) -> Result<String, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;

    // 发送分析开始事件
    let _ = app_handle.emit("analyze:started", ());

    let mut cmd = super::mole::mole_command(&mole_path, "analyze");
    cmd.args(&["--json", &path]);
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
                    let _ = app_handle_clone.emit("analyze:progress", &line);
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
            "mole analyze exited with {}\n{}",
            code, stderr_output
        ));
    }

    // 发送分析完成事件
    let _ = app_handle.emit("analyze:completed", ());

    Ok(stdout_output)
}
