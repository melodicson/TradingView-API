export interface FibPoint {
  x: number;
  y: number;
  price: number;
  barIndex: number;
}

export interface FibRetracement {
  p1: FibPoint;
  p2: FibPoint;
}

export interface FibLevel {
  ratio: number;
  label: string;
  name: string;
  price: number;
  color: string;
  bgColor: string;
  textColor: string;
  isKey: boolean;
  isGoldenPocket?: boolean;
}

export const FIB_RATIOS = [
  {
    ratio: 0.0,
    name: '0.000',
    label: '0.000 (100% Ext)',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.2)',
    text: '#cbd5e1',
    isKey: false,
  },
  {
    ratio: 0.236,
    name: '0.236',
    label: '0.236 (23.6%)',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.2)',
    text: '#7dd3fc',
    isKey: false,
  },
  {
    ratio: 0.382,
    name: '0.382',
    label: '0.382 (38.2%)',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.25)',
    text: '#a7f3d0',
    isKey: true,
  },
  {
    ratio: 0.5,
    name: '0.500',
    label: '0.500 (50.0%)',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.25)',
    text: '#fde68a',
    isKey: true,
  },
  {
    ratio: 0.618,
    name: '0.618',
    label: '0.618 (Golden Ratio)',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.28)',
    text: '#fda4af',
    isKey: true,
    isGoldenPocket: true,
  },
  {
    ratio: 0.786,
    name: '0.786',
    label: '0.786 (78.6%)',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.2)',
    text: '#d8b4fe',
    isKey: false,
  },
  {
    ratio: 1.0,
    name: '1.000',
    label: '1.000 (Base Level)',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.2)',
    text: '#cbd5e1',
    isKey: false,
  },
];

/**
 * Calculates Fibonacci Retracement price levels given two anchor price points.
 * Retracement from Point 2 back towards Point 1:
 * Price(ratio) = P2 - ratio * (P2 - P1)
 */
export function calculateFibLevels(p1Price: number, p2Price: number): FibLevel[] {
  const diff = p2Price - p1Price;

  return FIB_RATIOS.map((item) => {
    const levelPrice = p2Price - item.ratio * diff;
    return {
      ratio: item.ratio,
      name: item.name,
      label: item.label,
      price: levelPrice,
      color: item.color,
      bgColor: item.bg,
      textColor: item.text,
      isKey: item.isKey,
      isGoldenPocket: item.isGoldenPocket,
    };
  });
}
