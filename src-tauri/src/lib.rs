mod tray;
mod stock;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 初始化系统托盘
            tray::create_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            stock::fetch_stock_price,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
