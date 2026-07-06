import type { Command } from './Command';
import type { CircuitDocument, Label } from '../model/types';

/**
 * partNumber種別のラベルをまとめて置き換えるコマンド。
 * 部品番号振り直し・部品の追加/削除に連動した自動採番で使用する。
 * 1回のUndoで「振り直し前の状態」に戻せるよう、置き換え前のラベルを保持する。
 */
export class SetPartNumberLabelsCommand implements Command {
  readonly label = '部品番号を振り直し';
  private before: Label[] = [];

  constructor(private readonly newLabels: Label[]) {}

  execute(doc: CircuitDocument): CircuitDocument {
    this.before = doc.labels.filter((l) => l.kind === 'partNumber');
    return {
      ...doc,
      labels: [...doc.labels.filter((l) => l.kind !== 'partNumber'), ...this.newLabels],
    };
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return {
      ...doc,
      labels: [...doc.labels.filter((l) => l.kind !== 'partNumber'), ...this.before],
    };
  }
}

/** 部品番号ラベル全体の表示/非表示を一括で切り替えるコマンド */
export class ToggleLabelVisibilityCommand implements Command {
  readonly label = 'ラベル表示切替';
  private before: Label[] = [];

  constructor(private readonly visible: boolean) {}

  execute(doc: CircuitDocument): CircuitDocument {
    this.before = doc.labels;
    return { ...doc, labels: doc.labels.map((l) => ({ ...l, visible: this.visible })) };
  }

  undo(doc: CircuitDocument): CircuitDocument {
    return { ...doc, labels: this.before };
  }
}
