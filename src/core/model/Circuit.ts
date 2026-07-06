import type {
  CircuitDocument,
  ComponentInstance,
  Label,
  PartType,
  Subject,
  Wire,
} from './types';
import { getPartDefinition } from './PartDefinitions';

export const SCHEMA_VERSION = '1.0';

let idCounter = 0;
/** 保存済みJSONの復元時にも衝突しないよう、時刻+連番でIDを発行する。 */
export function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

/** 空の新規回路図を作成する。 */
export function createEmptyCircuit(subject: Subject = 'electricCircuit'): CircuitDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: generateId('doc'),
    name: '無題の回路図',
    components: [],
    wires: [],
    labels: [],
    metadata: {
      createdAt: now,
      updatedAt: now,
      subject,
    },
  };
}

/** 部品カタログのデフォルト値から新しい部品インスタンスを作る。 */
export function createComponentInstance(
  type: PartType,
  x: number,
  y: number,
): ComponentInstance {
  const def = getPartDefinition(type);
  return {
    id: generateId('c'),
    type,
    x,
    y,
    rotation: 0,
    flipped: false,
    scale: 1,
    properties: { ...def.defaultProperties },
  };
}

/**
 * CircuitDocumentはCommand層から「不変更新（イミュータブル）」で扱う。
 * 直接ミューテートせず、これらのヘルパーで新しいオブジェクトを返すことで、
 * Undo用のスナップショット比較やReactの再レンダリングが安全になる。
 */
export function withComponentAdded(
  doc: CircuitDocument,
  component: ComponentInstance,
): CircuitDocument {
  return touch({ ...doc, components: [...doc.components, component] });
}

export function withComponentRemoved(
  doc: CircuitDocument,
  componentId: string,
): CircuitDocument {
  // 部品を消したら、それにぶら下がる配線・ラベルも一緒に消す。
  // さらに、その配線に分岐(junction)接続していた配線も連鎖的に消す。
  const directlyRemoved = new Set(
    doc.wires
      .filter(
        (w) =>
          (w.from.kind === 'pin' && w.from.componentId === componentId) ||
          (w.to.kind === 'pin' && w.to.componentId === componentId),
      )
      .map((w) => w.id),
  );
  return touch({
    ...doc,
    components: doc.components.filter((c) => c.id !== componentId),
    wires: removeWiresCascade(doc.wires, directlyRemoved),
    labels: doc.labels.filter((l) => l.targetId !== componentId),
  });
}

/**
 * 配線IDの集合を削除しつつ、それらに分岐(junction)接続していた配線も連鎖的に削除する。
 * （分岐元が無くなった配線を宙ぶらりんのまま残さないため）
 */
function removeWiresCascade(wires: Wire[], initialIdsToRemove: Set<string>): Wire[] {
  const toRemove = new Set(initialIdsToRemove);
  let changed = true;
  while (changed) {
    changed = false;
    for (const w of wires) {
      if (toRemove.has(w.id)) continue;
      const dependsOnRemoved =
        (w.from.kind === 'junction' && toRemove.has(w.from.wireId)) ||
        (w.to.kind === 'junction' && toRemove.has(w.to.wireId));
      if (dependsOnRemoved) {
        toRemove.add(w.id);
        changed = true;
      }
    }
  }
  return wires.filter((w) => !toRemove.has(w.id));
}

export function withComponentUpdated(
  doc: CircuitDocument,
  componentId: string,
  patch: Partial<ComponentInstance>,
): CircuitDocument {
  return touch({
    ...doc,
    components: doc.components.map((c) =>
      c.id === componentId ? { ...c, ...patch } : c,
    ),
  });
}

export function withComponentPropertyUpdated(
  doc: CircuitDocument,
  componentId: string,
  propertyPatch: Record<string, unknown>,
): CircuitDocument {
  return touch({
    ...doc,
    components: doc.components.map((c) =>
      c.id === componentId
        ? { ...c, properties: { ...c.properties, ...propertyPatch } }
        : c,
    ),
  });
}

export function withWireAdded(doc: CircuitDocument, wire: Wire): CircuitDocument {
  return touch({ ...doc, wires: [...doc.wires, wire] });
}

export function withWireRemoved(doc: CircuitDocument, wireId: string): CircuitDocument {
  return touch({ ...doc, wires: removeWiresCascade(doc.wires, new Set([wireId])) });
}

export function withLabelUpserted(doc: CircuitDocument, label: Label): CircuitDocument {
  const exists = doc.labels.some((l) => l.id === label.id);
  return touch({
    ...doc,
    labels: exists
      ? doc.labels.map((l) => (l.id === label.id ? label : l))
      : [...doc.labels, label],
  });
}

function touch(doc: CircuitDocument): CircuitDocument {
  return { ...doc, metadata: { ...doc.metadata, updatedAt: new Date().toISOString() } };
}

/** 回路全体をディープコピーする（問題バリエーション生成の元にする）。 */
export function cloneCircuit(doc: CircuitDocument): CircuitDocument {
  return JSON.parse(JSON.stringify(doc)) as CircuitDocument;
}
