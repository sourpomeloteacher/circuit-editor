import type { Command } from './Command';
import type { CircuitDocument, Point } from '../model/types';
import { withComponentUpdated } from '../model/Circuit';

export class MoveComponentCommand implements Command {
  readonly label = '部品を移動';

  constructor(
    private readonly componentId: string,
    private readonly from: Point,
    private readonly to: Point,
  ) {}

  execute(doc: CircuitDocument): CircuitDocument {
    return withComponentUpdated(doc, this.componentId, { x: this.to.x, y: this.to.y });
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return withComponentUpdated(doc, this.componentId, { x: this.from.x, y: this.from.y });
  }
}
