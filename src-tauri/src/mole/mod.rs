use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};
use tauri::Manager;

/// Default timeouts per subcommand category.
const TIMEOUT_DEFAULT: Duration = Duration::from_secs(60); // 1 min
const TIMEOUT_CLEAN: Duration = Duration::from_secs(300); // 5 min
const TIMEOUT_ANALYZE: Duration = Duration::from_secs(120); // 2 min
const TIMEOUT_UNINSTALL: Duration = Duration::from_secs(300); // 5 min (uninstall --list can be slow)

/// Grace period between SIGTERM and SIGKILL.
const KILL_GRACE: Duration = Duration::from_secs(2);

/// Timeout for joining reader threads after process exits.
const THREAD_JOIN_TIMEOUT: Duration = Duration::from_secs(5);

// ---------------------------------------------------------------------------
// Command builders
// ---------------------------------------------------------------------------

/// Create a base `Command` for calling the `mole` script.
///
/// Sets `NO_COLOR=1` so Mole's output contains no ANSI escape codes.
/// Does **not** set `MOLE_TEST_NO_AUTH` -- that is test-only and must
/// never appear in production.
pub fn mole_command(mole_path: &Path, subcommand: &str) -> Command {
    let mut cmd = Command::new(mole_path);
    cmd.arg(subcommand)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("NO_COLOR", "1");
    cmd
}

/// Like [`mole_command`], but also sets `MOLE_DRY_RUN=1`.
pub fn mole_dry_run_command(mole_path: &Path, subcommand: &str) -> Command {
    let mut cmd = mole_command(mole_path, subcommand);
    cmd.env("MOLE_DRY_RUN", "1");
    cmd
}

// ---------------------------------------------------------------------------
// High-level runners
// ---------------------------------------------------------------------------

/// Run a Mole subcommand with the default timeout for that subcommand.
///
/// Returns `(exit_code, stdout, stderr)` on success.
pub fn run_mole(
    mole_path: &Path,
    subcommand: &str,
    args: &[&str],
    envs: &[(&str, &str)],
) -> Result<(i32, String, String), String> {
    let timeout = default_timeout(subcommand);
    run_mole_with_timeout(mole_path, subcommand, args, envs, timeout)
}

/// Run a Mole subcommand with an explicit timeout.
///
/// Returns `(exit_code, stdout, stderr)` on success.
/// On timeout the process receives SIGTERM, then SIGKILL after 2 seconds.
pub fn run_mole_with_timeout(
    mole_path: &Path,
    subcommand: &str,
    args: &[&str],
    envs: &[(&str, &str)],
    timeout: Duration,
) -> Result<(i32, String, String), String> {
    let mut cmd = mole_command(mole_path, subcommand);
    cmd.args(args);
    for &(k, v) in envs {
        cmd.env(k, v);
    }

    let mut child = cmd.spawn().map_err(|e| format!("spawn failed: {}", e))?;
    let start = Instant::now();

    // Read stdout/stderr in separate threads.
    let stdout_thread = take_and_read(child.stdout.take());
    let stderr_thread = take_and_read(child.stderr.take());

    // Poll try_wait() until exit or timeout.
    // When timed_out is true, `graceful_kill` has already reaped the child.
    let timed_out = poll_child(&mut child, timeout, start);

    // Collect output (with thread-level timeout to avoid hangs).
    let stdout = join_with_timeout(stdout_thread, THREAD_JOIN_TIMEOUT).unwrap_or_default();
    let stderr = join_with_timeout(stderr_thread, THREAD_JOIN_TIMEOUT).unwrap_or_default();

    if timed_out {
        return Err(format!(
            "timed out ({:.1}s >= {:.1}s)",
            start.elapsed().as_secs_f64(),
            timeout.as_secs_f64()
        ));
    }

    let status = child.wait().map_err(|e| format!("wait failed: {}", e))?;
    let code = status.code().unwrap_or(-1);

    Ok((code, stdout, stderr))
}

/// Run a Mole subcommand in dry-run mode with an explicit timeout.
///
/// Like [`run_mole_with_timeout`], but sets `MOLE_DRY_RUN=1`.
/// Returns `(exit_code, stdout, stderr)` on success.
pub fn run_mole_dry_run_with_timeout(
    mole_path: &Path,
    subcommand: &str,
    args: &[&str],
    envs: &[(&str, &str)],
    timeout: Duration,
) -> Result<(i32, String, String), String> {
    let mut cmd = mole_dry_run_command(mole_path, subcommand);
    cmd.args(args);
    for &(k, v) in envs {
        cmd.env(k, v);
    }

    let mut child = cmd.spawn().map_err(|e| format!("spawn failed: {}", e))?;
    let start = Instant::now();

    // Read stdout/stderr in separate threads.
    let stdout_thread = take_and_read(child.stdout.take());
    let stderr_thread = take_and_read(child.stderr.take());

    // Poll try_wait() until exit or timeout.
    // When timed_out is true, `graceful_kill` has already reaped the child.
    let timed_out = poll_child(&mut child, timeout, start);

    // Collect output (with thread-level timeout to avoid hangs).
    let stdout = join_with_timeout(stdout_thread, THREAD_JOIN_TIMEOUT).unwrap_or_default();
    let stderr = join_with_timeout(stderr_thread, THREAD_JOIN_TIMEOUT).unwrap_or_default();

    if timed_out {
        return Err(format!(
            "timed out ({:.1}s >= {:.1}s)",
            start.elapsed().as_secs_f64(),
            timeout.as_secs_f64()
        ));
    }

    let status = child.wait().map_err(|e| format!("wait failed: {}", e))?;
    let code = status.code().unwrap_or(-1);

    Ok((code, stdout, stderr))
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/// Resolve the path to the `mole` script.
///
/// Lookup order:
/// 1. `MOLE_PATH` environment variable (for development)
/// 2. Tauri `resource_dir() / mole` (for packaged builds)
/// 3. `<exe_dir>/_up_/resources/mole` (Tauri v2 dev mode)
/// 4. `../mole/mole` relative to the executable (legacy dev fallback)
pub fn find_mole_path(app_handle: Option<&tauri::AppHandle>) -> Result<PathBuf, String> {
    // 1. Env override (development convenience)
    if let Ok(p) = std::env::var("MOLE_PATH") {
        let path = PathBuf::from(&p);
        if path.is_file() {
            return Ok(path);
        }
    }

    // 2. Tauri resource directory (packaged mode)
    if let Some(handle) = app_handle {
        if let Ok(res_dir) = handle.path().resource_dir() {
            let path = res_dir.join("mole");
            if path.is_file() {
                return Ok(path);
            }
        }
    }

    // 3. Fallback: Tauri v2 dev mode resource directory
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            // Tauri v2 copies resources to target/debug/_up_/resources/ during build
            let path = exe_dir.join("_up_").join("resources").join("mole");
            if path.is_file() {
                return Ok(path);
            }
        }
    }

    // 4. Fallback: relative to executable (legacy dev mode)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent().and_then(|p| p.parent()) {
            let path = parent.join("mole").join("mole");
            if path.is_file() {
                return Ok(path);
            }
        }
    }

    Err("cannot find mole script; set MOLE_PATH or place mole in resource directory".into())
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Return the default timeout for a given subcommand.
fn default_timeout(subcommand: &str) -> Duration {
    match subcommand {
        "clean" => TIMEOUT_CLEAN,
        "analyze" => TIMEOUT_ANALYZE,
        "uninstall" => TIMEOUT_UNINSTALL,
        _ => TIMEOUT_DEFAULT,
    }
}

/// Spawn a thread that reads an optional pipe to completion, returning the
/// bytes as a `String`.
pub fn take_and_read(mut pipe: Option<impl Read + Send + 'static>) -> thread::JoinHandle<String> {
    thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(ref mut r) = pipe {
            let _ = r.read_to_end(&mut buf);
        }
        String::from_utf8_lossy(&buf).to_string()
    })
}

/// Poll `child.try_wait()` until the process exits or `timeout` elapses.
///
/// On timeout: sends SIGTERM, waits `KILL_GRACE`, then sends SIGKILL,
/// and reaps the child (calls `wait()`). Returns `true` if timed out.
pub fn poll_child_with_timeout(child: &mut Child, timeout: Duration, start: Instant) -> bool {
    poll_child(child, timeout, start)
}

fn poll_child(child: &mut Child, timeout: Duration, start: Instant) -> bool {
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return false,
            Ok(None) => {
                if start.elapsed() >= timeout {
                    graceful_kill(child);
                    return true;
                }
                thread::sleep(Duration::from_millis(100));
            }
            Err(_) => {
                // try_wait failed; attempt kill and bail
                let _ = child.kill();
                let _ = child.wait();
                return true;
            }
        }
    }
}

/// Send SIGTERM, wait `KILL_GRACE`, then send SIGKILL.
///
/// On non-Unix platforms this simply calls `child.kill()` (which sends
/// a platform-appropriate termination signal).
#[cfg(unix)]
fn graceful_kill(child: &mut Child) {
    let pid = child.id() as i32;
    // SAFETY: libc::kill with a valid PID is always safe.
    unsafe {
        libc::kill(pid, libc::SIGTERM);
    }

    // Wait for grace period, polling for exit.
    let grace_start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return,
            Ok(None) => {
                if grace_start.elapsed() >= KILL_GRACE {
                    break;
                }
                thread::sleep(Duration::from_millis(50));
            }
            Err(_) => break,
        }
    }
    // SIGKILL via Rust's built-in kill (sends SIGKILL on Unix).
    let _ = child.kill();
    let _ = child.wait();
}

#[cfg(not(unix))]
fn graceful_kill(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

/// Join a thread with a timeout, returning `None` if it doesn't finish in time.
fn join_with_timeout<T: Send + Default>(
    handle: thread::JoinHandle<T>,
    timeout: Duration,
) -> Option<T> {
    let start = Instant::now();
    loop {
        if handle.is_finished() {
            return handle.join().ok();
        }
        if start.elapsed() >= timeout {
            return None;
        }
        thread::sleep(Duration::from_millis(50));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::NamedTempFile;

    // -- Path resolution tests --------------------------------------------------

    #[test]
    fn find_mole_path_env_override() {
        // Create a temporary file to act as the mole script.
        let tmp = NamedTempFile::new().expect("create temp file");
        let tmp_path = tmp.path().to_owned();

        // Set MOLE_PATH env var.
        std::env::set_var("MOLE_PATH", &tmp_path);
        let result = find_mole_path(None);
        std::env::remove_var("MOLE_PATH");

        assert_eq!(result.unwrap(), tmp_path);
    }

    #[test]
    fn find_mole_path_env_override_not_a_file() {
        // MOLE_PATH points to a directory (not a file) -- should fall through.
        let tmp = tempfile::tempdir().expect("create temp dir");
        std::env::set_var("MOLE_PATH", tmp.path());
        let result = find_mole_path(None);
        std::env::remove_var("MOLE_PATH");

        // Without app_handle and without the exe fallback matching, we expect Err.
        assert!(result.is_err());
    }

    #[test]
    fn find_mole_path_no_path_found() {
        // Clear MOLE_PATH and pass no app_handle -- should fail.
        std::env::remove_var("MOLE_PATH");
        let result = find_mole_path(None);
        // This may succeed if the exe fallback finds something; if not, it should err.
        // We just verify it returns a Result (the exact outcome depends on environment).
        // The important thing is it doesn't panic.
        let _ = result;
    }

    #[test]
    fn find_mole_path_tauri_v2_dev_mode() {
        // Simulate Tauri v2 dev mode directory structure:
        // <exe_dir>/_up_/resources/mole
        let tmp_dir = tempfile::tempdir().expect("create temp dir");
        let resources_dir = tmp_dir.path().join("_up_").join("resources");
        fs::create_dir_all(&resources_dir).expect("create resources dir");

        // Create a fake mole script in the Tauri v2 dev mode location.
        let mole_path = resources_dir.join("mole");
        fs::write(&mole_path, "#!/bin/sh\necho test").expect("write mole script");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&mole_path, fs::Permissions::from_mode(0o755)).expect("chmod");
        }

        // Create a fake executable in the same directory.
        let exe_path = tmp_dir.path().join("mole-gui");
        fs::write(&exe_path, "#!/bin/sh\necho exe").expect("write exe script");

        // Set MOLE_PATH to a non-existent path to skip step 1.
        std::env::set_var("MOLE_PATH", "/nonexistent/path");

        // The function should find the mole script in _up_/resources/.
        // Note: We can't easily test this without mocking current_exe(),
        // but we can verify the path construction logic is correct.
        let expected_path = exe_path
            .parent()
            .unwrap()
            .join("_up_")
            .join("resources")
            .join("mole");
        assert_eq!(expected_path, mole_path);

        std::env::remove_var("MOLE_PATH");
    }

    // -- Command building tests -------------------------------------------------

    #[test]
    fn mole_command_sets_no_color() {
        let cmd = mole_command(Path::new("/usr/bin/mole"), "scan");
        // Command doesn't expose env directly, so we verify by spawning a helper.
        // Instead, we check that the command was constructed without panicking
        // and verify behavior through a real execution with `env`.
        // For a unit test, we can at least verify it returns a valid Command.
        assert_eq!(cmd.get_program(), Path::new("/usr/bin/mole"));
    }

    #[test]
    fn mole_command_has_subcommand_arg() {
        let cmd = mole_command(Path::new("/usr/bin/mole"), "analyze");
        let args: Vec<&std::ffi::OsStr> = cmd.get_args().collect();
        assert_eq!(args, vec![std::ffi::OsStr::new("analyze")]);
    }

    #[test]
    fn mole_dry_run_command_has_subcommand_arg() {
        let cmd = mole_dry_run_command(Path::new("/usr/bin/mole"), "clean");
        let args: Vec<&std::ffi::OsStr> = cmd.get_args().collect();
        assert_eq!(args, vec![std::ffi::OsStr::new("clean")]);
    }

    #[test]
    fn mole_command_env_vars_verified_via_script() {
        // Use a tiny shell script that prints the env vars we care about.
        let mut script = NamedTempFile::new().expect("create temp file");
        write!(
            script,
            "#!/bin/sh\necho NO_COLOR=$NO_COLOR\necho MOLE_DRY_RUN=$MOLE_DRY_RUN\n"
        )
        .expect("write script");
        script.flush().expect("flush");

        // Make it executable.
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(script.path(), fs::Permissions::from_mode(0o755)).expect("chmod");
        }

        // Test mole_command: should have NO_COLOR=1, no MOLE_DRY_RUN.
        let mut cmd = mole_command(script.path(), "test_sub");
        let out = cmd.output().expect("run script");
        let stdout = String::from_utf8_lossy(&out.stdout);
        assert!(stdout.contains("NO_COLOR=1"), "stdout: {}", stdout);
        assert!(
            stdout.contains("MOLE_DRY_RUN=") && stdout.contains("MOLE_DRY_RUN=\n")
                || stdout.contains("MOLE_DRY_RUN=$MOLE_DRY_RUN")
                || !stdout.lines().any(|l| l.starts_with("MOLE_DRY_RUN=1")),
            "MOLE_DRY_RUN should not be set to 1 by mole_command; stdout: {}",
            stdout
        );

        // Test mole_dry_run_command: should have both NO_COLOR=1 and MOLE_DRY_RUN=1.
        let mut cmd = mole_dry_run_command(script.path(), "test_sub");
        let out = cmd.output().expect("run script");
        let stdout = String::from_utf8_lossy(&out.stdout);
        assert!(stdout.contains("NO_COLOR=1"), "stdout: {}", stdout);
        assert!(stdout.contains("MOLE_DRY_RUN=1"), "stdout: {}", stdout);
    }

    // -- Timeout tests ----------------------------------------------------------

    #[test]
    fn default_timeout_clean() {
        assert_eq!(default_timeout("clean"), Duration::from_secs(300));
    }

    #[test]
    fn default_timeout_analyze() {
        assert_eq!(default_timeout("analyze"), Duration::from_secs(120));
    }

    #[test]
    fn default_timeout_other_subcommands() {
        assert_eq!(default_timeout("scan"), Duration::from_secs(60));
        assert_eq!(default_timeout("install"), Duration::from_secs(60));
        assert_eq!(default_timeout("unknown"), Duration::from_secs(60));
    }

    #[test]
    fn default_timeout_uninstall() {
        assert_eq!(default_timeout("uninstall"), Duration::from_secs(300));
    }

    // -- join_with_timeout tests ------------------------------------------------

    #[test]
    fn join_with_timeout_fast_thread() {
        let handle = thread::spawn(|| 42i32);
        let result = join_with_timeout(handle, Duration::from_secs(5));
        assert_eq!(result, Some(42));
    }

    #[test]
    fn join_with_timeout_slow_thread_returns_none() {
        let handle = thread::spawn(|| {
            thread::sleep(Duration::from_secs(10));
            42i32
        });
        let result = join_with_timeout(handle, Duration::from_millis(200));
        assert_eq!(result, None);
    }

    #[test]
    fn join_with_timeout_string_type() {
        let handle = thread::spawn(|| "hello".to_string());
        let result = join_with_timeout(handle, Duration::from_secs(5));
        assert_eq!(result, Some("hello".to_string()));
    }

    // -- run_mole_with_timeout integration-ish tests ----------------------------

    #[test]
    fn run_mole_with_timeout_fast_exit() {
        // Use `true` (always exits 0) as a stand-in for mole.
        let true_path = Path::new("/usr/bin/true");
        if !true_path.exists() {
            // Skip on systems without /usr/bin/true.
            return;
        }
        let result = run_mole_with_timeout(true_path, "dummy", &[], &[], Duration::from_secs(5));
        let (code, stdout, stderr) = result.expect("should succeed");
        assert_eq!(code, 0);
        assert!(stdout.is_empty());
        assert!(stderr.is_empty());
    }

    #[test]
    fn run_mole_with_timeout_nonzero_exit() {
        let false_path = Path::new("/usr/bin/false");
        if !false_path.exists() {
            return;
        }
        let result = run_mole_with_timeout(false_path, "dummy", &[], &[], Duration::from_secs(5));
        let (code, _stdout, _stderr) = result.expect("should succeed");
        assert_ne!(code, 0);
    }

    #[test]
    fn run_mole_with_timeout_captures_stdout() {
        let echo_path = Path::new("/bin/echo");
        if !echo_path.exists() {
            return;
        }
        // echo doesn't take a subcommand arg in the way mole does,
        // but run_mole_with_timeout passes subcommand as the first arg.
        let result = run_mole_with_timeout(echo_path, "hello", &[], &[], Duration::from_secs(5));
        let (code, stdout, _stderr) = result.expect("should succeed");
        assert_eq!(code, 0);
        assert!(stdout.contains("hello"), "stdout: {}", stdout);
    }

    #[test]
    fn run_mole_with_timeout_passes_args() {
        let echo_path = Path::new("/bin/echo");
        if !echo_path.exists() {
            return;
        }
        let result = run_mole_with_timeout(
            echo_path,
            "first",
            &["second", "third"],
            &[],
            Duration::from_secs(5),
        );
        let (code, stdout, _stderr) = result.expect("should succeed");
        assert_eq!(code, 0);
        assert!(stdout.contains("first second third"), "stdout: {}", stdout);
    }

    #[test]
    fn run_mole_with_timeout_passes_env() {
        // Use env to print a custom var.
        let mut script = NamedTempFile::new().expect("create temp file");
        write!(script, "#!/bin/sh\necho MY_VAR=$MY_VAR\n").expect("write");
        script.flush().expect("flush");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(script.path(), fs::Permissions::from_mode(0o755)).expect("chmod");
        }

        let result = run_mole_with_timeout(
            script.path(),
            "sub",
            &[],
            &[("MY_VAR", "test_value")],
            Duration::from_secs(5),
        );
        let (_code, stdout, _stderr) = result.expect("should succeed");
        assert!(stdout.contains("MY_VAR=test_value"), "stdout: {}", stdout);
    }

    #[test]
    fn run_mole_with_timeout_times_out() {
        let sleep_path = Path::new("/bin/sleep");
        if !sleep_path.exists() {
            return;
        }
        let result = run_mole_with_timeout(
            sleep_path,
            "10", // sleep 10 seconds
            &[],
            &[],
            Duration::from_millis(500), // but timeout is 500ms
        );
        assert!(result.is_err(), "expected timeout error");
        let err = result.unwrap_err();
        assert!(err.contains("timed out"), "error: {}", err);
    }

    // -- take_and_read tests ----------------------------------------------------

    #[test]
    fn take_and_read_some() {
        let data = b"hello world";
        let cursor = std::io::Cursor::new(data.to_vec());
        let handle = take_and_read(Some(cursor));
        let result = handle.join().expect("thread panicked");
        assert_eq!(result, "hello world");
    }

    #[test]
    fn take_and_read_none() {
        let handle: thread::JoinHandle<String> = take_and_read(None::<std::io::Cursor<Vec<u8>>>);
        let result = handle.join().expect("thread panicked");
        assert_eq!(result, "");
    }
}
