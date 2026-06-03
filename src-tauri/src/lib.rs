mod tray;
mod stock;
mod deepseek;

use std::sync::Mutex;
use stock::MonitorState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // 系统托盘
            tray::create_tray(app)?;

            // 启动股票盯盘后台轮询
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                stock::start_monitor_loop(handle).await;
            });

            Ok(())
        })
        .manage(Mutex::new(MonitorState::default()))
        .invoke_handler(tauri::generate_handler![
            stock::fetch_stock_price,
            stock::add_stock_monitor,
            stock::remove_stock_monitor,
            stock::list_stock_monitors,
            deepseek::setup_deepseek_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
