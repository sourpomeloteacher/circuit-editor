import { useState } from 'react';
import { Toolbar } from '@/ui/layout/Toolbar';
import { LeftPanel } from '@/ui/panels/LeftPanel';
import { RightPanel } from '@/ui/panels/RightPanel';
import { CircuitCanvas } from '@/ui/canvas/CircuitCanvas';
import type { PartType } from '@/core/model/types';
import './app.css';

export default function App() {
  const [armedType, setArmedType] = useState<PartType | null>(null);

  return (
    <div className="app-shell">
      <Toolbar />
      <div className="app-body">
        <LeftPanel armedType={armedType} onArm={setArmedType} />
        <main className="canvas-area">
          <CircuitCanvas armedType={armedType} onPlaced={() => setArmedType(null)} />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}
