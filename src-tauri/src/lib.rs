// アプリ本体のエントリポイント。
// Rust側の役割は「OS連携の薄いラッパー」に限定し、
// 回路データの意味（部品・配線・数値など）には一切関与しない。
// ファイル保存/読込・ダイアログ表示は tauri-plugin-dialog / tauri-plugin-fs に委譲する。
//
// main.rsではなくここに実装を置くのはTauri v2の推奨構成のため。
// モバイル版を将来追加する場合も、この run() をそのまま共有できる。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
