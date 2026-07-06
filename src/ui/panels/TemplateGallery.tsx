import { CIRCUIT_TEMPLATES } from '@/core/templates/templates';
import { useCircuitStore } from '@/store/useCircuitStore';

export function TemplateGallery() {
  const placeTemplate = useCircuitStore((s) => s.placeTemplate);

  return (
    <div className="panel-section">
      <div className="parts-category-title">テンプレート（クリックで配置）</div>
      <div className="parts-grid">
        {CIRCUIT_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="part-button"
            onClick={() => placeTemplate(t.id)}
            title={`${t.name}を配置`}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
