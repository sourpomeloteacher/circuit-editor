import type { Command } from './Command';
import type { CircuitDocument, Point, WireRouting } from '../model/types';

/**
 * 手動で折れ点を指定した配線（テンプレート由来・自由配線での分岐など）を、
 * 90°自動配線（現在のピン位置から毎回組み立て直す方式）に戻すコマンド。
 *
 * 折れ点は絶対座標で固定されているため、その配線がつながる部品を移動/回転すると
 * 端子の位置だけがずれて配線が歪んで見える。これを防ぐため、部品移動/回転のたびに
 * 影響を受ける配線をこのコマンドでリセットし、以後は常に現在位置から自動配線させる。
 */
export class ResetWireRouteCommand implements Command {
  readonly label = '配線経路をリセット';
  private before: { points: Point[]; routing: WireRouting } | undefined;

  constructor(private readonly wireId: string) {}

  execute(doc: CircuitDocument): CircuitDocument {
    const wire = doc.wires.find((w) => w.id === this.wireId);
    if (!wire) return doc;
    this.before = { points: wire.points, routing: wire.routing };
    return {
      ...doc,
      wires: doc.wires.map((w) => (w.id === this.wireId ? { ...w, points: [], routing: 'orthogonal' } : w)),
    };
  }

  undo(doc: CircuitDocument): CircuitDocument {
    if (!this.before) return doc;
    const before = this.before;
    return {
      ...doc,
      wires: doc.wires.map((w) => (w.id === this.wireId ? { ...w, points: before.points, routing: before.routing } : w)),
    };
  }
}
