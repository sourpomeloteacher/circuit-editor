import { create } from 'zustand';
import type {
  CircuitDocument,
  ComponentInstance,
  PartType,
  Point,
  Rotation,
  Wire,
  WireEndpoint,
  WireRouting,
} from '@/core/model/types';
import { createEmptyCircuit, createComponentInstance, generateId } from '@/core/model/Circuit';
import { HistoryManager } from '@/core/history/HistoryManager';
import type { Command } from '@/core/commands/Command';
import { AddComponentCommand } from '@/core/commands/AddComponentCommand';
import { AddWireCommand, DeleteWireCommand } from '@/core/commands/AddWireCommand';
import { DeleteComponentCommand } from '@/core/commands/DeleteComponentCommand';
import { MoveComponentCommand } from '@/core/commands/MoveComponentCommand';
import { RotateComponentCommand } from '@/core/commands/RotateComponentCommand';
import { ScaleComponentCommand, clampScale } from '@/core/commands/ScaleComponentCommand';
import { EditPropertyCommand } from '@/core/commands/EditPropertyCommand';
import { CompositeCommand } from '@/core/commands/CompositeCommand';
import { ResetWireRouteCommand } from '@/core/commands/ResetWireRouteCommand';
import { SetPartNumberLabelsCommand, ToggleLabelVisibilityCommand } from '@/core/commands/LabelCommands';
import { toJson, fromJson } from '@/core/serialization/CircuitSerializer';
import { TauriAdapter } from '@/platform/TauriAdapter';
import type { PlatformAdapter } from '@/platform/PlatformAdapter';
import { computeRenumberedLabels } from '@/core/labels/PartNumbering';
import {
  buildBulkValueChangeCommand,
  buildProblemModeCommand,
  buildRandomizeCommand,
  isCircuitInProblemMode,
} from '@/core/testgen/BulkChange';
import { generateVariations } from '@/core/testgen/VariationGenerator';
import { CIRCUIT_TEMPLATES, instantiateTemplate } from '@/core/templates/templates';

const history = new HistoryManager();
// 現状はTauri実装のみ。将来Web版ではここをWebAdapterに差し替える。
const platform: PlatformAdapter = new TauriAdapter();

/** コピー＆ペーストのクリップボード。UIの再描画には無関係なのでstore外に持つ。 */
let componentClipboard: ComponentInstance[] = [];

const PASTE_OFFSET = 20;

/**
 * 手動で折れ点を持つ配線（テンプレート由来・自由配線の分岐など）のうち、
 * 今回移動/回転する部品につながっているものをリセットするコマンド群を作る。
 * 折れ点は絶対座標で固定されているため、そのままだと部品を動かした瞬間に
 * 配線だけ古い位置に取り残されて歪んで見える。90°自動配線に戻すことで、
 * 常に現在のピン位置から経路を組み立て直させる。
 */
function buildStaleWireResetCommands(doc: CircuitDocument, movedComponentIds: Set<string>): Command[] {
  const commands: Command[] = [];
  for (const w of doc.wires) {
    const touchesMoved =
      (w.from.kind === 'pin' && movedComponentIds.has(w.from.componentId)) ||
      (w.to.kind === 'pin' && movedComponentIds.has(w.to.componentId));
    if (touchesMoved && w.points.length > 0) {
      commands.push(new ResetWireRouteCommand(w.id));
    }
  }
  return commands;
}

interface CircuitState {
  doc: CircuitDocument;
  selectedIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  variations: CircuitDocument[] | null;
  activeVariationIndex: number | null;
  wireRoutingMode: WireRouting;

  selectComponent: (id: string | null, options?: { additive?: boolean }) => void;
  addComponent: (type: PartType, x: number, y: number) => void;
  moveSelected: (moves: { id: string; from: Point; to: Point }[]) => void;
  deleteSelected: () => void;
  rotateSelected: () => void;
  scaleSelected: (factor: number) => void;
  setComponentScale: (id: string, scale: number) => void;
  editProperty: (id: string, patch: Record<string, unknown>) => void;
  undo: () => void;
  redo: () => void;
  newCircuit: () => void;
  saveToFile: () => Promise<void>;
  loadFromFile: () => Promise<void>;

  placeTemplate: (templateId: string) => void;
  toggleLabelsVisible: (visible: boolean) => void;
  renumberParts: () => void;
  toggleProblemMode: () => void;
  bulkMultiply: (factor: number) => void;
  bulkAdd: (offset: number) => void;
  randomizeValues: () => void;
  generateProblemVariations: () => void;
  selectVariation: (index: number) => void;

  setWireRoutingMode: (mode: WireRouting) => void;
  addWire: (from: WireEndpoint, to: WireEndpoint, points?: Point[]) => void;
  deleteWire: (id: string) => void;

  copySelection: () => void;
  pasteClipboard: () => void;

  savePngFile: (dataUrl: string, suggestedName: string) => Promise<void>;
  saveSvgFile: (svg: string, suggestedName: string) => Promise<void>;
  savePdfFile: (bytes: Uint8Array, suggestedName: string) => Promise<void>;
  copyImageToClipboard: (dataUrl: string) => Promise<void>;
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  doc: createEmptyCircuit(),
  selectedIds: [],
  canUndo: false,
  canRedo: false,
  variations: null,
  activeVariationIndex: null,
  wireRoutingMode: 'orthogonal',

  selectComponent: (id, options) => {
    if (id === null) {
      set({ selectedIds: [] });
      return;
    }
    if (options?.additive) {
      const current = get().selectedIds;
      const next = current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id];
      set({ selectedIds: next });
      return;
    }
    set({ selectedIds: [id] });
  },

  addComponent: (type, x, y) => {
    const component = createComponentInstance(type, x, y);
    const command = new AddComponentCommand(component);
    const nextDoc = history.applyCommand(get().doc, command);
    set({ doc: nextDoc, selectedIds: [component.id], canUndo: true, canRedo: false });
  },

  moveSelected: (moves) => {
    const real = moves.filter((m) => m.from.x !== m.to.x || m.from.y !== m.to.y);
    if (real.length === 0) return;
    const doc = get().doc;
    const commands: Command[] = real.map((m) => new MoveComponentCommand(m.id, m.from, m.to));
    commands.push(...buildStaleWireResetCommands(doc, new Set(real.map((m) => m.id))));
    const command = commands.length === 1 ? commands[0] : new CompositeCommand('部品を移動', commands);
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  deleteSelected: () => {
    const { selectedIds, doc } = get();
    if (selectedIds.length === 0) return;
    const commands: Command[] = selectedIds.map((id) => new DeleteComponentCommand(id));
    const command = commands.length === 1 ? commands[0] : new CompositeCommand('部品を削除', commands);
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, selectedIds: [], canUndo: true, canRedo: false });
  },

  rotateSelected: () => {
    const { selectedIds, doc } = get();
    if (selectedIds.length === 0) return;
    const targets = selectedIds
      .map((id) => doc.components.find((c) => c.id === id))
      .filter((c): c is ComponentInstance => !!c);
    if (targets.length === 0) return;
    const commands: Command[] = targets.map(
      (c) => new RotateComponentCommand(c.id, c.rotation as Rotation),
    );
    commands.push(...buildStaleWireResetCommands(doc, new Set(targets.map((c) => c.id))));
    const command = commands.length === 1 ? commands[0] : new CompositeCommand('90°回転', commands);
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  scaleSelected: (factor) => {
    const { selectedIds, doc } = get();
    if (selectedIds.length === 0) return;
    const targets = selectedIds
      .map((id) => doc.components.find((c) => c.id === id))
      .filter((c): c is ComponentInstance => !!c);
    if (targets.length === 0) return;
    const commands: Command[] = targets
      .map((c) => ({ id: c.id, from: c.scale, to: clampScale(c.scale * factor) }))
      .filter((m) => m.from !== m.to)
      .map((m) => new ScaleComponentCommand(m.id, m.from, m.to));
    if (commands.length === 0) return;
    const command = commands.length === 1 ? commands[0] : new CompositeCommand('拡大縮小', commands);
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  setComponentScale: (id, scale) => {
    const doc = get().doc;
    const target = doc.components.find((c) => c.id === id);
    if (!target) return;
    const clamped = clampScale(scale);
    if (clamped === target.scale) return;
    const command = new ScaleComponentCommand(id, target.scale, clamped);
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  editProperty: (id, patch) => {
    const command = new EditPropertyCommand(id, patch);
    const nextDoc = history.applyCommand(get().doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  undo: () => {
    if (!history.canUndo()) return;
    const nextDoc = history.undo(get().doc);
    set({ doc: nextDoc, canUndo: history.canUndo(), canRedo: history.canRedo() });
  },

  redo: () => {
    if (!history.canRedo()) return;
    const nextDoc = history.redo(get().doc);
    set({ doc: nextDoc, canUndo: history.canUndo(), canRedo: history.canRedo() });
  },

  newCircuit: () => {
    history.clear();
    componentClipboard = [];
    set({
      doc: createEmptyCircuit(),
      selectedIds: [],
      canUndo: false,
      canRedo: false,
      variations: null,
      activeVariationIndex: null,
    });
  },

  saveToFile: async () => {
    const { doc } = get();
    await platform.saveJson(toJson(doc), `${doc.name}.json`);
  },

  loadFromFile: async () => {
    const json = await platform.openJson();
    if (!json) return;
    const doc = fromJson(json);
    history.clear();
    set({
      doc,
      selectedIds: [],
      canUndo: false,
      canRedo: false,
      variations: null,
      activeVariationIndex: null,
    });
  },

  placeTemplate: (templateId) => {
    const template = CIRCUIT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const { components, wires } = instantiateTemplate(template);
    const commands: Command[] = [
      ...components.map((c) => new AddComponentCommand(c)),
      ...wires.map((w) => new AddWireCommand(w)),
    ];
    const command = new CompositeCommand(`テンプレート配置: ${template.name}`, commands);
    const nextDoc = history.applyCommand(get().doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  toggleLabelsVisible: (visible) => {
    const command = new ToggleLabelVisibilityCommand(visible);
    const nextDoc = history.applyCommand(get().doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  renumberParts: () => {
    const doc = get().doc;
    const labels = computeRenumberedLabels(doc);
    const command = new SetPartNumberLabelsCommand(labels);
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  toggleProblemMode: () => {
    const doc = get().doc;
    const command = buildProblemModeCommand(doc.components, !isCircuitInProblemMode(doc));
    if (!command) return;
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  bulkMultiply: (factor) => {
    const doc = get().doc;
    const command = buildBulkValueChangeCommand(doc.components, { kind: 'multiply', factor });
    if (!command) return;
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  bulkAdd: (offset) => {
    const doc = get().doc;
    const command = buildBulkValueChangeCommand(doc.components, { kind: 'add', offset });
    if (!command) return;
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  randomizeValues: () => {
    const doc = get().doc;
    const command = buildRandomizeCommand(doc.components);
    if (!command) return;
    const nextDoc = history.applyCommand(doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  generateProblemVariations: () => {
    const variations = generateVariations(get().doc);
    history.clear();
    set({
      doc: variations[0],
      variations,
      activeVariationIndex: 0,
      selectedIds: [],
      canUndo: false,
      canRedo: false,
    });
  },

  selectVariation: (index) => {
    const { variations } = get();
    const target = variations?.[index];
    if (!target) return;
    history.clear();
    set({
      doc: target,
      activeVariationIndex: index,
      selectedIds: [],
      canUndo: false,
      canRedo: false,
    });
  },

  setWireRoutingMode: (mode) => set({ wireRoutingMode: mode }),

  addWire: (from, to, points = []) => {
    if (from.kind === 'pin' && to.kind === 'pin' && from.componentId === to.componentId) return; // 同一部品内の自己配線は無視
    const wire: Wire = {
      id: generateId('w'),
      points,
      from,
      to,
      routing: get().wireRoutingMode,
    };
    const command = new AddWireCommand(wire);
    const nextDoc = history.applyCommand(get().doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  deleteWire: (id) => {
    const command = new DeleteWireCommand(id);
    const nextDoc = history.applyCommand(get().doc, command);
    set({ doc: nextDoc, canUndo: true, canRedo: false });
  },

  copySelection: () => {
    const { selectedIds, doc } = get();
    if (selectedIds.length === 0) return;
    componentClipboard = doc.components
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => ({ ...c, properties: { ...c.properties } }));
  },

  pasteClipboard: () => {
    if (componentClipboard.length === 0) return;
    const pasted = componentClipboard.map((c) => ({
      ...c,
      id: generateId('c'),
      x: c.x + PASTE_OFFSET,
      y: c.y + PASTE_OFFSET,
      properties: { ...c.properties },
    }));
    const commands: Command[] = pasted.map((c) => new AddComponentCommand(c));
    const command = commands.length === 1 ? commands[0] : new CompositeCommand('貼り付け', commands);
    const nextDoc = history.applyCommand(get().doc, command);
    componentClipboard = pasted; // 連続貼り付けで少しずつ位置をずらせるようにする
    set({ doc: nextDoc, selectedIds: pasted.map((c) => c.id), canUndo: true, canRedo: false });
  },

  savePngFile: (dataUrl, suggestedName) => platform.savePng(dataUrl, suggestedName),
  saveSvgFile: (svg, suggestedName) => platform.saveSvg(svg, suggestedName),
  savePdfFile: (bytes, suggestedName) => platform.savePdf(bytes, suggestedName),
  copyImageToClipboard: (dataUrl) => platform.copyImageToClipboard(dataUrl),
}));
