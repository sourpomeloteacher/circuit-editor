import type { Command } from './Command';
import type { CircuitDocument, Wire } from '../model/types';
import { withWireAdded, withWireRemoved } from '../model/Circuit';

export class AddWireCommand implements Command {
  readonly label = '配線を追加';

  constructor(private readonly wire: Wire) {}

  execute(doc: CircuitDocument): CircuitDocument {
    return withWireAdded(doc, this.wire);
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return withWireRemoved(doc, this.wire.id);
  }
}

export class DeleteWireCommand implements Command {
  readonly label = '配線を削除';
  // 分岐(junction)接続していた配線も連鎖的に消えるため、削除された配線すべてを保持しておく。
  private removed: Wire[] = [];

  constructor(private readonly wireId: string) {}

  execute(doc: CircuitDocument): CircuitDocument {
    const before = doc.wires;
    const after = withWireRemoved(doc, this.wireId);
    const remainingIds = new Set(after.wires.map((w) => w.id));
    this.removed = before.filter((w) => !remainingIds.has(w.id));
    return after;
  }

  undo(doc: CircuitDocument): CircuitDocument {
    let restored = doc;
    for (const w of this.removed) restored = withWireAdded(restored, w);
    return restored;
  }
}
