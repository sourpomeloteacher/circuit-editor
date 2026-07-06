import type { CircuitDocument } from '../model/types';

/**
 * すべての編集操作はこのCommandを実装する。
 * 「操作を1つ追加する＝execute/undoの対を1つ書く」だけでよく、
 * HistoryManagerが自動的にUndo/Redoスタックへ積む設計。
 *
 * 実装方針: CircuitDocumentは不変更新なので、
 * execute()は「変更前のdocを受け取り、変更後のdocを返す」形にする。
 * undo()は「変更後のdocを受け取り、変更前のdocを返す」形にする。
 * そのため各コマンドは内部で変更前の状態を保持しておく。
 */
export interface Command {
  /** 右パネルの操作履歴表示等に使う人間可読な名前 */
  readonly label: string;
  execute(doc: CircuitDocument): CircuitDocument;
  undo(doc: CircuitDocument): CircuitDocument;
}
