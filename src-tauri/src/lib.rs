mod analyze;
mod clean;
mod history;
mod installer;
mod mole;
mod optimize;
mod purge;
mod system_info;
mod uninstall;

use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Manager;

fn build_menu(app: &tauri::AppHandle, lang: &str) -> tauri::Result<()> {
    let (file_label, close_label, quit_label, edit_label, undo_label, redo_label, cut_label, copy_label, paste_label, select_all_label, view_label, fullscreen_label, window_label, minimize_label, zoom_label) = if lang == "zh" {
        ("文件", "关闭窗口", "退出", "编辑", "撤销", "重做", "剪切", "复制", "粘贴", "全选", "视图", "全屏", "窗口", "最小化", "缩放")
    } else {
        ("File", "Close Window", "Quit", "Edit", "Undo", "Redo", "Cut", "Copy", "Paste", "Select All", "View", "Full Screen", "Window", "Minimize", "Zoom")
    };

    let file_menu = SubmenuBuilder::new(app, file_label)
        .item(&MenuItemBuilder::new(close_label).id("close").accelerator("Cmd+W").build(app)?)
        .separator()
        .item(&MenuItemBuilder::new(quit_label).id("quit").accelerator("Cmd+Q").build(app)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, edit_label)
        .item(&MenuItemBuilder::new(undo_label).id("undo").accelerator("Cmd+Z").build(app)?)
        .item(&MenuItemBuilder::new(redo_label).id("redo").accelerator("Cmd+Shift+Z").build(app)?)
        .separator()
        .item(&MenuItemBuilder::new(cut_label).id("cut").accelerator("Cmd+X").build(app)?)
        .item(&MenuItemBuilder::new(copy_label).id("copy").accelerator("Cmd+C").build(app)?)
        .item(&MenuItemBuilder::new(paste_label).id("paste").accelerator("Cmd+V").build(app)?)
        .item(&MenuItemBuilder::new(select_all_label).id("select_all").accelerator("Cmd+A").build(app)?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, view_label)
        .item(&MenuItemBuilder::new(fullscreen_label).id("fullscreen").accelerator("Ctrl+Cmd+F").build(app)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, window_label)
        .item(&MenuItemBuilder::new(minimize_label).id("minimize").accelerator("Cmd+M").build(app)?)
        .item(&MenuItemBuilder::new(zoom_label).id("zoom").build(app)?)
        .build()?;

    let menu = MenuBuilder::new(app)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&window_menu)
        .build()?;

    app.set_menu(menu)?;
    Ok(())
}

#[tauri::command]
fn update_menu_lang(app: tauri::AppHandle, lang: String) -> Result<(), String> {
    build_menu(&app, &lang).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            system_info::get_system_info,
            clean::clean_scan,
            clean::clean_execute,
            clean::clean_list_scan,
            clean::clean_execute_selected,
            analyze::analyze_path,
            optimize::optimize_scan,
            optimize::optimize_execute,
            purge::purge_scan,
            purge::purge_execute,
            uninstall::uninstall_list,
            uninstall::uninstall_app,
            history::history_list,
            installer::scan_installers,
            installer::delete_installer,
            update_menu_lang,
        ])
        .setup(|app| {
            // 根据系统语言设置菜单
            let lang = std::env::var("LANG")
                .or_else(|_| std::env::var("LC_ALL"))
                .or_else(|_| std::env::var("LC_MESSAGES"))
                .unwrap_or_default();
            let lang = if lang.starts_with("zh") { "zh" } else { "en" };
            let app_handle = app.handle().clone();
            build_menu(&app_handle, lang)?;

            // 菜单事件处理
            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                if event.id() == "quit" {
                    app_handle.exit(0);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
