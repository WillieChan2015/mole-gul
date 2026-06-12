use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

fn main() {
    // Detect current architecture
    let arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_else(|_| {
        if cfg!(target_arch = "aarch64") {
            "aarch64".to_string()
        } else {
            "x86_64".to_string()
        }
    });

    let mole_src = PathBuf::from("../mole-src");
    let bin_dir = mole_src.join("bin");

    // Check for pre-built Go binaries (architecture-specific release names)
    let arch_suffix = if arch == "aarch64" { "arm64" } else { "amd64" };
    let analyze_go = bin_dir.join(format!("analyze-darwin-{}", arch_suffix));
    let status_go = bin_dir.join(format!("status-darwin-{}", arch_suffix));
    // Also check local build names (analyze-go, status-go)
    let analyze_go_local = bin_dir.join("analyze-go");
    let status_go_local = bin_dir.join("status-go");

    let go_binaries_exist = (analyze_go.exists() && status_go.exists())
        || (analyze_go_local.exists() && status_go_local.exists());

    if !go_binaries_exist {
        println!(
            "cargo:warning=Go binaries not found at {:?} and {:?}",
            analyze_go, status_go
        );

        // Try to compile Go binaries if Go toolchain is available
        let has_go = env::var("PATH")
            .map(|path| env::split_paths(&path).any(|p| p.join("go").exists()))
            .unwrap_or(false);

        if has_go {
            println!("cargo:warning=Go toolchain found, attempting to build Go binaries...");
            let status = Command::new("make")
                .arg("build")
                .current_dir(&mole_src)
                .status();

            match status {
                Ok(s) if s.success() => {
                    println!("cargo:warning=Go binaries built successfully");
                }
                Ok(s) => {
                    panic!("Go build failed with status: {}", s);
                }
                Err(e) => {
                    panic!("Failed to run make build: {}", e);
                }
            }
        } else {
            println!("cargo:warning=Go toolchain not found, skipping Go binary compilation");
        }
    } else {
        println!("cargo:warning=Go binaries found, skipping compilation");
    }

    // Copy Shell scripts to resources directory
    // Tauri expects resources relative to the project root (../resources from src-tauri)
    let resources_dir = PathBuf::from("../resources");

    // Create resources directory if it doesn't exist
    fs::create_dir_all(&resources_dir).expect("Failed to create resources directory");

    // Copy mole entry point
    let mole_src_file = mole_src.join("mole");
    if mole_src_file.exists() {
        fs::copy(&mole_src_file, resources_dir.join("mole")).expect("Failed to copy mole script");
        println!("cargo:warning=Copied mole script to resources");
    } else {
        println!("cargo:warning=mole script not found at {:?}", mole_src_file);
    }

    // Copy bin/ directory
    if bin_dir.exists() {
        let resources_bin = resources_dir.join("bin");
        fs::create_dir_all(&resources_bin).expect("Failed to create bin resources directory");
        copy_dir_contents(&bin_dir, &resources_bin).expect("Failed to copy bin directory");
        println!("cargo:warning=Copied bin/ directory to resources");
    } else {
        println!("cargo:warning=bin directory not found at {:?}", bin_dir);
    }

    // Copy lib/ directory
    let lib_dir = mole_src.join("lib");
    if lib_dir.exists() {
        let resources_lib = resources_dir.join("lib");
        fs::create_dir_all(&resources_lib).expect("Failed to create lib resources directory");
        copy_dir_contents(&lib_dir, &resources_lib).expect("Failed to copy lib directory");
        println!("cargo:warning=Copied lib/ directory to resources");
    } else {
        println!("cargo:warning=lib directory not found at {:?}", lib_dir);
    }

    // Tell Cargo to re-run if mole-src changes
    println!("cargo:rerun-if-changed=../mole-src/mole");
    println!("cargo:rerun-if-changed=../mole-src/bin");
    println!("cargo:rerun-if-changed=../mole-src/lib");
    println!("cargo:rerun-if-changed=../mole-src/cmd");

    tauri_build::build()
}

fn copy_dir_contents(src: &Path, dst: &Path) -> std::io::Result<()> {
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let target = dst.join(entry.file_name());

        if ty.is_dir() {
            fs::create_dir_all(&target)?;
            copy_dir_contents(&entry.path(), &target)?;
        } else if ty.is_symlink() {
            // For symlinks, copy the target file instead of preserving the link
            // This ensures the binary is bundled correctly in the app
            let link_target = fs::read_link(entry.path())?;
            let resolved = if link_target.is_absolute() {
                link_target.clone()
            } else {
                entry.path().parent().unwrap_or(src).join(&link_target)
            };
            if resolved.exists() {
                fs::copy(&resolved, target)?;
            } else {
                println!(
                    "cargo:warning=Broken symlink: {:?} -> {:?}",
                    entry.path(),
                    link_target
                );
            }
        } else {
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}
