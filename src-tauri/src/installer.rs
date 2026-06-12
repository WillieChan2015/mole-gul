use serde::Serialize;
use std::fs;
use std::path::PathBuf;

const INSTALLER_EXTENSIONS: &[&str] = &["dmg", "pkg", "iso", "xip", "zip"];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallerFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub extension: String,
}

fn scan_dir(dir: &PathBuf) -> Vec<InstallerFile> {
    let mut results = Vec::new();
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return results,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !INSTALLER_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }
        let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        results.push(InstallerFile {
            name: path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string(),
            path: path.to_string_lossy().to_string(),
            size,
            extension: ext,
        });
    }
    results
}

#[tauri::command]
pub fn scan_installers() -> Result<Vec<InstallerFile>, String> {
    let home = std::env::var("HOME").map_err(|e| format!("cannot determine home: {}", e))?;
    let mut results = Vec::new();
    results.extend(scan_dir(&PathBuf::from(&home).join("Downloads")));
    results.extend(scan_dir(&PathBuf::from(&home).join("Documents")));
    results.sort_by(|a, b| b.size.cmp(&a.size));
    Ok(results)
}

#[tauri::command]
pub fn delete_installer(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Err(format!("file not found: {}", path));
    }
    // Try trash crate first, fall back to direct delete
    match trash::delete(&p) {
        Ok(_) => Ok(format!("moved to trash: {}", path)),
        Err(_) => {
            fs::remove_file(&p).map_err(|e| format!("failed to delete {}: {}", path, e))?;
            Ok(format!("deleted: {}", path))
        }
    }
}
