// Lottie Studio — Tauri backend
// Handles native file operations, OS integration, and desktop features

use tauri::Manager;

/// Custom Tauri commands for native OS operations
/// These are called from the React frontend via @tauri-apps/api

#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_path::init())
        .setup(|app| {
            // Set up app data directory
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_version,
            get_platform,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lottie Studio");
}
