import type { Command } from './Command';
import type { CircuitDocument, ComponentProperties } from '../model/types';
import { withComponentPropertyUpdated } from '../model/Circuit';

/**
 * 数値・単位・非表示フラグ(問題モード)など、properties配下の変更をすべて扱う汎用コマンド。
 * 「一括数値変更」「ランダム数値生成」もこのコマンドを複数まとめて発行することで実現する。
 */
export class EditPropertyCommand implements Command {
  readonly label = 'プロパティを変更';
  private before: ComponentProperties | undefined;

  constructor(
    private readonly componentId: string,
    private readonly patch: Record<string, unknown>,
  ) {}

  execute(doc: CircuitDocument): CircuitDocument {
    const target = doc.components.find((c) => c.id === this.componentId);
    this.before = target ? { ...target.properties } : undefined;
    return withComponentPropertyUpdated(doc, this.componentId, this.patch);
  }

  undo(doc: CircuitDocument): CircuitDocument {
    if (!this.before) return doc;
    const target = doc.components.find((c) => c.id === this.componentId);
    if (!target) return doc;
    return {
      ...doc,
      components: doc.components.map((c) =>
        c.id === this.componentId ? { ...c, properties: this.before! } : c,
      ),
    };
  }
}
