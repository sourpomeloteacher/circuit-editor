import type { CircuitDocument } from '../model/types';
import { cloneCircuit, generateId } from '../model/Circuit';
import { getRandomRange, randomValueInRange } from './RandomValueGenerator';

/**
 * 同じ回路構造（部品配置・配線）を保ったまま、数値だけを変えた
 * 問題A/B/Cの3バリエーションを生成する。
 * 「変更するのは数値のみ」という要件どおり、部品・配線・ラベルはそのまま複製する。
 */
export function generateVariations(base: CircuitDocument, count = 3): CircuitDocument[] {
  const suffixes = ['A', 'B', 'C', 'D', 'E'].slice(0, count);
  return suffixes.map((suffix) => {
    const variant = cloneCircuit(base);
    variant.id = generateId('doc');
    variant.name = `${base.name}_問題${suffix}`;
    variant.components = variant.components.map((c) => {
      const range = getRandomRange(c.type);
      if (!range || typeof c.properties.value !== 'number') return c;
      return {
        ...c,
        properties: { ...c.properties, value: randomValueInRange(range), unit: range.unit },
      };
    });
    return variant;
  });
}
