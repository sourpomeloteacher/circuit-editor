/**
 * Core層の型定義。
 * このファイルはUIやTauriに一切依存しない「純粋なデータ構造」のみを扱う。
 * 将来Web版へ移植する際、このファイルは無変更で流用できる。
 */

/** 対応する部品種別。カテゴリごとに追加していく想定。 */
export type PartType =
  // 電源
  | 'dcSource'
  | 'acSource'
  | 'threePhaseSource'
  | 'battery'
  // 抵抗
  | 'resistor'
  | 'variableResistor'
  // コンデンサ
  | 'capacitor'
  | 'variableCapacitor'
  // コイル
  | 'coil'
  | 'variableCoil'
  // スイッチ
  | 'switch'
  | 'selectorSwitch'
  // 半導体
  | 'diode'
  | 'led'
  | 'bridgeDiode'
  | 'transistorNpn'
  | 'transistorPnp'
  | 'fet'
  // リレー
  | 'relayCoil'
  | 'contactA'
  | 'contactB'
  | 'contactC'
  // 計器
  | 'ammeter'
  | 'voltmeter'
  | 'wattmeter'
  // その他
  | 'motor'
  | 'ground';

/** 教科フィルターのカテゴリ */
export type Subject =
  | 'electricCircuit' // 電気回路
  | 'electronicCircuit' // 電子回路
  | 'logicCircuit' // 論理回路
  | 'electricMachinery'; // 電気機器

export type Rotation = 0 | 90 | 180 | 270;

export interface Point {
  x: number;
  y: number;
}

/** 部品の可変プロパティ。種別によって使うキーが異なる緩いマップにしている。 */
export interface ComponentProperties {
  /** 数値（抵抗値・電圧・容量など） */
  value?: number;
  /** 単位表示（Ω, V, F, H 等） */
  unit?: string;
  /** trueの場合、テスト作成支援の「問題モード」で数値を□表示にする */
  hidden?: boolean;
  /** その他部品固有の拡張値 */
  [key: string]: unknown;
}

export interface ComponentInstance {
  id: string;
  type: PartType;
  x: number;
  y: number;
  rotation: Rotation;
  flipped: boolean;
  /** 表示倍率（1 = 等倍）。未指定の古い保存ファイルは 1 として扱う。 */
  scale: number;
  properties: ComponentProperties;
}

export type WireRouting = 'free' | 'orthogonal';

/** 部品の端子に接続する端点（通常のケース） */
export interface PinEndpoint {
  kind: 'pin';
  componentId: string;
  pinId: string;
}

/**
 * 別の配線の途中に接続する端点（配線同士のT字接続・分岐用）。
 * 絶対座標ではなく「対象配線の現在の経路に対する割合(0〜1)」で持つ。
 * こうすることで、対象配線が部品移動で再ルーティングされても分岐点が自動的に追従する。
 */
export interface JunctionEndpoint {
  kind: 'junction';
  wireId: string;
  t: number;
}

export type WireEndpoint = PinEndpoint | JunctionEndpoint;

export interface Wire {
  id: string;
  points: Point[];
  from: WireEndpoint;
  to: WireEndpoint;
  routing: WireRouting;
}

export type LabelKind =
  | 'partNumber'
  | 'value'
  | 'unit'
  | 'currentArrow'
  | 'voltagePolarity';

export interface Label {
  id: string;
  targetId: string;
  kind: LabelKind;
  text: string;
  offset: Point;
  visible: boolean;
}

export interface CircuitMetadata {
  createdAt: string;
  updatedAt: string;
  subject: Subject;
}

export interface CircuitDocument {
  schemaVersion: string;
  id: string;
  name: string;
  components: ComponentInstance[];
  wires: Wire[];
  labels: Label[];
  metadata: CircuitMetadata;
}

/** 部品の接続ピン定義（部品カタログ用） */
export interface PinDefinition {
  id: string;
  /** 部品ローカル座標系での位置（回転前基準） */
  x: number;
  y: number;
}

/** 部品カタログのエントリ（種類ごとの静的な定義） */
export interface PartDefinition {
  type: PartType;
  /** 左パネル/教科フィルターでの表示名 */
  label: string;
  /** カテゴリ（左パネルのグルーピング用） */
  category: string;
  /** どの教科フィルターに出すか */
  subjects: Subject[];
  /** 配置直後のデフォルトプロパティ */
  defaultProperties: ComponentProperties;
  /** 接続ピン */
  pins: PinDefinition[];
  /** 部品の見た目上の基準サイズ（幅・高さ） */
  size: { width: number; height: number };
}
