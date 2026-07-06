import type { Command } from './Command';
import type { CircuitDocument, ComponentInstance, Wire, Label } from '../model/types';
import {
  withComponentAdded,
  withComponentRemoved,
  withWireAdded,
  withLabelUpserted,
} from '../model/Circuit';

/**
 * 削除時は「削除された部品本体」と「その部品にぶら下がっていた配線・ラベル」を
 * execute()の中でスナップショットとして保持し、undo()で完全に元へ戻す。
 */
export class DeleteComponentCommand implements Command {
  readonly label = '部品を削除';
  private removedComponent: ComponentInstance | undefined;
  private removedWires: Wire[] = [];
  private removedLabels: Label[] = [];

  constructor(private readonly componentId: string) {}

  execute(doc: CircuitDocument): CircuitDocument {
    this.removedComponent = doc.components.find((c) => c.id === this.componentId);
    this.removedLabels = doc.labels.filter((l) => l.targetId === this.componentId);
    const after = withComponentRemoved(doc, this.componentId);
    // 分岐(junction)接続していた配線も連鎖的に消えるため、削除された配線すべてを保持しておく。
    const remainingIds = new Set(after.wires.map((w) => w.id));
    this.removedWires = doc.wires.filter((w) => !remainingIds.has(w.id));
    return after;
  }

  undo(doc: CircuitDocument): CircuitDocument {
    let restored = doc;
    if (this.removedComponent) restored = withComponentAdded(restored, this.removedComponent);
    for (const w of this.removedWires) restored = withWireAdded(restored, w);
    for (const l of this.removedLabels) restored = withLabelUpserted(restored, l);
    return restored;
  }
}
