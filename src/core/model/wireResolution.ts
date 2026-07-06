import type { CircuitDocument, ComponentInstance, Point, Wire, WireEndpoint } from './types';
import { getPartDefinition } from './PartDefinitions';
import {
  buildOrthogonalPath,
  type CardinalDirection,
  getPathDirectionAtT,
  getPinAbsolutePosition,
  getPinDirection,
  pointAtFraction,
} from './geometry';

const MAX_JUNCTION_DEPTH = 8;

/** 端子(pin)または他の配線上の点(junction)を、キャンバス上の絶対座標へ解決する */
export function resolveEndpointPosition(
  doc: CircuitDocument,
  endpoint: WireEndpoint,
  getComponent: (id: string) => ComponentInstance | undefined,
  depth = 0,
): Point | null {
  if (endpoint.kind === 'pin') {
    const component = getComponent(endpoint.componentId);
    if (!component) return null;
    const pin = getPartDefinition(component.type).pins.find((p) => p.id === endpoint.pinId);
    if (!pin) return null;
    return getPinAbsolutePosition(component, pin);
  }
  if (depth > MAX_JUNCTION_DEPTH) return null; // 循環参照からの保護
  const baseWire = doc.wires.find((w) => w.id === endpoint.wireId);
  if (!baseWire) return null;
  const path = computeWirePath(doc, baseWire, getComponent, depth + 1);
  if (!path) return null;
  return pointAtFraction(path, endpoint.t);
}

/** 端子の配線引き出し方向を求める（90°自動配線のL字/Z字判定に使う） */
function resolveEndpointDirection(
  doc: CircuitDocument,
  endpoint: WireEndpoint,
  getComponent: (id: string) => ComponentInstance | undefined,
  depth = 0,
): CardinalDirection {
  if (endpoint.kind === 'pin') {
    const component = getComponent(endpoint.componentId);
    const pin = component && getPartDefinition(component.type).pins.find((p) => p.id === endpoint.pinId);
    if (component && pin) return getPinDirection(component, pin);
    return { dx: 1, dy: 0 };
  }
  if (depth > MAX_JUNCTION_DEPTH) return { dx: 1, dy: 0 };
  const baseWire = doc.wires.find((w) => w.id === endpoint.wireId);
  if (!baseWire) return { dx: 1, dy: 0 };
  const path = computeWirePath(doc, baseWire, getComponent, depth + 1);
  if (!path) return { dx: 1, dy: 0 };
  return getPathDirectionAtT(path, endpoint.t);
}

/**
 * 配線1本の現在の描画経路（絶対座標の折れ線）を求める。
 * 自由配線は保存済みの折れ点をそのまま使い、90°配線は現在のピン位置から毎回組み立て直す。
 * 分岐(junction)端点は再帰的に「元の配線の現在の経路」から位置を求めるため、
 * 元の配線が部品移動で再ルーティングされても分岐点は自動的に追従する。
 */
export function computeWirePath(
  doc: CircuitDocument,
  wire: Wire,
  getComponent: (id: string) => ComponentInstance | undefined,
  depth = 0,
): Point[] | null {
  if (depth > MAX_JUNCTION_DEPTH) return null;
  const fromPos = resolveEndpointPosition(doc, wire.from, getComponent, depth);
  const toPos = resolveEndpointPosition(doc, wire.to, getComponent, depth);
  if (!fromPos || !toPos) return null;

  if (wire.routing === 'free') {
    return [fromPos, ...wire.points, toPos];
  }

  const fromDir = resolveEndpointDirection(doc, wire.from, getComponent, depth);
  const toDir = resolveEndpointDirection(doc, wire.to, getComponent, depth);
  return buildOrthogonalPath(fromPos, fromDir, toPos, toDir);
}
