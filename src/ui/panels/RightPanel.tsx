import { useCircuitStore } from '@/store/useCircuitStore';
import { getPartDefinition } from '@/core/model/PartDefinitions';
import type { ComponentInstance } from '@/core/model/types';
import { NumberScrubInput } from '@/ui/controls/NumberScrubInput';
import { TestGenPanel } from '@/ui/panels/TestGenPanel';

const SCALE_STEP_FACTOR = 1.2;

export function RightPanel() {
  const doc = useCircuitStore((s) => s.doc);
  const selectedIds = useCircuitStore((s) => s.selectedIds);
  const editProperty = useCircuitStore((s) => s.editProperty);
  const rotateSelected = useCircuitStore((s) => s.rotateSelected);
  const scaleSelected = useCircuitStore((s) => s.scaleSelected);
  const setComponentScale = useCircuitStore((s) => s.setComponentScale);
  const deleteSelected = useCircuitStore((s) => s.deleteSelected);
  const copySelection = useCircuitStore((s) => s.copySelection);

  const selectedComponents = doc.components.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="panel right-panel">
      {selectedComponents.length === 1 ? (
        <ComponentEditor
          component={selectedComponents[0]}
          editProperty={editProperty}
          rotateSelected={rotateSelected}
          setComponentScale={setComponentScale}
          deleteSelected={deleteSelected}
          copySelection={copySelection}
        />
      ) : selectedComponents.length > 1 ? (
        <div className="panel-section">
          <div className="panel-label">{selectedComponents.length}個選択中</div>
          <div className="panel-section button-row">
            <button type="button" onClick={() => copySelection()} title="Ctrl+Cでも可">
              コピー
            </button>
            <button type="button" onClick={rotateSelected}>
              まとめて90°回転
            </button>
            <button type="button" className="danger" onClick={deleteSelected}>
              まとめて削除
            </button>
          </div>
          <div className="panel-section button-row">
            <button type="button" onClick={() => scaleSelected(1 / SCALE_STEP_FACTOR)} title="縮小">
              縮小
            </button>
            <button type="button" onClick={() => scaleSelected(SCALE_STEP_FACTOR)} title="拡大">
              拡大
            </button>
          </div>
        </div>
      ) : (
        <p className="panel-empty">部品を選択すると、ここで数値やラベルを編集できます。</p>
      )}

      <TestGenPanel />
    </div>
  );
}

function ComponentEditor({
  component,
  editProperty,
  rotateSelected,
  setComponentScale,
  deleteSelected,
  copySelection,
}: {
  component: ComponentInstance;
  editProperty: (id: string, patch: Record<string, unknown>) => void;
  rotateSelected: () => void;
  setComponentScale: (id: string, scale: number) => void;
  deleteSelected: () => void;
  copySelection: () => void;
}) {
  const def = getPartDefinition(component.type);

  return (
    <>
      <div className="panel-section">
        <div className="panel-label">種別</div>
        <div>{def.label}</div>
      </div>

      {component.properties.value !== undefined && (
        <div className="panel-section">
          <label className="panel-label" htmlFor="prop-value">
            数値
          </label>
          <div className="value-row">
            <NumberScrubInput
              id="prop-value"
              value={component.properties.value as number}
              onChange={(v) => editProperty(component.id, { value: v })}
            />
            <input
              aria-label="単位"
              type="text"
              className="unit-input"
              value={(component.properties.unit as string) ?? ''}
              onChange={(e) => editProperty(component.id, { unit: e.target.value })}
            />
          </div>
        </div>
      )}

      {component.properties.value !== undefined && (
        <div className="panel-section checkbox-row">
          <input
            id="prop-hidden"
            type="checkbox"
            checked={!!component.properties.hidden}
            onChange={(e) => editProperty(component.id, { hidden: e.target.checked })}
          />
          <label htmlFor="prop-hidden">問題モード（数値を□表示にする）</label>
        </div>
      )}

      <div className="panel-section">
        <label className="panel-label" htmlFor="prop-scale">
          拡大率（%）
        </label>
        <div className="value-row">
          <NumberScrubInput
            id="prop-scale"
            value={Math.round(component.scale * 100)}
            step={10}
            onChange={(v) => setComponentScale(component.id, v / 100)}
          />
          <button
            type="button"
            onClick={() => setComponentScale(component.id, component.scale / SCALE_STEP_FACTOR)}
            title="縮小"
          >
            縮小
          </button>
          <button
            type="button"
            onClick={() => setComponentScale(component.id, component.scale * SCALE_STEP_FACTOR)}
            title="拡大"
          >
            拡大
          </button>
        </div>
      </div>

      <div className="panel-section button-row">
        <button type="button" onClick={() => copySelection()} title="Ctrl+Cでも可">
          コピー
        </button>
        <button type="button" onClick={rotateSelected}>
          90°回転
        </button>
        <button type="button" className="danger" onClick={deleteSelected}>
          削除
        </button>
      </div>
    </>
  );
}
