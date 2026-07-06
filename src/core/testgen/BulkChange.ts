import type { CircuitDocument, ComponentInstance } from '../model/types';
import { EditPropertyCommand } from '../commands/EditPropertyCommand';
import { CompositeCommand } from '../commands/CompositeCommand';
import { getRandomRange, randomValueInRange } from './RandomValueGenerator';

/**
 * 「一括数値変更」機能: 回路全体（または指定した部品群）の数値をまとめて変更する。
 * 倍率(factor)方式と固定値加算(offset)方式のどちらかを指定する。
 */
export function buildBulkValueChangeCommand(
  components: ComponentInstance[],
  mode: { kind: 'multiply'; factor: number } | { kind: 'add'; offset: number },
): CompositeCommand | null {
  const targets = components.filter((c) => typeof c.properties.value === 'number');
  if (targets.length === 0) return null;

  const commands = targets.map((c) => {
    const current = c.properties.value as number;
    const next =
      mode.kind === 'multiply'
        ? Math.round(current * mode.factor * 100) / 100
        : Math.round((current + mode.offset) * 100) / 100;
    return new EditPropertyCommand(c.id, { value: Math.max(0, next) });
  });

  return new CompositeCommand('数値を一括変更', commands);
}

/** 「ランダム数値生成」機能: 対応する部品すべてに、種別ごとの範囲でランダム値を割り当てる */
export function buildRandomizeCommand(components: ComponentInstance[]): CompositeCommand | null {
  const commands = components.flatMap((c) => {
    const range = getRandomRange(c.type);
    if (!range) return [];
    return [new EditPropertyCommand(c.id, { value: randomValueInRange(range), unit: range.unit })];
  });
  if (commands.length === 0) return null;
  return new CompositeCommand('数値をランダム生成', commands);
}

/** 「問題モード」一括切替: 数値を持つ全部品の hidden フラグをまとめて反転/設定する */
export function buildProblemModeCommand(
  components: ComponentInstance[],
  hidden: boolean,
): CompositeCommand | null {
  const targets = components.filter((c) => typeof c.properties.value === 'number');
  if (targets.length === 0) return null;
  const commands = targets.map((c) => new EditPropertyCommand(c.id, { hidden }));
  return new CompositeCommand(hidden ? '問題モードON（数値を□に）' : '問題モードOFF（数値を表示）', commands);
}

export function isCircuitInProblemMode(doc: CircuitDocument): boolean {
  const withValue = doc.components.filter((c) => typeof c.properties.value === 'number');
  if (withValue.length === 0) return false;
  return withValue.every((c) => !!c.properties.hidden);
}
