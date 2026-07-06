/**
 * UI/Core層はこのインターフェースだけを見て「保存」「読込」「エクスポート」を行う。
 * 現在はTauriAdapterがこれを実装しているが、
 * 将来のWeb版では同じインターフェースを満たすWebAdapter
 * （<a download>やFile System Access APIを使う実装）に差し替えるだけでよい。
 */
export interface PlatformAdapter {
  /** 回路図JSONを保存する。ユーザーにファイル名/場所を選ばせるダイアログを開く。 */
  saveJson(json: string, suggestedName: string): Promise<void>;
  /** 回路図JSONを読み込む。ファイル選択ダイアログを開く。 */
  openJson(): Promise<string | null>;
  /** PNG画像（Base64 dataURL）をファイルに保存する。 */
  savePng(dataUrl: string, suggestedName: string): Promise<void>;
  /** SVG文字列をファイルに保存する。 */
  saveSvg(svg: string, suggestedName: string): Promise<void>;
  /** PDFバイナリ（Uint8Array）をファイルに保存する。 */
  savePdf(bytes: Uint8Array, suggestedName: string): Promise<void>;
  /** 画像をクリップボードへコピーする。 */
  copyImageToClipboard(dataUrl: string): Promise<void>;
}
