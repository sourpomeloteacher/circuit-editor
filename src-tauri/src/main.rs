// バイナリの薄いエントリポイント。
// 実際の起動処理は circuit_editor_lib::run() (src/lib.rs) に委譲する。
// これはTauri v2の推奨構成であり、将来モバイル版を追加する際も
// lib.rs側のrun()をそのまま共有できるようにするための分離。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    circuit_editor_lib::run();
}
