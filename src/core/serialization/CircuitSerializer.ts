import type { CircuitDocument, ComponentInstance, Wire, WireEndpoint } from '../model/types';
import { SCHEMA_VERSION } from '../model/Circuit';

/**
 * 保存ファイル(.json)への変換・復元を担当する。
 * schemaVersionを見て、将来フォーマットが変わった際にマイグレーションを挟めるようにしている。
 */
export function toJson(doc: CircuitDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function fromJson(json: string): CircuitDocument {
  const parsed = JSON.parse(json) as CircuitDocument;
  if (!parsed.schemaVersion) {
    throw new Error('不正なファイル形式です（schemaVersionがありません）');
  }
  return migrate(parsed);
}

function migrate(doc: CircuitDocument): CircuitDocument {
  // 現状はv1.0のみ。将来のバージョン差分はここで吸収する。
  if (doc.schemaVersion !== SCHEMA_VERSION) {
    console.warn(
      `保存ファイルのバージョン(${doc.schemaVersion})が現在のアプリ(${SCHEMA_VERSION})と異なります。`,
    );
  }
  return {
    ...doc,
    wires: (doc.wires ?? []).map(migrateWireEndpoints),
    components: (doc.components ?? []).map(migrateComponentScale),
  };
}

/** 拡大縮小対応前に保存されたファイルは `scale` を持たないため、等倍(1)を補う。 */
function migrateComponentScale(component: ComponentInstance): ComponentInstance {
  return { ...component, scale: component.scale ?? 1 };
}

/**
 * 配線同士の接続(junction)対応前に保存されたファイルは、
 * 端点が `{componentId, pinId}` のみで `kind` を持たない。
 * その場合は暗黙的に `kind: 'pin'` を補って読み込めるようにする。
 */
function migrateWireEndpoints(wire: Wire): Wire {
  return { ...wire, from: migrateEndpoint(wire.from), to: migrateEndpoint(wire.to) };
}

function migrateEndpoint(endpoint: WireEndpoint): WireEndpoint {
  if ('kind' in endpoint && endpoint.kind) return endpoint;
  return { kind: 'pin', ...(endpoint as unknown as { componentId: string; pinId: string }) };
}
