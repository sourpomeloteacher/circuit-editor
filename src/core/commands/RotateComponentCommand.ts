import type { Command } from './Command';
import type { CircuitDocument, Rotation } from '../model/types';
import { withComponentUpdated } from '../model/Circuit';

const NEXT: Record<Rotation, Rotation> = { 0: 90, 90: 180, 180: 270, 270: 0 };
const PREV: Record<Rotation, Rotation> = { 0: 270, 90: 0, 180: 90, 270: 180 };

export class RotateComponentCommand implements Command {
  readonly label = '90°回転';

  constructor(
    private readonly componentId: string,
    private readonly from: Rotation,
  ) {}

  execute(doc: CircuitDocument): CircuitDocument {
    return withComponentUpdated(doc, this.componentId, { rotation: NEXT[this.from] });
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return withComponentUpdated(doc, this.componentId, { rotation: this.from });
  }
}

export class FlipComponentCommand implements Command {
  readonly label = '左右反転';

  constructor(private readonly componentId: string, private readonly from: boolean) {}

  execute(doc: CircuitDocument): CircuitDocument {
    return withComponentUpdated(doc, this.componentId, { flipped: !this.from });
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return withComponentUpdated(doc, this.componentId, { flipped: this.from });
  }
}

// PREVは将来「反対回転ショートカット」等を追加する際に使用予定のため保持
export { PREV as ROTATION_PREV_TABLE };
