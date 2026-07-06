import type { Command } from './Command';
import type { CircuitDocument, ComponentInstance } from '../model/types';
import { withComponentAdded, withComponentRemoved } from '../model/Circuit';

export class AddComponentCommand implements Command {
  readonly label = '部品を配置';

  constructor(private readonly component: ComponentInstance) {}

  execute(doc: CircuitDocument): CircuitDocument {
    return withComponentAdded(doc, this.component);
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return withComponentRemoved(doc, this.component.id);
  }
}
