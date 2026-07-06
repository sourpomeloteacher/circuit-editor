import type { Command } from './Command';
import type { CircuitDocument } from '../model/types';
import { withComponentUpdated } from '../model/Circuit';

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;

/** 表示倍率を範囲内([MIN_SCALE, MAX_SCALE])に収める */
export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export class ScaleComponentCommand implements Command {
  readonly label = '拡大縮小';

  constructor(
    private readonly componentId: string,
    private readonly from: number,
    private readonly to: number,
  ) {}

  execute(doc: CircuitDocument): CircuitDocument {
    return withComponentUpdated(doc, this.componentId, { scale: this.to });
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return withComponentUpdated(doc, this.componentId, { scale: this.from });
  }
}
