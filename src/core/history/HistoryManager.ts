import type { Command } from '../commands/Command';
import type { CircuitDocument } from '../model/types';

const MAX_HISTORY = 200;

/**
 * Undo/Redoの一元管理クラス。
 * UIやstoreはこのクラスを直接new/操作するのではなく、
 * `applyCommand` を呼ぶだけでよい設計にしている
 * （新しい編集機能を増やしても、ここを触る必要がない）。
 */
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  applyCommand(doc: CircuitDocument, command: Command): CircuitDocument {
    const next = command.execute(doc);
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = []; // 新しい操作をしたらRedo履歴は破棄
    return next;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(doc: CircuitDocument): CircuitDocument {
    const command = this.undoStack.pop();
    if (!command) return doc;
    const prev = command.undo(doc);
    this.redoStack.push(command);
    return prev;
  }

  redo(doc: CircuitDocument): CircuitDocument {
    const command = this.redoStack.pop();
    if (!command) return doc;
    const next = command.execute(doc);
    this.undoStack.push(command);
    return next;
  }

  /** 新規作成・読込直後など、履歴をリセットしたい場合に呼ぶ */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
