import type { Candle } from '../types';

export interface PivotLevel {
  id: string;
  name: string; // 'R2' | 'R1' | 'P' | 'S1' | 'S2'
  type: 'resistance' | 'pivot' | 'support';
  price: number;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

export interface PivotPointsResult {
  levels: PivotLevel[];
  referenceDay?: string;
  prevHigh: number;
  prevLow: number;
  prevClose: number;
  pivotPrice: number;
}

/**
 * Calculates classical daily Pivot Points (P, R1, R2, S1, S2) and key
 * horizontal Support and Resistance levels from candle data.
 *
 * Classical Daily Pivot Formulas:
 * Pivot (P) = (High + Low + Close) / 3
 * Resistance 1 (R1) = (2 * P) - Low
 * Support 1 (S1) = (2 * P) - High
 * Resistance 2 (R2) = P + (High - Low)
 * Support 2 (S2) = P - (High - Low)
 */
export function calculatePivotLevels(candles: Candle[]): PivotPointsResult | null {
  if (!candles || candles.length < 2) return null;

  // Group candles by calendar date (UTC)
  const daysMap = new Map<string, { high: number; low: number; close: number; open: number }>();
  const dateKeys: string[] = [];

  for (const c of candles) {
    const d = new Date(c.time * 1000).toISOString().split('T')[0];
    if (!daysMap.has(d)) {
      daysMap.set(d, { high: c.high, low: c.low, close: c.close, open: c.open });
      dateKeys.push(d);
    } else {
      const existing = daysMap.get(d)!;
      if (c.high > existing.high) existing.high = c.high;
      if (c.low < existing.low) existing.low = c.low;
      existing.close = c.close; // Latest close of that day
    }
  }

  let prevHigh = 0;
  let prevLow = 0;
  let prevClose = 0;
  let referenceDay = '';

  if (dateKeys.length >= 2) {
    // We have at least two calendar days; use the prior completed day
    const prevDateKey = dateKeys[dateKeys.length - 2];
    const prevDayData = daysMap.get(prevDateKey)!;
    prevHigh = prevDayData.high;
    prevLow = prevDayData.low;
    prevClose = prevDayData.close;
    referenceDay = prevDateKey;
  } else {
    // Single day or compact timeframe; calculate over the first 70% of available candles
    const lookback = Math.max(1, Math.floor(candles.length * 0.7));
    const sample = candles.slice(0, lookback);
    prevHigh = Math.max(...sample.map((c) => c.high));
    prevLow = Math.min(...sample.map((c) => c.low));
    prevClose = sample[sample.length - 1].close;
    referenceDay = dateKeys[0] || 'Previous Session';
  }

  // Prevent zero or negative ranges
  if (prevHigh <= prevLow || prevLow <= 0) {
    const last = candles[candles.length - 1];
    prevHigh = last.high * 1.02;
    prevLow = last.low * 0.98;
    prevClose = last.close;
  }

  // Classical Pivot Point Formulas
  const P = (prevHigh + prevLow + prevClose) / 3;
  const R1 = 2 * P - prevLow;
  const S1 = 2 * P - prevHigh;
  const R2 = P + (prevHigh - prevLow);
  const S2 = P - (prevHigh - prevLow);

  const levels: PivotLevel[] = [
    {
      id: 'r2',
      name: 'R2',
      type: 'resistance',
      price: R2,
      color: '#f43f5e', // rose-500
      bgColor: 'rgba(244, 63, 94, 0.25)',
      textColor: '#fda4af',
      description: 'Major Daily Resistance 2',
    },
    {
      id: 'r1',
      name: 'R1',
      type: 'resistance',
      price: R1,
      color: '#fb7185', // rose-400
      bgColor: 'rgba(251, 113, 133, 0.22)',
      textColor: '#fecdd3',
      description: 'Daily Resistance 1',
    },
    {
      id: 'pivot',
      name: 'P',
      type: 'pivot',
      price: P,
      color: '#eab308', // amber-500
      bgColor: 'rgba(234, 179, 8, 0.25)',
      textColor: '#fef08a',
      description: 'Daily Central Pivot Point',
    },
    {
      id: 's1',
      name: 'S1',
      type: 'support',
      price: S1,
      color: '#34d399', // emerald-400
      bgColor: 'rgba(52, 211, 153, 0.22)',
      textColor: '#a7f3d0',
      description: 'Daily Support 1',
    },
    {
      id: 's2',
      name: 'S2',
      type: 'support',
      price: S2,
      color: '#10b981', // emerald-500
      bgColor: 'rgba(16, 185, 129, 0.25)',
      textColor: '#6ee7b7',
      description: 'Major Daily Support 2',
    },
  ];

  return {
    levels,
    referenceDay,
    prevHigh,
    prevLow,
    prevClose,
    pivotPrice: P,
  };
}
