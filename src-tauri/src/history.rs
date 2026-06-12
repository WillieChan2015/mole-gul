use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct HistoryActions {
    pub removed: u64,
    pub trashed: u64,
    pub skipped: u64,
    pub failed: u64,
    pub rebuilt: u64,
    pub other: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct HistorySession {
    pub command: String,
    pub started_at: String,
    pub ended_at: String,
    pub items: u64,
    pub size: String,
    pub operation_count: u64,
    pub actions: HistoryActions,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryLogs {
    pub operations: String,
    pub deletions: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryResponse {
    pub logs: HistoryLogs,
    pub limit: u64,
    pub sessions: Vec<HistorySession>,
    pub deletions: Vec<serde_json::Value>,
}

#[tauri::command]
pub fn history_list(app_handle: tauri::AppHandle) -> Result<HistoryResponse, String> {
    let mole_path = super::mole::find_mole_path(Some(&app_handle))?;
    let (code, stdout, stderr) = super::mole::run_mole(&mole_path, "history", &["--json"], &[])
        .map_err(|e| format!("mole history --json failed: {}", e))?;
    if code != 0 {
        return Err(format!(
            "mole history --json exited with {}\n{}",
            code, stderr
        ));
    }
    serde_json::from_str(&stdout).map_err(|e| format!("failed to parse history: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn history_response_serializes_with_camel_case() {
        let resp = HistoryResponse {
            logs: HistoryLogs {
                operations: "/path/ops.log".to_string(),
                deletions: "/path/del.log".to_string(),
            },
            limit: 10,
            sessions: vec![],
            deletions: vec![],
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["logs"]["operations"], "/path/ops.log");
        assert_eq!(json["logs"]["deletions"], "/path/del.log");
        assert_eq!(json["limit"], 10);
        assert!(json["sessions"].as_array().unwrap().is_empty());
    }

    #[test]
    fn history_session_serializes_with_underscore() {
        let session = HistorySession {
            command: "clean".to_string(),
            started_at: "2024-01-01T00:00:00Z".to_string(),
            ended_at: "2024-01-01T00:01:00Z".to_string(),
            items: 42,
            size: "1.2GB".to_string(),
            operation_count: 100,
            actions: HistoryActions {
                removed: 50,
                trashed: 30,
                skipped: 10,
                failed: 5,
                rebuilt: 3,
                other: 2,
            },
        };
        let json = serde_json::to_value(&session).unwrap();
        assert_eq!(json["started_at"], "2024-01-01T00:00:00Z");
        assert_eq!(json["ended_at"], "2024-01-01T00:01:00Z");
        assert_eq!(json["operation_count"], 100);
        assert_eq!(json["actions"]["removed"], 50);
    }

    #[test]
    fn history_response_deserializes_from_json() {
        let json = r#"{
            "logs": {"operations": "/ops.log", "deletions": "/del.log"},
            "limit": 5,
            "sessions": [{
                "command": "clean",
                "started_at": "2024-01-01T00:00:00Z",
                "ended_at": "2024-01-01T00:01:00Z",
                "items": 10,
                "size": "500MB",
                "operation_count": 20,
                "actions": {"removed": 5, "trashed": 3, "skipped": 1, "failed": 0, "rebuilt": 1, "other": 0}
            }],
            "deletions": []
        }"#;
        let resp: HistoryResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.limit, 5);
        assert_eq!(resp.sessions.len(), 1);
        assert_eq!(resp.sessions[0].command, "clean");
        assert_eq!(resp.sessions[0].started_at, "2024-01-01T00:00:00Z");
        assert_eq!(resp.sessions[0].actions.removed, 5);
    }
}
