import { Fragment, useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '@/store/useCircuitStore';
import { getPartDefinition } from '@/core/model/PartDefinitions';
import { projectPointOntoPath } from '@/core/model/geometry';
import { computeWirePath, resolveEndpointPosition } from '@/core/model/wireResolution';
import { PartSymbol } from './PartSymbol';
import type { ComponentInstance, PartType, Point, WireEndpoint } from '@/core/model/types';

const GRID_SIZE = 20;
const WIRE_COLOR = 'var(--wire-color, #2b2b2b)';

/** 座標をグリッドへスナップする（要件「グリッド表示」「スナップ」対応） */
function snap(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

interface Props {
  /** 左パネルで選択中の「これから配置する部品種別」。nullなら配置待ちなし。 */
  armedType: PartType | null;
  onPlaced: () => void;
}

export function CircuitCanvas({ armedType, onPlaced }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const doc = useCircuitStore((s) => s.doc);
  const selectedIds = useCircuitStore((s) => s.selectedIds);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const addComponent = useCircuitStore((s) => s.addComponent);
  const moveSelected = useCircuitStore((s) => s.moveSelected);
  const deleteSelected = useCircuitStore((s) => s.deleteSelected);
  const addWire = useCircuitStore((s) => s.addWire);
  const deleteWire = useCircuitStore((s) => s.deleteWire);
  const wireRoutingMode = useCircuitStore((s) => s.wireRoutingMode);
  const undo = useCircuitStore((s) => s.undo);
  const redo = useCircuitStore((s) => s.redo);
  const copySelection = useCircuitStore((s) => s.copySelection);
  const pasteClipboard = useCircuitStore((s) => s.pasteClipboard);

  // ドラッグ中は毎フレームstoreを更新せず、ローカルstateで見た目だけ追従させ、
  // pointerup時にまとめてCommandを1つ発行する（Undo履歴を汚さないため）。
  const [dragState, setDragState] = useState<{
    ids: string[];
    origins: Record<string, Point>;
    startPointer: Point;
    delta: Point;
  } | null>(null);

  // 配線中（起点ピンをクリック済み、終点ピンのクリック待ち）の状態。
  // draftPoints は自由配線でキャンバスをクリックして追加した折れ点。
  const [wireDraft, setWireDraft] = useState<WireEndpoint | null>(null);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  function toSvgPoint(clientX: number, clientY: number): Point {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  /** ドラッグ中なら追従中の座標を、それ以外は確定済みの座標を返す */
  function getEffectiveComponent(id: string): ComponentInstance | undefined {
    const c = doc.components.find((cc) => cc.id === id);
    if (!c) return undefined;
    if (dragState && dragState.ids.includes(id)) {
      const origin = dragState.origins[id];
      return { ...c, x: origin.x + dragState.delta.x, y: origin.y + dragState.delta.y };
    }
    return c;
  }

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    if (wireDraft) {
      if (wireRoutingMode === 'free') {
        // 自由配線中は、背景のクリックでそこに折れ点を追加して配線を継続する
        const p = toSvgPoint(e.clientX, e.clientY);
        setDraftPoints([...draftPoints, { x: snap(p.x), y: snap(p.y) }]);
        return;
      }
      setWireDraft(null);
      setDraftPoints([]);
      return;
    }
    if (armedType) {
      const p = toSvgPoint(e.clientX, e.clientY);
      addComponent(armedType, snap(p.x), snap(p.y));
      onPlaced();
      return;
    }
    selectComponent(null);
  }

  function handlePointerDownOnComponent(e: React.PointerEvent<SVGGElement>, id: string) {
    e.stopPropagation();
    if (wireDraft) return; // 配線中は部品ドラッグを無効化
    if (e.shiftKey) {
      selectComponent(id, { additive: true });
      return;
    }
    const isPartOfMultiSelection = selectedIds.includes(id) && selectedIds.length > 1;
    const group = isPartOfMultiSelection ? selectedIds : [id];
    if (!isPartOfMultiSelection) selectComponent(id);

    const origins: Record<string, Point> = {};
    for (const gid of group) {
      const gc = doc.components.find((c) => c.id === gid);
      if (gc) origins[gid] = { x: gc.x, y: gc.y };
    }
    const p = toSvgPoint(e.clientX, e.clientY);
    setDragState({ ids: group, origins, startPointer: p, delta: { x: 0, y: 0 } });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePinClick(e: React.MouseEvent, componentId: string, pinId: string) {
    e.stopPropagation();
    if (armedType) return; // 配置待ち中はピンクリックを無効化
    if (!wireDraft) {
      setWireDraft({ kind: 'pin', componentId, pinId });
      setDraftPoints([]);
      return;
    }
    if (wireDraft.kind === 'pin' && wireDraft.componentId === componentId) {
      setWireDraft(null); // 同一部品のピン同士はつながないのでキャンセル扱い
      setDraftPoints([]);
      return;
    }
    addWire(wireDraft, { kind: 'pin', componentId, pinId }, draftPoints);
    setWireDraft(null);
    setDraftPoints([]);
  }

  /**
   * 配線自体をクリックしたときの処理。
   * 配線待ち（wireDraft）でなければ従来どおりクリックで削除、
   * 配線待ち中ならその配線上のクリック位置に分岐(T字接続)を作って確定する。
   */
  function handleWireClick(e: React.MouseEvent, wireId: string, route: Point[]) {
    e.stopPropagation();
    if (armedType) return;
    if (!wireDraft) {
      deleteWire(wireId);
      return;
    }
    if (wireDraft.kind === 'junction' && wireDraft.wireId === wireId) {
      setWireDraft(null); // 同じ配線上での自己接続はキャンセル扱い
      setDraftPoints([]);
      return;
    }
    const p = toSvgPoint(e.clientX, e.clientY);
    const { t } = projectPointOntoPath(route, p);
    addWire(wireDraft, { kind: 'junction', wireId, t }, draftPoints);
    setWireDraft(null);
    setDraftPoints([]);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const p = toSvgPoint(e.clientX, e.clientY);
    if (dragState) {
      const rawDx = p.x - dragState.startPointer.x;
      const rawDy = p.y - dragState.startPointer.y;
      setDragState({ ...dragState, delta: { x: snap(rawDx), y: snap(rawDy) } });
    }
    if (wireDraft) {
      setMousePos(p);
    }
  }

  function handlePointerUp() {
    if (!dragState) return;
    const moves = dragState.ids.map((id) => {
      const origin = dragState.origins[id];
      return {
        id,
        from: origin,
        to: { x: origin.x + dragState.delta.x, y: origin.y + dragState.delta.y },
      };
    });
    moveSelected(moves);
    setDragState(null);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (wireDraft) {
          setWireDraft(null);
          setDraftPoints([]);
          return;
        }
        selectComponent(null);
        return;
      }
      if (isEditableTarget(document.activeElement)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelection();
        return;
      }
      if (meta && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wireDraft, undo, redo, copySelection, pasteClipboard, deleteSelected, selectComponent]);

  // 配線済みのピン(部品ID:ピンID)一覧。接続点表示の判定に使う。
  const connectedPinKeys = new Set<string>();
  for (const w of doc.wires) {
    if (w.from.kind === 'pin') connectedPinKeys.add(`${w.from.componentId}:${w.from.pinId}`);
    if (w.to.kind === 'pin') connectedPinKeys.add(`${w.to.componentId}:${w.to.pinId}`);
  }

  const draftFromPos = wireDraft ? resolveEndpointPosition(doc, wireDraft, getEffectiveComponent) : null;

  // 配線同士の分岐(junction)点。他の配線の途中に接続している端点を、現在の経路から解決して集める。
  const junctionDots: Point[] = [];
  for (const w of doc.wires) {
    for (const endpoint of [w.from, w.to]) {
      if (endpoint.kind === 'junction') {
        const p = resolveEndpointPosition(doc, endpoint, getEffectiveComponent);
        if (p) junctionDots.push(p);
      }
    }
  }

  return (
    <svg
      ref={svgRef}
      className="circuit-canvas"
      onClick={handleCanvasClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: armedType ? 'crosshair' : 'default' }}
    >
      <defs>
        <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
          <circle cx={0.5} cy={0.5} r={0.6} fill="#c9cfd6" />
        </pattern>
        <marker id="arrow" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#2b2b2b" />
        </marker>
      </defs>
      <rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" data-export-ignore="true" />

      <g data-export-content="true">
        {doc.wires.map((w) => {
          const route = computeWirePath(doc, w, getEffectiveComponent);
          if (!route) return null;
          const pointsAttr = route.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <g key={w.id}>
              <polyline
                points={pointsAttr}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                style={{ cursor: wireDraft ? 'crosshair' : 'pointer' }}
                onClick={(e) => handleWireClick(e, w.id, route)}
              />
              <polyline points={pointsAttr} fill="none" stroke={WIRE_COLOR} strokeWidth={2} pointerEvents="none" />
            </g>
          );
        })}

        {junctionDots.map((p, i) => (
          <circle key={`junction-${i}`} cx={p.x} cy={p.y} r={3.5} fill={WIRE_COLOR} pointerEvents="none" />
        ))}

        {doc.components.map((c) => {
          const pos = dragState && dragState.ids.includes(c.id)
            ? { x: dragState.origins[c.id].x + dragState.delta.x, y: dragState.origins[c.id].y + dragState.delta.y }
            : { x: c.x, y: c.y };
          const isSelected = selectedIds.includes(c.id);
          const def = getPartDefinition(c.type);
          // 部品の見た目上の半径（回転で幅/高さが入れ替わっても足りるよう大きい方を使う）。
          // ラベルは接続点・記号本体から離すため、これに余白を足した位置に置く（拡大縮小分も反映する）。
          const halfExtent = (Math.max(def.size.width, def.size.height) / 2) * c.scale;
          return (
            <Fragment key={c.id}>
              <g
                transform={`translate(${pos.x}, ${pos.y}) rotate(${c.rotation}) scale(${(c.flipped ? -1 : 1) * c.scale}, ${c.scale})`}
                onPointerDown={(e) => handlePointerDownOnComponent(e, c.id)}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: 'move' }}
              >
                {/* fill:noneの記号は中央クリックが素通りしてしまうため、当たり判定用の透明矩形を敷く */}
                <rect
                  x={-def.size.width / 2}
                  y={-def.size.height / 2}
                  width={def.size.width}
                  height={def.size.height}
                  fill="transparent"
                  data-export-ignore="true"
                />
                {isSelected && (
                  <rect
                    x={-28}
                    y={-22}
                    width={56}
                    height={44}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    transform={`scale(${c.flipped ? -1 : 1}, 1)`}
                    data-export-ignore="true"
                  />
                )}
                <PartSymbol type={c.type} />
                {def.pins.map((pin) => {
                  const connected = connectedPinKeys.has(`${c.id}:${pin.id}`);
                  return (
                    <circle
                      key={pin.id}
                      cx={pin.x}
                      cy={pin.y}
                      r={connected ? 3.5 : 3}
                      fill={connected ? WIRE_COLOR : '#ffffff'}
                      stroke={WIRE_COLOR}
                      strokeWidth={1}
                      opacity={connected ? 1 : 0.55}
                      data-export-ignore={connected ? undefined : 'true'}
                      style={{ cursor: 'crosshair' }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => handlePinClick(e, c.id, pin.id)}
                    />
                  );
                })}
              </g>
              {/* ラベルは部品の回転・反転の影響を受けない別グループにして、常に正立表示にする */}
              <g transform={`translate(${pos.x}, ${pos.y})`} pointerEvents="none">
                <ValueLabel
                  value={c.properties.value}
                  unit={c.properties.unit}
                  hidden={!!c.properties.hidden}
                  x={-(halfExtent + 8)}
                  y={-(halfExtent + 8)}
                />
                <PartNumberLabel
                  label={doc.labels.find((l) => l.targetId === c.id && l.kind === 'partNumber')}
                  x={-(halfExtent + 8)}
                  y={-(halfExtent + 20)}
                />
              </g>
            </Fragment>
          );
        })}
      </g>

      {wireDraft && draftFromPos && mousePos && (
        <>
          <polyline
            data-export-ignore="true"
            points={[draftFromPos, ...draftPoints, mousePos].map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            pointerEvents="none"
          />
          {draftPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#3b82f6" data-export-ignore="true" pointerEvents="none" />
          ))}
        </>
      )}

      {wireDraft && (
        <text x={12} y={20} fontSize={12} fill="#3b82f6" data-export-ignore="true">
          {wireRoutingMode === 'free'
            ? '配線中: 端子または他の配線をクリックで確定、背景クリックで折れ点を追加（Escでキャンセル）'
            : '配線中: 別の部品の端子または他の配線をクリックしてください（Escでキャンセル）'}
        </text>
      )}
    </svg>
  );
}

function ValueLabel({
  value,
  unit,
  hidden,
  x,
  y,
}: {
  value?: number;
  unit?: string;
  hidden: boolean;
  x: number;
  y: number;
}) {
  if (value === undefined) return null;
  const text = hidden ? '□' : `${value}${unit ?? ''}`;
  return (
    <text x={x} y={y} textAnchor="end" fontSize={12} fill="#1a1a1a">
      {text}
    </text>
  );
}

function PartNumberLabel({
  label,
  x,
  y,
}: {
  label?: { text: string; offset: { x: number; y: number }; visible: boolean };
  x: number;
  y: number;
}) {
  if (!label || !label.visible) return null;
  return (
    <text x={x} y={y} textAnchor="end" fontSize={12} fontWeight={600} fill="#1a1a1a">
      {label.text}
    </text>
  );
}
