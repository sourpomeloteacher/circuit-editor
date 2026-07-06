import type { Command } from './Command';
import type { CircuitDocument } from '../model/types';

/**
 * 「一括数値変更」「ランダム数値生成」「部品番号振り直し」のように
 * 複数の変更を1回のUndo操作でまとめて戻したい場合に使う。
 */
export class CompositeCommand implements Command {
  constructor(
    readonly label: string,
    private readonly commands: Command[],
  ) {}

  execute(doc: CircuitDocument): CircuitDocument {
    return this.commands.reduce((acc, cmd) => cmd.execute(acc), doc);
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return [...this.commands].reverse().reduce((acc, cmd) => cmd.undo(acc), doc);
  }
}
