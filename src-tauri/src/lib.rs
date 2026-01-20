use std::process::{Command};
use serde::Serialize;

#[derive(Serialize)]
struct SystemStats {
    cpu_model: String,
    cpu_boost: String,
    gpu_mode: String,
    power_profile: String,
}

#[derive(Serialize)]
struct BatteryStatus {
    capacity: u8,
    status: String,
}

#[tauri::command]
fn detect_stats() -> Result<SystemStats, String> {
    let cpu = Command::new("sh")
        .arg("-c")
        .arg(r#"grep -m1 "model name" /proc/cpuinfo | cut -d: -f2 | sed 's/^ //'"#)
        .output()
        .map_err(|e| e.to_string())?;
    
    let cpu_model = String::from_utf8_lossy(&cpu.stdout).trim().to_string();

    let boost = Command::new("sh")
        .arg("-c")
        .arg("cat /sys/devices/system/cpu/cpufreq/boost 2>/dev/null")
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or("unknown".into());

    let gpu_mode = Command::new("sh")
        .arg("-c")
        .arg("supergfxctl -g 2>/dev/null")
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or("unknown".into());

    let power_profile = Command::new("powerprofilesctl")
        .arg("get")
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or("unknown".into());

    Ok(SystemStats {
        cpu_model,
        cpu_boost: boost,
        gpu_mode,
        power_profile,
    })
}




#[tauri::command]
fn get_battery_status() -> Result<BatteryStatus, String> {
    let capacity = Command::new("sh")
        .arg("-c")
        .arg("cat /sys/class/power_supply/BAT0/capacity 2>/dev/null")
        .output()
        .map_err(|e| e.to_string())?;
    
    let status = Command::new("sh")
        .arg("-c")
        .arg("cat /sys/class/power_supply/BAT0/status 2>/dev/null")
        .output()
        .map_err(|e| e.to_string())?;
    
    let capacity_str = String::from_utf8_lossy(&capacity.stdout).trim().to_string();
    let capacity_num = capacity_str.parse::<u8>().unwrap_or(0);
    
    let status_str = String::from_utf8_lossy(&status.stdout).trim().to_string();
    
    Ok(BatteryStatus {
        capacity: capacity_num,
        status: status_str,
    })
}

#[tauri::command]
fn set_gpu_mode(mode: String) -> Result<(), String> {
    let status = Command::new("pkexec")
        .arg("supergfxctl")
        .arg("-m")
        .arg(&mode)
        .status()
        .map_err(|e| e.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err("Failed to set GPU mode".into())
    }
}


#[tauri::command]
fn set_profile(profile_name: String) -> Result<(), String> {
    let status = Command::new("pkexec")
        .arg("/usr/local/bin/powerctl-helper")
        .arg(&profile_name)
        .status()
        .map_err(|e| e.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err("Failed to apply profile".into())
    }
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![detect_stats, get_battery_status, set_gpu_mode,set_profile])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
