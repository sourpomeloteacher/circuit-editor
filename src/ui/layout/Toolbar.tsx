import { useState } from 'react';
import { useCircuitStore } from '@/store/useCircuitStore';
import { buildExportSvgString, rasterizeSvgStringDetailed } from '@/export/SvgExportRenderer';
import { buildA4PdfFromPng } from '@/export/PdfExportRenderer';
import type { WireRouting } from '@/core/model/types';

function getCanvasSvg(): SVGSVGElement | null {
  return document.querySelector('.circuit-canvas');
}

export function Toolbar() {
  const newCircuit = useCircuitStore((s) => s.newCircuit);
  const saveToFile = useCircuitStore((s) => s.saveToFile);
  const loadFromFile = useCircuitStore((s) => s.loadFromFile);
  const undo = useCircuitStore((s) => s.undo);
  const redo = useCircuitStore((s) => s.redo);
  const canUndo = useCircuitStore((s) => s.canUndo);
  const canRedo = useCircuitStore((s) => s.canRedo);
  const docName = useCircuitStore((s) => s.doc.name);
  const wireRoutingMode = useCircuitStore((s) => s.wireRoutingMode);
  const setWireRoutingMode = useCircuitStore((s) => s.setWireRoutingMode);
  const copySelection = useCircuitStore((s) => s.copySelection);
  const pasteClipboard = useCircuitStore((s) => s.pasteClipboard);
  const savePngFile = useCircuitStore((s) => s.savePngFile);
  const saveSvgFile = useCircuitStore((s) => s.saveSvgFile);
  const savePdfFile = useCircuitStore((s) => s.savePdfFile);
  const copyImageToClipboard = useCircuitStore((s) => s.copyImageToClipboard);

  const [busy, setBusy] = useState<string | null>(null);

  async function handleSavePng() {
    const svg = getCanvasSvg();
    if (!svg) return;
    setBusy('png');
    try {
      const svgString = buildExportSvgString(svg);
      const { dataUrl } = await rasterizeSvgStringDetailed(svgString);
      await savePngFile(dataUrl, `${docName}.png`);
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveSvg() {
    const svg = getCanvasSvg();
    if (!svg) return;
    setBusy('svg');
    try {
      const svgString = buildExportSvgString(svg);
      await saveSvgFile(svgString, `${docName}.svg`);
    } finally {
      setBusy(null);
    }
  }

  async function handleSavePdf() {
    const svg = getCanvasSvg();
    if (!svg) return;
    setBusy('pdf');
    try {
      const svgString = buildExportSvgString(svg);
      const { dataUrl, widthPx, heightPx } = await rasterizeSvgStringDetailed(svgString);
      const bytes = await buildA4PdfFromPng(dataUrl, widthPx, heightPx);
      await savePdfFile(bytes, `${docName}.pdf`);
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyImage() {
    const svg = getCanvasSvg();
    if (!svg) return;
    setBusy('copy-image');
    try {
      const svgString = buildExportSvgString(svg);
      const { dataUrl } = await rasterizeSvgStringDetailed(svgString);
      await copyImageToClipboard(dataUrl);
    } finally {
      setBusy(null);
    }
  }

  function handlePrint() {
    const svg = getCanvasSvg();
    if (!svg) {
      window.print();
      return;
    }
    // 印刷時だけ、実際に描かれている内容にviewBoxを合わせる
    // （画面用CSSのwidth:100%と組み合わさり、用紙幅いっぱいに縦横比を保って収まる）。
    const contentGroup = svg.querySelector('[data-export-content="true"]');
    const prevViewBox = svg.getAttribute('viewBox');
    if (contentGroup) {
      const margin = 24;
      const bbox = (contentGroup as SVGGraphicsElement).getBBox();
      const x = bbox.x - margin;
      const y = bbox.y - margin;
      const width = Math.max(1, bbox.width + margin * 2);
      const height = Math.max(1, bbox.height + margin * 2);
      svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    }
    const restore = () => {
      if (prevViewBox === null) svg.removeAttribute('viewBox');
      else svg.setAttribute('viewBox', prevViewBox);
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  return (
    <div className="toolbar">
      <span className="app-title">回路図エディタ</span>
      <div className="toolbar-buttons">
        <button type="button" onClick={newCircuit}>新規</button>
        <button type="button" onClick={() => void saveToFile()}>保存</button>
        <button type="button" onClick={() => void loadFromFile()}>読込</button>
        <span className="toolbar-divider" />
        <button type="button" onClick={undo} disabled={!canUndo}>Undo</button>
        <button type="button" onClick={redo} disabled={!canRedo}>Redo</button>
        <span className="toolbar-divider" />
        <button type="button" onClick={() => copySelection()} title="Ctrl+C">コピー</button>
        <button type="button" onClick={() => pasteClipboard()} title="Ctrl+V">貼り付け</button>
        <span className="toolbar-divider" />
        <label className="toolbar-select">
          配線
          <select
            value={wireRoutingMode}
            onChange={(e) => setWireRoutingMode(e.target.value as WireRouting)}
          >
            <option value="orthogonal">90°配線</option>
            <option value="free">自由配線</option>
          </select>
        </label>
        <span className="toolbar-divider" />
        <button type="button" onClick={() => void handleSavePng()} disabled={busy !== null}>
          PNG保存
        </button>
        <button type="button" onClick={() => void handleSaveSvg()} disabled={busy !== null}>
          SVG保存
        </button>
        <button type="button" onClick={() => void handleSavePdf()} disabled={busy !== null}>
          PDF保存
        </button>
        <button type="button" onClick={() => void handleCopyImage()} disabled={busy !== null} title="画像としてクリップボードへコピー">
          画像コピー
        </button>
        <button type="button" onClick={handlePrint}>印刷</button>
      </div>
      <span className="doc-name">{docName}</span>
    </div>
  );
}
