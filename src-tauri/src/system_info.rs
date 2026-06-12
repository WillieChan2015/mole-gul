use serde::Serialize;
use sysinfo::{Disks, System};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub memory_total: u64,
    pub memory_used: u64,
    pub memory_percent: f32,
    pub disk_total: u64,
    pub disk_used: u64,
    pub disk_percent: f32,
    pub disk_free: u64,
}

pub fn collect() -> SystemInfo {
    let sys = System::new_all();

    // CPU info
    let cpu_brand = sys
        .cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_default();
    let cpu_cores = sys.cpus().len();
    let cpu_usage = sys.global_cpu_info().cpu_usage();

    // Memory info
    let memory_total = sys.total_memory();
    let memory_used = sys.used_memory();
    let memory_percent = if memory_total > 0 {
        (memory_used as f32 / memory_total as f32) * 100.0
    } else {
        0.0
    };

    // Disk info (use first available disk)
    let disks = Disks::new_with_refreshed_list();
    let disk = disks.first();
    let disk_total = disk.map(|d| d.total_space()).unwrap_or(0);
    let disk_available = disk.map(|d| d.available_space()).unwrap_or(0);
    let disk_used = disk_total - disk_available;
    let disk_percent = if disk_total > 0 {
        (disk_used as f32 / disk_total as f32) * 100.0
    } else {
        0.0
    };

    SystemInfo {
        cpu_usage,
        cpu_brand,
        cpu_cores,
        memory_total,
        memory_used,
        memory_percent,
        disk_total,
        disk_used,
        disk_percent,
        disk_free: disk_available,
    }
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn system_info_can_be_created() {
        let info = collect();
        // CPU cores must be > 0 on any real system
        assert!(info.cpu_cores > 0, "cpu_cores should be > 0");
    }

    #[test]
    fn cpu_usage_is_valid_percentage() {
        let info = collect();
        assert!(info.cpu_usage >= 0.0, "cpu_usage should be >= 0");
        assert!(info.cpu_usage <= 100.0, "cpu_usage should be <= 100");
    }

    #[test]
    fn memory_values_are_reasonable() {
        let info = collect();
        assert!(info.memory_total > 0, "memory_total should be > 0");
        assert!(
            info.memory_used <= info.memory_total,
            "memory_used should be <= memory_total"
        );
        assert!(
            info.memory_percent >= 0.0 && info.memory_percent <= 100.0,
            "memory_percent should be 0-100"
        );
    }

    #[test]
    fn disk_values_are_reasonable() {
        let info = collect();
        // disk_total can be 0 if no disks detected (unlikely but safe)
        if info.disk_total > 0 {
            assert!(
                info.disk_used <= info.disk_total,
                "disk_used should be <= disk_total"
            );
            assert!(
                info.disk_free <= info.disk_total,
                "disk_free should be <= disk_total"
            );
            assert!(
                info.disk_percent >= 0.0 && info.disk_percent <= 100.0,
                "disk_percent should be 0-100"
            );
        }
    }

    #[test]
    fn serializes_to_json() {
        let info = collect();
        let json = serde_json::to_value(&info).expect("should serialize to JSON");
        assert!(
            json.is_object(),
            "serialized output should be a JSON object"
        );
    }

    #[test]
    fn json_field_names_are_camel_case() {
        let info = collect();
        let json = serde_json::to_value(&info).unwrap();
        let obj = json.as_object().unwrap();

        assert!(obj.contains_key("cpuUsage"), "should have cpuUsage field");
        assert!(obj.contains_key("cpuBrand"), "should have cpuBrand field");
        assert!(obj.contains_key("cpuCores"), "should have cpuCores field");
        assert!(
            obj.contains_key("memoryTotal"),
            "should have memoryTotal field"
        );
        assert!(
            obj.contains_key("memoryUsed"),
            "should have memoryUsed field"
        );
        assert!(
            obj.contains_key("memoryPercent"),
            "should have memoryPercent field"
        );
        assert!(obj.contains_key("diskTotal"), "should have diskTotal field");
        assert!(obj.contains_key("diskUsed"), "should have diskUsed field");
        assert!(
            obj.contains_key("diskPercent"),
            "should have diskPercent field"
        );
        assert!(obj.contains_key("diskFree"), "should have diskFree field");
    }

    #[test]
    fn json_has_all_fields() {
        let info = collect();
        let json = serde_json::to_value(&info).unwrap();
        let obj = json.as_object().unwrap();
        assert_eq!(obj.len(), 10, "should have exactly 10 fields");
    }
}
