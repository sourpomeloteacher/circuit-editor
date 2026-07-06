import { useEffect, useRef, useState } from 'react';

const PIXELS_PER_STEP = 6;

interface NumberScrubInputProps {
  id?: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}

/**
 * 数値欄をクリックすると「スクラブモード」になり、マウスボタンを離した後も
 * マウスを上下に動かすだけで数値が変化し続ける。別の場所をクリックするまで
 * 変更を続けられる（従来のネイティブspinnerは押している間しか増減できなかった）。
 */
export function NumberScrubInput({ id, value, step = 1, onChange }: NumberScrubInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const origin = useRef({ y: 0, value: 0 });
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!scrubbing) return;

    function handleMove(e: PointerEvent) {
      const stepsMoved = Math.round((origin.current.y - e.clientY) / PIXELS_PER_STEP);
      const next = origin.current.value + stepsMoved * step;
      onChange(Number(next.toFixed(4)));
    }

    function handleOutsidePointerDown(e: PointerEvent) {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      setScrubbing(false);
    }

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    };
  }, [scrubbing, onChange, step]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    origin.current = { y: e.clientY, value: valueRef.current };
    setScrubbing(true);
  }

  return (
    <div
      ref={wrapperRef}
      className={`number-scrub${scrubbing ? ' number-scrub--active' : ''}`}
      onPointerDown={handlePointerDown}
      title="クリック後、マウスを上下に動かすと数値が変わります（別の場所をクリックで確定）"
    >
      <input
        id={id}
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
