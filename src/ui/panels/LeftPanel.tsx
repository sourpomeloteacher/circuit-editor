import { useMemo, useState } from 'react';
import { listPartsBySubject } from '@/core/model/PartDefinitions';
import type { PartType, Subject } from '@/core/model/types';
import { TemplateGallery } from '@/ui/panels/TemplateGallery';

const SUBJECT_OPTIONS: { value: Subject | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'electricCircuit', label: '電気回路' },
  { value: 'electronicCircuit', label: '電子回路' },
  { value: 'logicCircuit', label: '論理回路' },
  { value: 'electricMachinery', label: '電気機器' },
];

interface Props {
  armedType: PartType | null;
  onArm: (type: PartType) => void;
}

export function LeftPanel({ armedType, onArm }: Props) {
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const parts = useMemo(() => listPartsBySubject(subject), [subject]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof parts>();
    for (const p of parts) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [parts]);

  return (
    <div className="panel left-panel">
      <div className="panel-section">
        <label className="panel-label" htmlFor="subject-filter">
          教科フィルター
        </label>
        <select
          id="subject-filter"
          value={subject}
          onChange={(e) => setSubject(e.target.value as Subject | 'all')}
        >
          {SUBJECT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="panel-section parts-list">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category} className="parts-category">
            <div className="parts-category-title">{category}</div>
            <div className="parts-grid">
              {items.map((p) => (
                <button
                  key={p.type}
                  type="button"
                  className={`part-button ${armedType === p.type ? 'armed' : ''}`}
                  onClick={() => onArm(p.type)}
                  title={`${p.label}を配置`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {armedType && (
        <div className="panel-hint">
          「{armedType}」を配置します。キャンバスをクリックしてください。
        </div>
      )}

      <TemplateGallery />
    </div>
  );
}
