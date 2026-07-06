import type { PartDefinition, PartType } from './types';

/**
 * 部品カタログ。
 * 「左パネルにどの部品を、どの教科フィルターで、どんな初期値で出すか」を一元管理する。
 * 部品の見た目（SVG）はここでは持たず、ui/parts側の描画コンポーネントが
 * `type` をキーに参照する（データと描画の分離）。
 *
 * 現段階（フェーズ1縦スライス）では代表的な部品のみを収録し、
 * 以降のフェーズで全カテゴリを拡充する。
 */
export const PART_DEFINITIONS: Record<PartType, PartDefinition> = {
  dcSource: {
    type: 'dcSource',
    label: '直流電源',
    category: '電源',
    subjects: ['electricCircuit', 'electronicCircuit', 'electricMachinery'],
    defaultProperties: { value: 12, unit: 'V' },
    pins: [
      { id: 'plus', x: 0, y: -20 },
      { id: 'minus', x: 0, y: 20 },
    ],
    size: { width: 40, height: 40 },
  },
  acSource: {
    type: 'acSource',
    label: '交流電源',
    category: '電源',
    subjects: ['electricCircuit', 'electricMachinery'],
    defaultProperties: { value: 100, unit: 'V' },
    pins: [
      { id: 'a', x: 0, y: -20 },
      { id: 'b', x: 0, y: 20 },
    ],
    size: { width: 40, height: 40 },
  },
  threePhaseSource: {
    type: 'threePhaseSource',
    label: '三相交流電源',
    category: '電源',
    subjects: ['electricMachinery'],
    defaultProperties: { value: 200, unit: 'V' },
    pins: [
      { id: 'u', x: -20, y: -20 },
      { id: 'v', x: 0, y: 20 },
      { id: 'w', x: 20, y: -20 },
    ],
    size: { width: 50, height: 50 },
  },
  battery: {
    type: 'battery',
    label: '電池',
    category: '電源',
    subjects: ['electricCircuit'],
    defaultProperties: { value: 1.5, unit: 'V' },
    pins: [
      { id: 'plus', x: 0, y: -15 },
      { id: 'minus', x: 0, y: 15 },
    ],
    size: { width: 30, height: 30 },
  },
  resistor: {
    type: 'resistor',
    label: '固定抵抗',
    category: '抵抗',
    subjects: ['electricCircuit', 'electronicCircuit'],
    defaultProperties: { value: 10, unit: 'Ω' },
    pins: [
      { id: 'left', x: -25, y: 0 },
      { id: 'right', x: 25, y: 0 },
    ],
    size: { width: 50, height: 20 },
  },
  variableResistor: {
    type: 'variableResistor',
    label: '可変抵抗',
    category: '抵抗',
    subjects: ['electricCircuit', 'electronicCircuit'],
    defaultProperties: { value: 100, unit: 'Ω' },
    pins: [
      { id: 'left', x: -25, y: 0 },
      { id: 'right', x: 25, y: 0 },
    ],
    size: { width: 50, height: 20 },
  },
  capacitor: {
    type: 'capacitor',
    label: 'コンデンサ',
    category: 'コンデンサ',
    subjects: ['electronicCircuit'],
    defaultProperties: { value: 100, unit: 'µF' },
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 20 },
  },
  variableCapacitor: {
    type: 'variableCapacitor',
    label: '可変コンデンサ',
    category: 'コンデンサ',
    subjects: ['electronicCircuit'],
    defaultProperties: { value: 50, unit: 'pF' },
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 20 },
  },
  coil: {
    type: 'coil',
    label: 'コイル',
    category: 'コイル',
    subjects: ['electricCircuit', 'electronicCircuit'],
    defaultProperties: { value: 10, unit: 'mH' },
    pins: [
      { id: 'left', x: -25, y: 0 },
      { id: 'right', x: 25, y: 0 },
    ],
    size: { width: 50, height: 20 },
  },
  variableCoil: {
    type: 'variableCoil',
    label: '可変コイル',
    category: 'コイル',
    subjects: ['electronicCircuit'],
    defaultProperties: { value: 10, unit: 'mH' },
    pins: [
      { id: 'left', x: -25, y: 0 },
      { id: 'right', x: 25, y: 0 },
    ],
    size: { width: 50, height: 20 },
  },
  switch: {
    type: 'switch',
    label: 'スイッチ',
    category: 'スイッチ',
    subjects: ['electricCircuit'],
    defaultProperties: {},
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 20 },
  },
  selectorSwitch: {
    type: 'selectorSwitch',
    label: '切換スイッチ',
    category: 'スイッチ',
    subjects: ['electricCircuit', 'electricMachinery'],
    defaultProperties: {},
    pins: [
      { id: 'common', x: -20, y: 0 },
      { id: 'a', x: 20, y: -15 },
      { id: 'b', x: 20, y: 15 },
    ],
    size: { width: 40, height: 30 },
  },
  diode: {
    type: 'diode',
    label: 'ダイオード',
    category: '半導体',
    subjects: ['electronicCircuit'],
    defaultProperties: {},
    pins: [
      { id: 'anode', x: -20, y: 0 },
      { id: 'cathode', x: 20, y: 0 },
    ],
    size: { width: 40, height: 20 },
  },
  led: {
    type: 'led',
    label: 'LED',
    category: '半導体',
    subjects: ['electronicCircuit'],
    defaultProperties: {},
    pins: [
      { id: 'anode', x: -20, y: 0 },
      { id: 'cathode', x: 20, y: 0 },
    ],
    size: { width: 40, height: 20 },
  },
  bridgeDiode: {
    type: 'bridgeDiode',
    label: 'ブリッジダイオード',
    category: '半導体',
    subjects: ['electronicCircuit'],
    defaultProperties: {},
    pins: [
      { id: 'ac1', x: -25, y: 0 },
      { id: 'ac2', x: 25, y: 0 },
      { id: 'plus', x: 0, y: 25 },
      { id: 'minus', x: 0, y: -25 },
    ],
    size: { width: 60, height: 60 },
  },
  transistorNpn: {
    type: 'transistorNpn',
    label: 'NPNトランジスタ',
    category: 'トランジスタ',
    subjects: ['electronicCircuit'],
    defaultProperties: {},
    pins: [
      { id: 'base', x: -20, y: 0 },
      { id: 'collector', x: 15, y: -20 },
      { id: 'emitter', x: 15, y: 20 },
    ],
    size: { width: 40, height: 40 },
  },
  transistorPnp: {
    type: 'transistorPnp',
    label: 'PNPトランジスタ',
    category: 'トランジスタ',
    subjects: ['electronicCircuit'],
    defaultProperties: {},
    pins: [
      { id: 'base', x: -20, y: 0 },
      { id: 'collector', x: 15, y: -20 },
      { id: 'emitter', x: 15, y: 20 },
    ],
    size: { width: 40, height: 40 },
  },
  fet: {
    type: 'fet',
    label: 'FET',
    category: 'トランジスタ',
    subjects: ['electronicCircuit'],
    defaultProperties: {},
    pins: [
      { id: 'gate', x: -20, y: 0 },
      { id: 'drain', x: 15, y: -20 },
      { id: 'source', x: 15, y: 20 },
    ],
    size: { width: 40, height: 40 },
  },
  relayCoil: {
    type: 'relayCoil',
    label: 'リレーコイル',
    category: 'リレー',
    subjects: ['electricMachinery'],
    defaultProperties: {},
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 30 },
  },
  contactA: {
    type: 'contactA',
    label: 'a接点',
    category: 'リレー',
    subjects: ['electricMachinery'],
    defaultProperties: {},
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 20 },
  },
  contactB: {
    type: 'contactB',
    label: 'b接点',
    category: 'リレー',
    subjects: ['electricMachinery'],
    defaultProperties: {},
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 20 },
  },
  contactC: {
    type: 'contactC',
    label: 'c接点',
    category: 'リレー',
    subjects: ['electricMachinery'],
    defaultProperties: {},
    pins: [
      { id: 'common', x: -20, y: 0 },
      { id: 'a', x: 20, y: -15 },
      { id: 'b', x: 20, y: 15 },
    ],
    size: { width: 40, height: 30 },
  },
  ammeter: {
    type: 'ammeter',
    label: '電流計',
    category: '計器',
    subjects: ['electricCircuit', 'electricMachinery'],
    defaultProperties: { unit: 'A' },
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 40 },
  },
  voltmeter: {
    type: 'voltmeter',
    label: '電圧計',
    category: '計器',
    subjects: ['electricCircuit', 'electricMachinery'],
    defaultProperties: { unit: 'V' },
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 40 },
  },
  wattmeter: {
    type: 'wattmeter',
    label: '電力計',
    category: '計器',
    subjects: ['electricMachinery'],
    defaultProperties: { unit: 'W' },
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 40 },
  },
  motor: {
    type: 'motor',
    label: 'モータ',
    category: 'その他',
    subjects: ['electricMachinery'],
    defaultProperties: {},
    pins: [
      { id: 'left', x: -20, y: 0 },
      { id: 'right', x: 20, y: 0 },
    ],
    size: { width: 40, height: 40 },
  },
  ground: {
    type: 'ground',
    label: '接地',
    category: 'その他',
    subjects: [
      'electricCircuit',
      'electronicCircuit',
      'logicCircuit',
      'electricMachinery',
    ],
    defaultProperties: {},
    pins: [{ id: 'top', x: 0, y: -20 }],
    size: { width: 30, height: 20 },
  },
};

export function getPartDefinition(type: PartType): PartDefinition {
  return PART_DEFINITIONS[type];
}

export function listPartsBySubject(subject: Subject | 'all'): PartDefinition[] {
  const all = Object.values(PART_DEFINITIONS);
  if (subject === 'all') return all;
  return all.filter((p) => p.subjects.includes(subject));
}

type Subject = PartDefinition['subjects'][number];
