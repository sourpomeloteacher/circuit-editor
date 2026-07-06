import type { PlatformAdapter } from './PlatformAdapter';

/**
 * Tauri環境向けの実装。
 * @tauri-apps/plugin-dialog でネイティブの保存/読込ダイアログを開き、
 * @tauri-apps/plugin-fs でファイルの読み書きを行う。
 *
 * 注意: このファイルはTauri APIに依存する「唯一の場所」に限定している。
 * Core層・UI層からは import しない（PlatformAdapter経由でのみ利用する）。
 */
export class TauriAdapter implements PlatformAdapter {
  async saveJson(json: string, suggestedName: string): Promise<void> {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: '回路図ファイル', extensions: ['json'] }],
    });
    if (!path) return; // ユーザーがキャンセル
    await writeTextFile(path, json);
  }

  async openJson(): Promise<string | null> {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({
      multiple: false,
      filters: [{ name: '回路図ファイル', extensions: ['json'] }],
    });
    if (!path || Array.isArray(path)) return null;
    return readTextFile(path);
  }

  async savePng(dataUrl: string, suggestedName: string): Promise<void> {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: 'PNG画像', extensions: ['png'] }],
    });
    if (!path) return;
    const bytes = dataUrlToBytes(dataUrl);
    await writeFile(path, bytes);
  }

  async saveSvg(svg: string, suggestedName: string): Promise<void> {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: 'SVG画像', extensions: ['svg'] }],
    });
    if (!path) return;
    await writeTextFile(path, svg);
  }

  async savePdf(bytes: Uint8Array, suggestedName: string): Promise<void> {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: 'PDFファイル', extensions: ['pdf'] }],
    });
    if (!path) return;
    await writeFile(path, bytes);
  }

  async copyImageToClipboard(dataUrl: string): Promise<void> {
    // Tauri v2ではWebViewのClipboard APIがそのまま使えることが多いため、
    // まずブラウザ標準APIを試みる（失敗時は将来 tauri-plugin-clipboard-manager に差し替え）。
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
