import type {
  ComponentInstance,
  ComponentProperties,
  PartType,
  Point,
  Rotation,
  Subject,
  Wire,
} from '../model/types';
import { createComponentInstance, generateId } from '../model/Circuit';
import { getPartDefinition } from '../model/PartDefinitions';

/** テンプレート内部でのみ使う仮の部品キー（インスタンス化時に実IDへ変換する） */
interface TemplateComponent {
  key: string;
  type: PartType;
  x: number;
  y: number;
  rotation?: Rotation;
  flipped?: boolean;
  properties?: ComponentProperties;
}

interface TemplateWire {
  fromKey: string;
  fromPin: string;
  toKey: string;
  toPin: string;
  /**
   * 明示的な折れ点（自由配線として、from→points→toを直線で結ぶ）。
   * 90°自動ルーティングだと部品を跨いで不自然に交差する経路（電源へ戻る配線など）に使う。
   * 指定しない場合は90°自動配線（ピンの向きから素直なL字/Z字を選ぶ）に任せる。
   */
  points?: Point[];
}

export interface CircuitTemplate {
  id: string;
  name: string;
  subject: Subject;
  components: TemplateComponent[];
  wires: TemplateWire[];
}

const TOP_Y = 100;
const H_GAP = 110;
const SOURCE_X = 120;
const FIRST_PART_X = SOURCE_X + 140;

/** 電源種別ごとの正極/負極ピンID（部品カタログの定義と対応させる） */
function getSourcePins(sourceType: PartType): { pos: string; neg: string } {
  if (sourceType === 'acSource') return { pos: 'a', neg: 'b' };
  return { pos: 'plus', neg: 'minus' };
}

/** 2端子部品の左右ピンの半間隔（中心から見た水平方向のピン距離） */
function horizontalHalfSpan(type: PartType): number {
  return Math.abs(getPartDefinition(type).pins[0].x);
}

/** 電源など縦向き2端子部品の上下ピンの半間隔 */
function verticalHalfSpan(type: PartType): number {
  return Math.abs(getPartDefinition(type).pins[0].y);
}

/**
 * 直列/並列ヘルパーで部品をチェーンする際の「入り側/出り側」ピンID。
 * ほとんどの2端子部品は left/right だが、ダイオード系だけ anode/cathode なので
 * ここで吸収する（そうしないと存在しないピンIDを参照して配線が消える）。
 */
function chainPins(type: PartType): { entry: string; exit: string } {
  if (type === 'diode' || type === 'led') return { entry: 'anode', exit: 'cathode' };
  return { entry: 'left', exit: 'right' };
}

/**
 * 直列回路レイアウトを作る共通ヘルパー。
 * 電源を左辺（縦向き）に置き、部品を上辺に一直線に並べ、
 * 最後の部品から電源のマイナス端子へ右辺→下辺を通って戻る、
 * という「教科書どおりの長方形ループ」になるよう座標を計算する。
 */
function seriesLoop(
  id: string,
  name: string,
  subject: Subject,
  sourceType: PartType,
  parts: PartType[],
): CircuitTemplate {
  const { pos, neg } = getSourcePins(sourceType);
  const sourceHalf = verticalHalfSpan(sourceType);
  const sourceY = TOP_Y + sourceHalf;
  const bottomY = TOP_Y + sourceHalf * 2;

  const components: TemplateComponent[] = [{ key: 'src', type: sourceType, x: SOURCE_X, y: sourceY }];
  parts.forEach((type, i) => {
    components.push({ key: `p${i}`, type, x: FIRST_PART_X + i * H_GAP, y: TOP_Y });
  });

  const wires: TemplateWire[] = [];
  let prevKey = 'src';
  let prevPin = pos;
  parts.forEach((type, i) => {
    wires.push({ fromKey: prevKey, fromPin: prevPin, toKey: `p${i}`, toPin: chainPins(type).entry });
    prevKey = `p${i}`;
    prevPin = chainPins(type).exit;
  });

  const lastX = FIRST_PART_X + (parts.length - 1) * H_GAP;
  const lastHalf = horizontalHalfSpan(parts[parts.length - 1]);
  const returnStubX = lastX + lastHalf + 20;
  wires.push({
    fromKey: prevKey,
    fromPin: prevPin,
    toKey: 'src',
    toPin: neg,
    points: [
      { x: returnStubX, y: TOP_Y },
      { x: returnStubX, y: bottomY },
    ],
  });

  return { id, name, subject, components, wires };
}

/**
 * 並列回路レイアウトを作る共通ヘルパー。
 * 電源を左辺（縦向き）に置き、部品は90°回転させて縦向きの並列枝にし、
 * 上辺・下辺の2本のレールでつなぐ（教科書の「梯子形」並列回路）。
 * partsは同一種別を想定（枝の縦幅を揃えるため）。
 */
function parallelLoop(
  id: string,
  name: string,
  subject: Subject,
  sourceType: PartType,
  parts: PartType[],
): CircuitTemplate {
  const { pos, neg } = getSourcePins(sourceType);
  const sourceHalf = verticalHalfSpan(sourceType);
  const branchHalf = horizontalHalfSpan(parts[0]);
  const sourceY = TOP_Y + sourceHalf;
  const branchY = TOP_Y + branchHalf;
  const bottomY = TOP_Y + branchHalf * 2;
  const sourceMinusY = sourceY + sourceHalf;

  const components: TemplateComponent[] = [{ key: 'src', type: sourceType, x: SOURCE_X, y: sourceY }];
  parts.forEach((type, i) => {
    components.push({ key: `p${i}`, type, x: FIRST_PART_X + i * H_GAP, y: branchY, rotation: 90 });
  });

  const wires: TemplateWire[] = [];
  let prevTopKey = 'src';
  let prevTopPin = pos;
  let prevBottomKey = 'src';
  let prevBottomPin = neg;
  parts.forEach((type, i) => {
    const { entry, exit } = chainPins(type);
    wires.push({ fromKey: prevTopKey, fromPin: prevTopPin, toKey: `p${i}`, toPin: entry });
    const bottomWire: TemplateWire = {
      fromKey: prevBottomKey,
      fromPin: prevBottomPin,
      toKey: `p${i}`,
      toPin: exit,
    };
    if (i === 0 && sourceMinusY !== bottomY) {
      bottomWire.points = [{ x: SOURCE_X, y: bottomY }];
    }
    wires.push(bottomWire);
    prevTopKey = `p${i}`;
    prevTopPin = entry;
    prevBottomKey = `p${i}`;
    prevBottomPin = exit;
  });

  return { id, name, subject, components, wires };
}

export const CIRCUIT_TEMPLATES: CircuitTemplate[] = [
  // 1. オームの法則
  seriesLoop('ohmsLaw', 'オームの法則', 'electricCircuit', 'dcSource', ['resistor']),

  // 2. 直列回路
  seriesLoop('seriesCircuit', '直列回路', 'electricCircuit', 'dcSource', ['resistor', 'resistor']),

  // 3. 並列回路
  parallelLoop('parallelCircuit', '並列回路', 'electricCircuit', 'dcSource', ['resistor', 'resistor']),

  // 4. 直並列回路（R1に続けて、R2とR3の並列部分を右側に配置した長方形ループ）
  {
    id: 'seriesParallelCircuit',
    name: '直並列回路',
    subject: 'electricCircuit',
    components: [
      { key: 'src', type: 'dcSource', x: 120, y: 120 },
      { key: 'r1', type: 'resistor', x: 260, y: 100 },
      { key: 'r2', type: 'resistor', x: 380, y: 125, rotation: 90 },
      { key: 'r3', type: 'resistor', x: 460, y: 125, rotation: 90 },
    ],
    wires: [
      { fromKey: 'src', fromPin: 'plus', toKey: 'r1', toPin: 'left' },
      { fromKey: 'r1', fromPin: 'right', toKey: 'r2', toPin: 'left' },
      { fromKey: 'r2', fromPin: 'left', toKey: 'r3', toPin: 'left' },
      { fromKey: 'r2', fromPin: 'right', toKey: 'r3', toPin: 'right' },
      {
        fromKey: 'r3',
        fromPin: 'right',
        toKey: 'src',
        toPin: 'minus',
        points: [
          { x: 460, y: 170 },
          { x: 120, y: 170 },
        ],
      },
    ],
  },

  // 5. キルヒホッフの法則（2電源2ループの梯子形）
  {
    id: 'kirchhoff',
    name: 'キルヒホッフの法則',
    subject: 'electricCircuit',
    components: [
      { key: 'e1', type: 'dcSource', x: 120, y: 120 },
      { key: 'r1', type: 'resistor', x: 240, y: 100 },
      { key: 'r3', type: 'resistor', x: 340, y: 125, rotation: 90 },
      { key: 'r2', type: 'resistor', x: 440, y: 100 },
      { key: 'e2', type: 'dcSource', x: 560, y: 120 },
    ],
    wires: [
      { fromKey: 'e1', fromPin: 'plus', toKey: 'r1', toPin: 'left' },
      { fromKey: 'r1', fromPin: 'right', toKey: 'r3', toPin: 'left' },
      { fromKey: 'r3', fromPin: 'left', toKey: 'r2', toPin: 'left' },
      { fromKey: 'r2', fromPin: 'right', toKey: 'e2', toPin: 'plus' },
      { fromKey: 'e1', fromPin: 'minus', toKey: 'r3', toPin: 'right', points: [{ x: 120, y: 150 }] },
      { fromKey: 'r3', fromPin: 'right', toKey: 'e2', toPin: 'minus', points: [{ x: 560, y: 150 }] },
    ],
  },

  // 6. RL回路
  seriesLoop('rlCircuit', 'RL回路', 'electronicCircuit', 'acSource', ['resistor', 'coil']),

  // 7. RC回路
  seriesLoop('rcCircuit', 'RC回路', 'electronicCircuit', 'acSource', ['resistor', 'capacitor']),

  // 8. RLC回路
  seriesLoop('rlcCircuit', 'RLC回路', 'electronicCircuit', 'acSource', ['resistor', 'coil', 'capacitor']),

  // 9. 半波整流
  seriesLoop('halfWaveRectifier', '半波整流', 'electronicCircuit', 'acSource', ['diode', 'resistor']),

  // 10. 全波整流（ブリッジ＋平滑コンデンサ、出力側はコンデンサ・抵抗の並列）
  {
    id: 'fullWaveRectifier',
    name: '全波整流（平滑あり）',
    subject: 'electronicCircuit',
    components: [
      { key: 'ac', type: 'acSource', x: 120, y: 120 },
      { key: 'bd', type: 'bridgeDiode', x: 300, y: 100 },
      { key: 'c', type: 'capacitor', x: 440, y: 95, rotation: 90 },
      { key: 'r', type: 'resistor', x: 520, y: 100, rotation: 90 },
    ],
    wires: [
      { fromKey: 'ac', fromPin: 'a', toKey: 'bd', toPin: 'ac1' },
      {
        fromKey: 'bd',
        fromPin: 'ac2',
        toKey: 'ac',
        toPin: 'b',
        points: [
          { x: 345, y: 100 },
          { x: 345, y: 140 },
        ],
      },
      { fromKey: 'bd', fromPin: 'minus', toKey: 'c', toPin: 'left' },
      { fromKey: 'c', fromPin: 'left', toKey: 'r', toPin: 'left' },
      { fromKey: 'bd', fromPin: 'plus', toKey: 'c', toPin: 'right' },
      { fromKey: 'c', fromPin: 'right', toKey: 'r', toPin: 'right' },
    ],
  },

  // 11. ブリッジ整流（平滑なし）
  {
    id: 'bridgeRectifier',
    name: 'ブリッジ整流',
    subject: 'electronicCircuit',
    components: [
      { key: 'ac', type: 'acSource', x: 120, y: 120 },
      { key: 'bd', type: 'bridgeDiode', x: 300, y: 100 },
      { key: 'r', type: 'resistor', x: 440, y: 100, rotation: 90 },
    ],
    wires: [
      { fromKey: 'ac', fromPin: 'a', toKey: 'bd', toPin: 'ac1' },
      {
        fromKey: 'bd',
        fromPin: 'ac2',
        toKey: 'ac',
        toPin: 'b',
        points: [
          { x: 345, y: 100 },
          { x: 345, y: 140 },
        ],
      },
      { fromKey: 'bd', fromPin: 'minus', toKey: 'r', toPin: 'left' },
      { fromKey: 'bd', fromPin: 'plus', toKey: 'r', toPin: 'right' },
    ],
  },

  // 12. トランジスタ増幅回路（簡易・共通エミッタ）
  {
    id: 'transistorAmp',
    name: 'トランジスタ増幅回路',
    subject: 'electronicCircuit',
    components: [
      { key: 'vcc', type: 'dcSource', x: 300, y: 80 },
      { key: 'rb', type: 'resistor', x: 180, y: 160 },
      { key: 'rc', type: 'resistor', x: 380, y: 160 },
      { key: 'tr', type: 'transistorNpn', x: 300, y: 240 },
      { key: 'gnd', type: 'ground', x: 300, y: 320 },
    ],
    wires: [
      { fromKey: 'vcc', fromPin: 'plus', toKey: 'rb', toPin: 'left', points: [{ x: 155, y: 60 }] },
      { fromKey: 'vcc', fromPin: 'plus', toKey: 'rc', toPin: 'left', points: [{ x: 355, y: 60 }] },
      { fromKey: 'rb', fromPin: 'right', toKey: 'tr', toPin: 'base' },
      { fromKey: 'rc', fromPin: 'right', toKey: 'tr', toPin: 'collector' },
      { fromKey: 'tr', fromPin: 'emitter', toKey: 'gnd', toPin: 'top' },
      {
        fromKey: 'vcc',
        fromPin: 'minus',
        toKey: 'gnd',
        toPin: 'top',
        points: [
          { x: 420, y: 100 },
          { x: 420, y: 300 },
        ],
      },
    ],
  },

  // 13. 論理回路（スイッチ直列＝AND動作の学習用回路）
  seriesLoop('logicAndEquivalent', '論理回路（AND相当・直列スイッチ）', 'logicCircuit', 'battery', [
    'switch',
    'switch',
    'led',
  ]),

  // 14. 三相Y結線（スター結線。3つの巻線を縦に並べ、右側で中性点にまとめる）
  {
    id: 'threePhaseStar',
    name: '三相Y結線',
    subject: 'electricMachinery',
    components: [
      { key: 'src', type: 'threePhaseSource', x: 140, y: 160 },
      { key: 'ru', type: 'resistor', x: 320, y: 60 },
      { key: 'rv', type: 'resistor', x: 320, y: 180 },
      { key: 'rw', type: 'resistor', x: 320, y: 260 },
      { key: 'n', type: 'ground', x: 460, y: 180, rotation: 270 },
    ],
    wires: [
      { fromKey: 'src', fromPin: 'u', toKey: 'ru', toPin: 'left', points: [{ x: 120, y: 60 }] },
      { fromKey: 'src', fromPin: 'v', toKey: 'rv', toPin: 'left' },
      { fromKey: 'src', fromPin: 'w', toKey: 'rw', toPin: 'left', points: [{ x: 160, y: 260 }] },
      { fromKey: 'ru', fromPin: 'right', toKey: 'rv', toPin: 'right' },
      { fromKey: 'rv', fromPin: 'right', toKey: 'rw', toPin: 'right' },
      { fromKey: 'rv', fromPin: 'right', toKey: 'n', toPin: 'top' },
    ],
  },

  // 15. 三相Δ結線（デルタ結線。3つの巻線が三角形を作る）
  {
    id: 'threePhaseDelta',
    name: '三相Δ結線',
    subject: 'electricMachinery',
    components: [
      { key: 'src', type: 'threePhaseSource', x: 140, y: 160 },
      { key: 'r1', type: 'resistor', x: 320, y: 60 },
      { key: 'r2', type: 'resistor', x: 460, y: 160, rotation: 90 },
      { key: 'r3', type: 'resistor', x: 320, y: 260 },
    ],
    wires: [
      { fromKey: 'src', fromPin: 'u', toKey: 'r1', toPin: 'left', points: [{ x: 120, y: 60 }] },
      { fromKey: 'r1', fromPin: 'right', toKey: 'src', toPin: 'v', points: [{ x: 345, y: 180 }] },
      { fromKey: 'src', fromPin: 'v', toKey: 'r2', toPin: 'left', points: [{ x: 140, y: 135 }] },
      {
        fromKey: 'r2',
        fromPin: 'right',
        toKey: 'src',
        toPin: 'w',
        points: [
          { x: 460, y: 210 },
          { x: 160, y: 210 },
        ],
      },
      { fromKey: 'src', fromPin: 'w', toKey: 'r3', toPin: 'left', points: [{ x: 160, y: 260 }] },
      {
        fromKey: 'r3',
        fromPin: 'right',
        toKey: 'src',
        toPin: 'u',
        points: [
          { x: 345, y: 300 },
          { x: 120, y: 300 },
        ],
      },
    ],
  },
];

/** テンプレートを実際のComponentInstance/Wireへ変換する（実IDを新規発行） */
export function instantiateTemplate(
  template: CircuitTemplate,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): { components: ComponentInstance[]; wires: Wire[] } {
  const keyToId = new Map<string, string>();
  const components: ComponentInstance[] = template.components.map((tc) => {
    const instance = createComponentInstance(tc.type, tc.x + offset.x, tc.y + offset.y);
    instance.rotation = tc.rotation ?? 0;
    instance.flipped = tc.flipped ?? false;
    if (tc.properties) instance.properties = { ...instance.properties, ...tc.properties };
    keyToId.set(tc.key, instance.id);
    return instance;
  });

  const wires: Wire[] = template.wires.map((tw) => {
    const points = (tw.points ?? []).map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }));
    return {
      id: generateId('w'),
      points,
      from: { kind: 'pin', componentId: keyToId.get(tw.fromKey) as string, pinId: tw.fromPin },
      to: { kind: 'pin', componentId: keyToId.get(tw.toKey) as string, pinId: tw.toPin },
      routing: points.length > 0 ? 'free' : 'orthogonal',
    };
  });

  return { components, wires };
}
