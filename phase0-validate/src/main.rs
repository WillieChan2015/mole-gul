//! Phase 0 验证程序：确认 Mole CLI 可通过 std::process::Command 可靠调用。
//!
//! 8 项测试对应 IMPLEMENTATION_PLAN.md 中的 Phase 0 验证项：
//! 1. 基本命令执行  2. NO_COLOR  3. history --json  4. uninstall --list
//! 5. clean dry-run  6. optimize dry-run  7. purge dry-run  8. 超时 kill
//!
//! 注意：所有测试使用 MOLE_TEST_NO_AUTH=1 跳过 sudo 认证（避免弹窗）。
//! 生产环境不应设置此变量，GUI 需自行预认证 sudo（见计划文档 sudo 策略）。

use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use std::env;
use std::io::Read;
use std::thread;


fn main() {
    let args: Vec<String> = env::args().collect();
    let mole_dir = args.get(1).cloned().unwrap_or_else(|| {
        // Phase 1 后应改为项目内的 mole-src/ 目录
        env::var("MOLE_SRC_DIR").unwrap_or_else(|_| {
            eprintln!("用法: cargo run -- <mole-src-dir>");
            eprintln!("或设置 MOLE_SRC_DIR 环境变量");
            std::process::exit(1);
        })
    });

    println!("=== Phase 0: Mole GUI 可行性验证 ===");
    println!("Mole 源码目录: {}\n", mole_dir);

    let mut passed = 0u32;
    let mut failed = 0u32;

    // Test 1: 基本命令执行
    println!("--- 1. 基本命令执行 (mole version) ---");
    match run_mole(&mole_dir, &["version"], &[]) {
        Ok((code, stdout, _)) => {
            if code == 0 && stdout.contains("Mole version") {
                println!("  ✅ PASS: {}", stdout.trim());
                passed += 1;
            } else {
                println!("  ❌ FAIL: exit code={}, output={}", code, stdout.trim());
                failed += 1;
            }
        }
        Err(e) => { println!("  ❌ FAIL: {}", e); failed += 1; }
    }

    // Test 2: NO_COLOR 环境变量
    println!("\n--- 2. NO_COLOR=1 禁用 ANSI 颜色码 ---");
    match run_mole(&mole_dir, &["version"], &[("NO_COLOR", "1")]) {
        Ok((code, stdout, _)) => {
            if code == 0 && !stdout.contains("\x1b[") {
                println!("  ✅ PASS: 输出中无 ANSI 转义码");
                passed += 1;
            } else {
                println!("  ❌ FAIL: 输出中包含 ANSI 转义码");
                failed += 1;
            }
        }
        Err(e) => { println!("  ❌ FAIL: {}", e); failed += 1; }
    }

    // Test 3: history --json
    println!("\n--- 3. history --json 输出 JSON ---");
    match run_mole(&mole_dir, &["history", "--json"], &[
        ("NO_COLOR", "1"), ("MOLE_TEST_NO_AUTH", "1"),
    ]) {
        Ok((code, stdout, _)) => {
            if code == 0 {
                match serde_json::from_str::<serde_json::Value>(&stdout) {
                    Ok(json) => {
                        if json.get("sessions").is_some() && json.get("deletions").is_some() {
                            println!("  ✅ PASS: JSON 格式正确，包含 sessions 和 deletions");
                            passed += 1;
                        } else {
                            println!("  ❌ FAIL: JSON 缺少 sessions/deletions 字段");
                            failed += 1;
                        }
                    }
                    Err(e) => { println!("  ❌ FAIL: JSON 解析失败: {}", e); failed += 1; }
                }
            } else { println!("  ❌ FAIL: exit code={}", code); failed += 1; }
        }
        Err(e) => { println!("  ❌ FAIL: {}", e); failed += 1; }
    }

    // Test 4: uninstall --list JSON
    println!("\n--- 4. uninstall --list 输出 JSON ---");
    match run_mole(&mole_dir, &["uninstall", "--list"], &[
        ("NO_COLOR", "1"), ("MOLE_TEST_NO_AUTH", "1"),
    ]) {
        Ok((code, stdout, _)) => {
            if code == 0 {
                match serde_json::from_str::<serde_json::Value>(&stdout) {
                    Ok(json) => {
                        if let Some(arr) = json.as_array() {
                            if !arr.is_empty() {
                                let first = &arr[0];
                                let ok = first.get("name").is_some()
                                    && first.get("bundle_id").is_some()
                                    && first.get("path").is_some()
                                    && first.get("size").is_some();
                                if ok {
                                    println!("  ✅ PASS: {} 个应用，字段齐全 (name/bundle_id/path/size)", arr.len());
                                    passed += 1;
                                } else {
                                    println!("  ❌ FAIL: JSON 字段不完整");
                                    failed += 1;
                                }
                            } else {
                                println!("  ⚠️ WARN: 空数组，视为通过");
                                passed += 1;
                            }
                        } else { println!("  ❌ FAIL: JSON 不是数组"); failed += 1; }
                    }
                    Err(e) => { println!("  ❌ FAIL: JSON 解析失败: {}", e); failed += 1; }
                }
            } else { println!("  ❌ FAIL: exit code={}", code); failed += 1; }
        }
        Err(e) => { println!("  ❌ FAIL: {}", e); failed += 1; }
    }

    // Test 5: clean dry-run + NO_COLOR
    println!("\n--- 5. clean dry-run + NO_COLOR 文本输出 ---");
    let start = Instant::now();
    match run_mole_timeout(&mole_dir, &["clean"], &[
        ("NO_COLOR", "1"), ("MOLE_TEST_NO_AUTH", "1"), ("MOLE_DRY_RUN", "1"),
    ], Duration::from_secs(300)) {
        Ok((code, stdout, _)) => {
            let elapsed = start.elapsed();
            let has_section = stdout.contains("➤");
            let has_item = stdout.contains("✓");
            let no_ansi = !stdout.contains("\x1b[");
            if code == 0 && has_section && has_item && no_ansi {
                println!("  ✅ PASS: section(➤) + item(✓) 标记齐全，无 ANSI 码，{:.1}s", elapsed.as_secs_f64());
                passed += 1;
            } else {
                println!("  ❌ FAIL: code={}, section={}, item={}, no_ansi={}", code, has_section, has_item, no_ansi);
                failed += 1;
            }
        }
        Err(e) => { println!("  ❌ FAIL: {}", e); failed += 1; }
    }

    // Test 6: optimize dry-run + NO_COLOR
    println!("\n--- 6. optimize dry-run + NO_COLOR 文本输出 ---");
    let start = Instant::now();
    match run_mole_timeout(&mole_dir, &["optimize"], &[
        ("NO_COLOR", "1"), ("MOLE_TEST_NO_AUTH", "1"), ("MOLE_DRY_RUN", "1"),
    ], Duration::from_secs(120)) {
        Ok((code, stdout, _)) => {
            let elapsed = start.elapsed();
            let has_section = stdout.contains("➤");
            let no_ansi = !stdout.contains("\x1b[");
            if code == 0 && has_section && no_ansi {
                println!("  ✅ PASS: section(➤) 标记齐全，无 ANSI 码，{:.1}s", elapsed.as_secs_f64());
                passed += 1;
            } else {
                println!("  ❌ FAIL: code={}, section={}, no_ansi={}", code, has_section, no_ansi);
                failed += 1;
            }
        }
        Err(e) => { println!("  ❌ FAIL: {}", e); failed += 1; }
    }

    // Test 7: purge dry-run + NO_COLOR
    println!("\n--- 7. purge dry-run + NO_COLOR 文本输出 ---");
    let start = Instant::now();
    match run_mole_timeout(&mole_dir, &["purge"], &[
        ("NO_COLOR", "1"), ("MOLE_TEST_NO_AUTH", "1"), ("MOLE_DRY_RUN", "1"),
    ], Duration::from_secs(120)) {
        Ok((code, stdout, _)) => {
            let elapsed = start.elapsed();
            let has_summary = stdout.contains("Would free");
            let no_ansi = !stdout.contains("\x1b[");
            if code == 0 && has_summary && no_ansi {
                println!("  ✅ PASS: 汇总信息齐全，无 ANSI 码，{:.1}s", elapsed.as_secs_f64());
                passed += 1;
            } else {
                println!("  ❌ FAIL: code={}, summary={}, no_ansi={}", code, has_summary, no_ansi);
                failed += 1;
            }
        }
        Err(e) => { println!("  ❌ FAIL: {}", e); failed += 1; }
    }

    // Test 8: subprocess 超时控制 (10秒超时，clean 远超此时间)
    println!("\n--- 8. subprocess 超时控制 (10秒超时) ---");
    let start = Instant::now();
    match run_mole_timeout(&mole_dir, &["clean"], &[
        ("NO_COLOR", "1"), ("MOLE_TEST_NO_AUTH", "1"), ("MOLE_DRY_RUN", "1"),
    ], Duration::from_secs(10)) {
        Ok((_, stdout, _)) => {
            let elapsed = start.elapsed();
            println!("  ⚠️ SKIP: 命令在超时前完成 ({:.1}s)，无法验证超时机制", elapsed.as_secs_f64());
            println!("  (stdout {} 字节，若需强制验证请用更短超时)", stdout.len());
            // 不计入 passed/failed，因为超时机制未被验证
        }
        Err(e) => {
            let elapsed = start.elapsed();
            if elapsed < Duration::from_secs(30) {
                println!("  ✅ PASS: 超时触发 ({:.1}s): {}", elapsed.as_secs_f64(), e);
                passed += 1;
            } else {
                println!("  ❌ FAIL: 超时未生效 ({:.1}s): {}", elapsed.as_secs_f64(), e);
                failed += 1;
            }
        }
    }

    // Summary
    println!("\n=== 验证结果汇总 ===");
    println!("通过: {} / {}", passed, passed + failed);
    println!("失败: {} / {}", failed, passed + failed);

    if failed > 0 {
        std::process::exit(1);
    }
}

fn run_mole(mole_dir: &str, args: &[&str], envs: &[(&str, &str)])
    -> Result<(i32, String, String), String>
{
    run_mole_timeout(mole_dir, args, envs, Duration::from_secs(30))
}

fn join_with_timeout<T: Send + Default>(
    handle: thread::JoinHandle<T>, timeout: Duration,
) -> Option<T> {
    let start = Instant::now();
    loop {
        if handle.is_finished() {
            return handle.join().ok();
        }
        if start.elapsed() >= timeout {
            return None; // 线程超时，返回默认值
        }
        thread::sleep(Duration::from_millis(50));
    }
}

fn run_mole_timeout(
    mole_dir: &str, args: &[&str], envs: &[(&str, &str)], timeout: Duration,
) -> Result<(i32, String, String), String> {
    let mole_bin = format!("{}/mole", mole_dir.trim_end_matches('/'));
    let mut cmd = Command::new(&mole_bin);
    cmd.args(args)
       .stdin(Stdio::null())
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    for &(k, v) in envs { cmd.env(k, v); }

    let mut child = cmd.spawn().map_err(|e| format!("执行失败: {}", e))?;
    let start = Instant::now();

    // Take stdout/stderr handles for reading in threads
    let mut child_stdout = child.stdout.take();
    let mut child_stderr = child.stderr.take();

    // Spawn reader threads
    let stdout_thread = thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(ref mut so) = child_stdout {
            let _ = so.read_to_end(&mut buf);
        }
        buf
    });
    let stderr_thread = thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(ref mut se) = child_stderr {
            let _ = se.read_to_end(&mut buf);
        }
        buf
    });

    // Wait with timeout using a polling loop
    let mut timed_out = false;
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if start.elapsed() >= timeout {
                    if let Err(e) = child.kill() {
                        eprintln!("  [warn] kill 失败: {}", e);
                    }
                    timed_out = true;
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }
            Err(e) => return Err(format!("等待失败: {}", e)),
        }
    }

    // Collect output from reader threads (with timeout for zombie sub-processes)
    let stdout_buf = join_with_timeout(stdout_thread, Duration::from_secs(5))
        .unwrap_or_default();
    let stderr_buf = join_with_timeout(stderr_thread, Duration::from_secs(5))
        .unwrap_or_default();

    let status = child.wait().map_err(|e| format!("wait 失败: {}", e))?;
    let elapsed = start.elapsed();

    let code = status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&stdout_buf).to_string();
    let stderr = String::from_utf8_lossy(&stderr_buf).to_string();

    if timed_out {
        return Err(format!("超时 ({:.1}s >= {:.1}s)", elapsed.as_secs_f64(), timeout.as_secs_f64()));
    }

    Ok((code, stdout, stderr))
}
