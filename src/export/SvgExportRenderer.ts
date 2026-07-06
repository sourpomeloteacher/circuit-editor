/**
 * 回路キャンバスのSVG DOM要素から、書き出し用途に応じたクリーンなSVGを作る。
 * DOM標準API（getBBox / XMLSerializer / Canvas / Image）のみに依存しているため、
 * Tauri（WebView）でも将来のブラウザ版でもそのまま動作する。
 */

const EXPORT_MARGIN = 24;

/** グリッド・選択枠・配線中のプレビューなど「編集用の見た目」を取り除いたクローンを作る */
function cloneForExport(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export-ignore="true"]').forEach((el) => el.remove());
  return clone;
}

/** 実際に描画されている部品群のバウンディングボックスに合わせてviewBoxを設定する */
function fitViewBoxToContent(original: SVGSVGElement, clone: SVGSVGElement): void {
  const contentGroup = original.querySelector('[data-export-content="true"]') as SVGGElement | null;
  let box = { x: 0, y: 0, width: 800, height: 600 };
  if (contentGroup) {
    const bbox = contentGroup.getBBox();
    box = {
      x: bbox.x - EXPORT_MARGIN,
      y: bbox.y - EXPORT_MARGIN,
      width: Math.max(1, bbox.width + EXPORT_MARGIN * 2),
      height: Math.max(1, bbox.height + EXPORT_MARGIN * 2),
    };
  }
  clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  clone.setAttribute('width', String(box.width));
  clone.setAttribute('height', String(box.height));

  // 背景を白で塗る（PNG/PDF化した際に透過→黒表示になる印刷トラブルを防ぐ）
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', String(box.x));
  bg.setAttribute('y', String(box.y));
  bg.setAttribute('width', String(box.width));
  bg.setAttribute('height', String(box.height));
  bg.setAttribute('fill', '#ffffff');
  clone.insertBefore(bg, clone.firstChild);
}

export function buildExportSvgString(svg: SVGSVGElement): string {
  const clone = cloneForExport(svg);
  fitViewBoxToContent(svg, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(clone);
}

/** SVG文字列をPNGのdataURLへラスタライズする（scale=2で高解像度出力、Word/PPT貼付け用） */
export function rasterizeSvgStringToPngDataUrl(svgString: string, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D contextの取得に失敗しました'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVGの画像化に失敗しました'));
    };
    img.src = url;
  });
}

export interface RasterResult {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

export function rasterizeSvgStringDetailed(svgString: string, scale = 2): Promise<RasterResult> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D contextの取得に失敗しました'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/png'), widthPx: canvas.width, heightPx: canvas.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVGの画像化に失敗しました'));
    };
    img.src = url;
  });
}
