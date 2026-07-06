import type { CircuitDocument, ComponentInstance, Label, PartType } from '../model/types';
import { generateId } from '../model/Circuit';

/**
 * 部品番号の接頭辞（教科書でよく使われる慣例に合わせている）。
 * 接地(ground)は通常番号を振らないため対象外。
 */
const PREFIX_MAP: Partial<Record<PartType, string>> = {
  resistor: 'R',
  variableResistor: 'R',
  capacitor: 'C',
  variableCapacitor: 'C',
  coil: 'L',
  variableCoil: 'L',
  dcSource: 'E',
  acSource: 'E',
  threePhaseSource: 'E',
  battery: 'E',
  switch: 'S',
  selectorSwitch: 'S',
  diode: 'D',
  led: 'D',
  bridgeDiode: 'D',
  transistorNpn: 'Tr',
  transistorPnp: 'Tr',
  fet: 'Tr',
  relayCoil: 'RY',
  contactA: 'RY',
  contactB: 'RY',
  contactC: 'RY',
  ammeter: 'A',
  voltmeter: 'V',
  wattmeter: 'W',
  motor: 'M',
};

const LABEL_OFFSET = { x: 0, y: -34 };

/**
 * 全部品を配置順に見て、種別ごとに連番を振り直す。
 * 既存ラベルの表示/非表示（visible）状態は維持し、番号のみ再計算する。
 * 戻り値は「新しいpartNumberラベルの配列」のみ（他種別のラベルはこの関数の対象外）。
 */
export function computeRenumberedLabels(doc: CircuitDocument): Label[] {
  const counters = new Map<string, number>();
  const existingByTarget = new Map(
    doc.labels.filter((l) => l.kind === 'partNumber').map((l) => [l.targetId, l]),
  );

  const result: Label[] = [];
  for (const component of doc.components) {
    const prefix = PREFIX_MAP[component.type];
    if (!prefix) continue; // 接地など番号不要の部品はスキップ
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);

    const existing = existingByTarget.get(component.id);
    result.push({
      id: existing?.id ?? generateId('label'),
      targetId: component.id,
      kind: 'partNumber',
      text: `${prefix}${next}`,
      offset: existing?.offset ?? LABEL_OFFSET,
      visible: existing?.visible ?? true,
    });
  }
  return result;
}

export function getPartNumberPrefix(type: PartType): string | undefined {
  return PREFIX_MAP[type];
}

export function componentNeedsNumber(component: ComponentInstance): boolean {
  return PREFIX_MAP[component.type] !== undefined;
}
