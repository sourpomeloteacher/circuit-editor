import type { ComponentInstance, PinDefinition, Point } from './types';

/**
 * 部品ローカル座標系のピン位置を、拡大縮小・回転・反転・配置座標を反映した
 * キャンバス上の絶対座標に変換する。
 *
 * SVG側は `translate(x,y) rotate(rotation) scale(flip?-1:1 * s, s)` の順で
 * transformを適用しているため、逆順（scale→rotate→translate）で計算する。
 */
export function getPinAbsolutePosition(
  component: Pick<ComponentInstance, 'x' | 'y' | 'rotation' | 'flipped' | 'scale'>,
  pin: PinDefinition,
): Point {
  const s = component.scale ?? 1;
  const scaled: Point = { x: (component.flipped ? -pin.x : pin.x) * s, y: pin.y * s };
  const rotated = rotatePoint(scaled, component.rotation);
  return { x: component.x + rotated.x, y: component.y + rotated.y };
}

function rotatePoint(p: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  };
}

/** 2点間のユークリッド距離 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 上下左右いずれかを指す単位方向（配線の引き出し方向） */
export interface CardinalDirection {
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
}

function roundToCardinal(x: number, y: number): CardinalDirection {
  if (Math.abs(x) >= Math.abs(y)) return { dx: x >= 0 ? 1 : -1, dy: 0 };
  return { dx: 0, dy: y >= 0 ? 1 : -1 };
}

/**
 * ピンが部品からどちら向きに突き出しているかを求める。
 * ピンのローカル座標（中心からの向き）に反転・回転を適用し、
 * 最も近い上下左右いずれかへ丸める（配線の引き出し方向として使うため）。
 */
export function getPinDirection(
  component: Pick<ComponentInstance, 'rotation' | 'flipped'>,
  pin: PinDefinition,
): CardinalDirection {
  const scaled: Point = { x: component.flipped ? -pin.x : pin.x, y: pin.y };
  const rotated = rotatePoint(scaled, component.rotation);
  return roundToCardinal(rotated.x, rotated.y);
}

/**
 * 「90°配線」用の経路を作る。ピンの引き出し方向(from/toそれぞれ)が
 * 水平か垂直かを見て、自然な向きに曲がるL字/Z字のルートを選ぶ。
 * すでに水平/垂直に揃っている場合はそのまま直線（余計な折れを作らない）。
 */
export function buildOrthogonalPath(
  from: Point,
  fromDir: CardinalDirection,
  to: Point,
  toDir: CardinalDirection,
): Point[] {
  if (from.x === to.x || from.y === to.y) return [from, to];

  const fromHorizontal = fromDir.dx !== 0;
  const toHorizontal = toDir.dx !== 0;

  if (fromHorizontal !== toHorizontal) {
    // 片方が水平・もう片方が垂直 -> 1回だけ曲がるL字
    const corner = fromHorizontal ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
    return [from, corner, to];
  }
  if (fromHorizontal) {
    // 両方水平（高さが違う）-> 中間で1回折り返すZ字
    const midX = (from.x + to.x) / 2;
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to];
  }
  // 両方垂直（左右位置が違う）-> 中間で1回折り返すZ字
  const midY = (from.y + to.y) / 2;
  return [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to];
}

/** 折れ線の全長 */
function pathLength(path: Point[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += distance(path[i - 1], path[i]);
  return total;
}

/** 折れ線 path 上を、全長に対する割合 t (0〜1) だけ進んだ位置の座標を返す */
export function pointAtFraction(path: Point[], t: number): Point {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1) return path[0];
  const total = pathLength(path);
  if (total === 0) return path[0];
  let remaining = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < path.length; i += 1) {
    const segLen = distance(path[i - 1], path[i]);
    if (remaining <= segLen || i === path.length - 1) {
      const segT = segLen === 0 ? 0 : remaining / segLen;
      return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * segT,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * segT,
      };
    }
    remaining -= segLen;
  }
  return path[path.length - 1];
}

/** 折れ線 path の中で、指定座標に最も近い点とその全長に対する割合 t を求める（配線への分岐点クリック用） */
export function projectPointOntoPath(path: Point[], point: Point): { point: Point; t: number } {
  if (path.length === 0) return { point, t: 0 };
  if (path.length === 1) return { point: path[0], t: 0 };
  const total = pathLength(path);
  let best: { point: Point; t: number; distSq: number } = {
    point: path[0],
    t: 0,
    distSq: Infinity,
  };
  let accumulated = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const segLen = distance(a, b);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const segT = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq));
    const candidate = { x: a.x + dx * segT, y: a.y + dy * segT };
    const distSq = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
    if (distSq < best.distSq) {
      const lengthAlong = accumulated + segT * segLen;
      best = { point: candidate, t: total === 0 ? 0 : lengthAlong / total, distSq };
    }
    accumulated += segLen;
  }
  return { point: best.point, t: best.t };
}

/** 折れ線 path 上の割合 t の地点が、水平区間・垂直区間のどちらにあるかを返す（配線分岐の引き出し方向用） */
export function getPathDirectionAtT(path: Point[], t: number): CardinalDirection {
  if (path.length < 2) return { dx: 1, dy: 0 };
  const total = pathLength(path);
  let remaining = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < path.length; i += 1) {
    const segLen = distance(path[i - 1], path[i]);
    if (remaining <= segLen || i === path.length - 1) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      return Math.abs(dx) >= Math.abs(dy) ? { dx: 1, dy: 0 } : { dx: 0, dy: 1 };
    }
    remaining -= segLen;
  }
  return { dx: 1, dy: 0 };
}

/** 部品の見た目上のバウンディングボックス（矩形選択用。回転は考慮しない簡易版） */
export function getComponentBounds(
  component: Pick<ComponentInstance, 'x' | 'y'>,
  size: { width: number; height: number },
): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: component.x - size.width / 2,
    minY: component.y - size.height / 2,
    maxX: component.x + size.width / 2,
    maxY: component.y + size.height / 2,
  };
}

export function rectsIntersect(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
