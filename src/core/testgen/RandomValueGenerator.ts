import type { PartType } from '../model/types';

/** 部品種別ごとのランダム生成デフォルト範囲・きざみ幅・単位 */
export interface RandomRange {
  min: number;
  max: number;
  step: number;
  unit: string;
}

const DEFAULT_RANGES: Partial<Record<PartType, RandomRange>> = {
  resistor: { min: 10, max: 1000, step: 10, unit: 'Ω' },
  variableResistor: { min: 100, max: 1000, step: 100, unit: 'Ω' },
  capacitor: { min: 1, max: 470, step: 1, unit: 'µF' },
  variableCapacitor: { min: 10, max: 100, step: 10, unit: 'pF' },
  coil: { min: 1, max: 100, step: 1, unit: 'mH' },
  variableCoil: { min: 1, max: 100, step: 1, unit: 'mH' },
  dcSource: { min: 1, max: 24, step: 1, unit: 'V' },
  battery: { min: 1.5, max: 9, step: 1.5, unit: 'V' },
  acSource: { min: 100, max: 200, step: 10, unit: 'V' },
  threePhaseSource: { min: 200, max: 400, step: 20, unit: 'V' },
};

export function getRandomRange(type: PartType): RandomRange | undefined {
  return DEFAULT_RANGES[type];
}

export function hasRandomRange(type: PartType): boolean {
  return DEFAULT_RANGES[type] !== undefined;
}

/** 範囲内でstep刻みのランダムな数値を1つ生成する */
export function randomValueInRange(range: RandomRange): number {
  const steps = Math.floor((range.max - range.min) / range.step);
  const picked = Math.floor(Math.random() * (steps + 1));
  const value = range.min + picked * range.step;
  // 小数第2位までに丸める（電池電圧などstepが小数の場合の誤差対策）
  return Math.round(value * 100) / 100;
}
