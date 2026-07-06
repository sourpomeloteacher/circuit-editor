import type { PartType } from '@/core/model/types';

/**
 * 部品種別ごとの見た目（SVG）。
 * フェーズ1の縦スライスでは簡易的な記号のみ。
 * フェーズ5（部品ライブラリ拡充）でJIS配電記号に準拠した正式な記号へ差し替える。
 * データ（PartDefinitions）と見た目（このファイル）を分離しているため、
 * この差し替えは他レイヤーに影響しない。
 */
export function PartSymbol({ type }: { type: PartType }) {
  const stroke = 'var(--wire-color, #2b2b2b)';
  const common = { stroke, strokeWidth: 2, fill: 'none' } as const;

  switch (type) {
    case 'resistor':
    case 'variableResistor':
      return (
        <g>
          <line x1={-25} y1={0} x2={-15} y2={0} {...common} />
          <rect x={-15} y={-7} width={30} height={14} {...common} />
          <line x1={15} y1={0} x2={25} y2={0} {...common} />
          {type === 'variableResistor' && (
            <line x1={-10} y1={10} x2={10} y2={-10} {...common} markerEnd="url(#arrow)" />
          )}
        </g>
      );
    case 'capacitor':
    case 'variableCapacitor':
      return (
        <g>
          <line x1={-20} y1={0} x2={-4} y2={0} {...common} />
          <line x1={-4} y1={-12} x2={-4} y2={12} {...common} />
          <line x1={4} y1={-12} x2={4} y2={12} {...common} />
          <line x1={4} y1={0} x2={20} y2={0} {...common} />
          {type === 'variableCapacitor' && (
            <line x1={-10} y1={14} x2={10} y2={-14} {...common} />
          )}
        </g>
      );
    case 'coil':
    case 'variableCoil':
      return (
        <g>
          <line x1={-25} y1={0} x2={-15} y2={0} {...common} />
          <path d="M -15 0 A 5 8 0 0 1 -5 0 A 5 8 0 0 1 5 0 A 5 8 0 0 1 15 0" {...common} />
          <line x1={15} y1={0} x2={25} y2={0} {...common} />
        </g>
      );
    case 'switch':
    case 'contactA':
      return (
        <g>
          <circle cx={-18} cy={0} r={2} fill={stroke} />
          <circle cx={18} cy={0} r={2} fill={stroke} />
          <line x1={-16} y1={0} x2={12} y2={-10} {...common} />
        </g>
      );
    case 'contactB':
      return (
        <g>
          <circle cx={-18} cy={0} r={2} fill={stroke} />
          <circle cx={18} cy={0} r={2} fill={stroke} />
          <line x1={-16} y1={0} x2={16} y2={0} {...common} />
          <line x1={-5} y1={-9} x2={5} y2={9} {...common} />
        </g>
      );
    case 'selectorSwitch':
    case 'contactC':
      return (
        <g>
          <circle cx={-20} cy={0} r={2} fill={stroke} />
          <circle cx={20} cy={-15} r={2} fill={stroke} />
          <circle cx={20} cy={15} r={2} fill={stroke} />
          <line x1={-20} y1={0} x2={-14} y2={0} {...common} />
          <line x1={-14} y1={0} x2={14} y2={-11} {...common} />
        </g>
      );
    case 'dcSource':
      return (
        <g>
          <line x1={0} y1={-20} x2={0} y2={-6} {...common} />
          <line x1={-10} y1={-6} x2={10} y2={-6} {...common} />
          <line x1={-6} y1={6} x2={6} y2={6} {...common} strokeWidth={4} />
          <line x1={0} y1={6} x2={0} y2={20} {...common} />
        </g>
      );
    case 'battery':
      return (
        <g>
          <line x1={0} y1={-15} x2={0} y2={-10} {...common} />
          <line x1={-8} y1={-10} x2={8} y2={-10} {...common} />
          <line x1={-4} y1={-4} x2={4} y2={-4} {...common} strokeWidth={4} />
          <line x1={-8} y1={2} x2={8} y2={2} {...common} />
          <line x1={-4} y1={8} x2={4} y2={8} {...common} strokeWidth={4} />
          <line x1={0} y1={8} x2={0} y2={15} {...common} />
        </g>
      );
    case 'acSource':
      return (
        <g>
          <circle cx={0} cy={0} r={16} {...common} />
          <path d="M -8 0 Q -4 -10 0 0 T 8 0" {...common} />
        </g>
      );
    case 'threePhaseSource':
      return (
        <g>
          <circle cx={0} cy={0} r={18} {...common} />
          <line x1={-12.7} y1={-12.7} x2={-20} y2={-20} {...common} />
          <line x1={12.7} y1={-12.7} x2={20} y2={-20} {...common} />
          <line x1={0} y1={18} x2={0} y2={20} {...common} />
          <text x={0} y={6} textAnchor="middle" fontSize={13} fill={stroke}>
            3∼
          </text>
        </g>
      );
    case 'led':
    case 'diode':
      return (
        <g>
          <line x1={-20} y1={0} x2={-6} y2={0} {...common} />
          <polygon points="-6,-8 -6,8 8,0" {...common} fill={stroke} />
          <line x1={8} y1={-8} x2={8} y2={8} {...common} />
          <line x1={8} y1={0} x2={20} y2={0} {...common} />
          {type === 'led' && (
            <>
              <line x1={10} y1={-10} x2={16} y2={-18} {...common} />
              <line x1={14} y1={-6} x2={20} y2={-14} {...common} />
            </>
          )}
        </g>
      );
    case 'bridgeDiode': {
      const vertices = { top: [0, -25], right: [25, 0], bottom: [0, 25], left: [-25, 0] } as const;
      // 各辺の中点に、整流時の導通方向を向いたダイオード記号を配置する
      const diodeEdges: { mid: [number, number]; angle: number }[] = [
        { mid: [-12.5, 12.5], angle: 45 }, // left -> bottom (AC1 -> +)
        { mid: [12.5, 12.5], angle: 135 }, // right -> bottom (AC2 -> +)
        { mid: [-12.5, -12.5], angle: 135 }, // top -> left (- -> AC1)
        { mid: [12.5, -12.5], angle: 45 }, // top -> right (- -> AC2)
      ];
      return (
        <g>
          <polygon
            points={`${vertices.top.join(',')} ${vertices.right.join(',')} ${vertices.bottom.join(',')} ${vertices.left.join(',')}`}
            {...common}
          />
          {diodeEdges.map(({ mid, angle }, i) => (
            <g key={i} transform={`translate(${mid[0]}, ${mid[1]}) rotate(${angle})`}>
              <polygon points="-5,-4 -5,4 5,0" {...common} fill={stroke} />
              <line x1={5} y1={-4} x2={5} y2={4} {...common} />
            </g>
          ))}
          <line x1={-25} y1={0} x2={-20} y2={0} {...common} />
          <line x1={25} y1={0} x2={20} y2={0} {...common} />
          <line x1={0} y1={25} x2={0} y2={20} {...common} />
          <line x1={0} y1={-25} x2={0} y2={-20} {...common} />
          <text x={-20} y={-4} textAnchor="middle" fontSize={9} fill={stroke}>〜</text>
          <text x={20} y={-4} textAnchor="middle" fontSize={9} fill={stroke}>〜</text>
          <text x={6} y={22} textAnchor="middle" fontSize={10} fill={stroke}>+</text>
          <text x={6} y={-18} textAnchor="middle" fontSize={10} fill={stroke}>-</text>
        </g>
      );
    }
    case 'transistorNpn':
    case 'transistorPnp': {
      const isNpn = type === 'transistorNpn';
      return (
        <g>
          <circle cx={0} cy={0} r={18} {...common} />
          <line x1={-20} y1={0} x2={-4} y2={0} {...common} />
          <line x1={-4} y1={-11} x2={-4} y2={11} {...common} />
          <line x1={-4} y1={-6} x2={13} y2={-18} {...common} />
          <line x1={-4} y1={6} x2={13} y2={18} {...common} />
          <line x1={13} y1={-18} x2={15} y2={-20} {...common} />
          <line x1={13} y1={18} x2={15} y2={20} {...common} />
          {isNpn ? (
            <polygon points="6,10 12,15 3,16" fill={stroke} />
          ) : (
            <polygon points="-4,6 4,9 1,15" fill={stroke} />
          )}
        </g>
      );
    }
    case 'fet':
      return (
        <g>
          <circle cx={0} cy={0} r={18} {...common} />
          <line x1={-20} y1={0} x2={-8} y2={0} {...common} />
          <line x1={-8} y1={-8} x2={-8} y2={8} {...common} />
          <polygon points="-8,0 -3,-3 -3,3" fill={stroke} />
          <line x1={0} y1={-13} x2={0} y2={13} {...common} />
          <line x1={0} y1={-13} x2={13} y2={-20} {...common} />
          <line x1={13} y1={-20} x2={15} y2={-20} {...common} />
          <line x1={0} y1={13} x2={13} y2={20} {...common} />
          <line x1={13} y1={20} x2={15} y2={20} {...common} />
        </g>
      );
    case 'relayCoil':
      return (
        <g>
          <line x1={-20} y1={0} x2={-12} y2={0} {...common} />
          <rect x={-12} y={-8} width={24} height={16} {...common} />
          <line x1={12} y1={0} x2={20} y2={0} {...common} />
        </g>
      );
    case 'ground':
      return (
        <g>
          <line x1={0} y1={-20} x2={0} y2={0} {...common} />
          <line x1={-12} y1={0} x2={12} y2={0} {...common} />
          <line x1={-7} y1={6} x2={7} y2={6} {...common} />
          <line x1={-3} y1={12} x2={3} y2={12} {...common} />
        </g>
      );
    case 'ammeter':
    case 'voltmeter':
    case 'wattmeter':
      return (
        <g>
          <line x1={-20} y1={0} x2={-16} y2={0} {...common} />
          <circle cx={0} cy={0} r={16} {...common} />
          <text x={0} y={5} textAnchor="middle" fontSize={14} fill={stroke}>
            {type === 'ammeter' ? 'A' : type === 'voltmeter' ? 'V' : 'W'}
          </text>
          <line x1={16} y1={0} x2={20} y2={0} {...common} />
        </g>
      );
    case 'motor':
      return (
        <g>
          <line x1={-20} y1={0} x2={-16} y2={0} {...common} />
          <circle cx={0} cy={0} r={16} {...common} />
          <text x={0} y={5} textAnchor="middle" fontSize={14} fill={stroke}>M</text>
          <line x1={16} y1={0} x2={20} y2={0} {...common} />
        </g>
      );
    default:
      // フェーズ5で全種類実装するまでの暫定表示
      return (
        <g>
          <rect x={-20} y={-12} width={40} height={24} {...common} rx={4} />
          <text x={0} y={4} textAnchor="middle" fontSize={9} fill={stroke}>
            {type}
          </text>
        </g>
      );
  }
}
