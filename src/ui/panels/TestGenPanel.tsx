import { useState } from 'react';
import { useCircuitStore } from '@/store/useCircuitStore';
import { isCircuitInProblemMode } from '@/core/testgen/BulkChange';

export function TestGenPanel() {
  const doc = useCircuitStore((s) => s.doc);
  const toggleLabelsVisible = useCircuitStore((s) => s.toggleLabelsVisible);
  const renumberParts = useCircuitStore((s) => s.renumberParts);
  const toggleProblemMode = useCircuitStore((s) => s.toggleProblemMode);
  const bulkMultiply = useCircuitStore((s) => s.bulkMultiply);
  const bulkAdd = useCircuitStore((s) => s.bulkAdd);
  const randomizeValues = useCircuitStore((s) => s.randomizeValues);
  const generateProblemVariations = useCircuitStore((s) => s.generateProblemVariations);
  const selectVariation = useCircuitStore((s) => s.selectVariation);
  const variations = useCircuitStore((s) => s.variations);
  const activeVariationIndex = useCircuitStore((s) => s.activeVariationIndex);
  const saveToFile = useCircuitStore((s) => s.saveToFile);

  const [factor, setFactor] = useState(2);
  const [offset, setOffset] = useState(10);
  const labelsVisible = doc.labels.some((l) => l.visible) || doc.labels.length === 0;
  const problemModeOn = isCircuitInProblemMode(doc);

  return (
    <div className="panel-section testgen-panel">
      <div className="parts-category-title">テスト作成支援</div>

      <div className="checkbox-row">
        <input
          id="problem-mode-all"
          type="checkbox"
          checked={problemModeOn}
          onChange={toggleProblemMode}
        />
        <label htmlFor="problem-mode-all">問題モード（全数値を□にする）</label>
      </div>

      <div className="checkbox-row">
        <input
          id="labels-visible"
          type="checkbox"
          checked={labelsVisible}
          onChange={(e) => toggleLabelsVisible(e.target.checked)}
        />
        <label htmlFor="labels-visible">部品番号ラベルを表示</label>
      </div>

      <button type="button" onClick={renumberParts} className="full-width">
        部品番号を振り直す
      </button>

      <div className="testgen-block">
        <div className="panel-label">一括数値変更</div>
        <div className="value-row">
          <span>×</span>
          <input type="number" value={factor} step={0.1} onChange={(e) => setFactor(Number(e.target.value))} />
          <button type="button" onClick={() => bulkMultiply(factor)}>倍率適用</button>
        </div>
        <div className="value-row">
          <span>+</span>
          <input type="number" value={offset} onChange={(e) => setOffset(Number(e.target.value))} />
          <button type="button" onClick={() => bulkAdd(offset)}>加算適用</button>
        </div>
      </div>

      <button type="button" onClick={randomizeValues} className="full-width">
        数値をランダム生成
      </button>

      <div className="testgen-block">
        <div className="panel-label">問題バリエーション生成（A/B/C）</div>
        <button type="button" onClick={generateProblemVariations} className="full-width">
          A/B/Cを生成
        </button>
        {variations && (
          <div className="variation-tabs">
            {variations.map((v, i) => (
              <button
                key={v.id}
                type="button"
                className={`part-button ${activeVariationIndex === i ? 'armed' : ''}`}
                onClick={() => selectVariation(i)}
              >
                {['A', 'B', 'C'][i] ?? i + 1}
              </button>
            ))}
            <button type="button" onClick={() => void saveToFile()} title="現在表示中のバリエーションを保存">
              このバリエーションを保存
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
