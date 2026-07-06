const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 12;

/**
 * ラスタライズ済みのPNG（dataURL）をA4用紙1ページに収めたPDFバイナリを作る。
 * 画像の縦横比に応じて縦向き/横向きを自動選択し、余白(MARGIN_MM)を確保して中央に配置する。
 * ベクターPDFではなくラスター画像の埋め込みだが、オフラインの軽量実装として割り切っている
 * （README記載の既知の制約）。
 *
 * jsPDFは同梱のhtml()機能経由でhtml2canvas/dompurifyまで巻き込むため、
 * 「軽量・起動が速い」要件を守るべく動的importでPDF保存時にのみ読み込む
 * （TauriAdapterのTauri API動的importと同じ方針）。
 */
export async function buildA4PdfFromPng(
  dataUrl: string,
  widthPx: number,
  heightPx: number,
): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const isLandscape = widthPx > heightPx;
  const pageWidth = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
  const pageHeight = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

  const availableWidth = pageWidth - MARGIN_MM * 2;
  const availableHeight = pageHeight - MARGIN_MM * 2;
  const imageAspect = widthPx / heightPx;
  const availableAspect = availableWidth / availableHeight;

  let drawWidth: number;
  let drawHeight: number;
  if (imageAspect > availableAspect) {
    drawWidth = availableWidth;
    drawHeight = availableWidth / imageAspect;
  } else {
    drawHeight = availableHeight;
    drawWidth = availableHeight * imageAspect;
  }

  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  doc.addImage(dataUrl, 'PNG', x, y, drawWidth, drawHeight);
  return new Uint8Array(doc.output('arraybuffer'));
}
