import type { Candle } from '../types';

export interface DivergencePattern {
  id: string;
  kind: 'bullish' | 'bearish';
  prevBar: number;
  curBar: number;
  prevPrice: number;
  curPrice: number;
  prevRsi: number;
  curRsi: number;
}

export function detectRsiDivergences(
  candles: Candle[],
  rsiValues: (number | null)[] | undefined,
  lookback = 3,
  minDistance = 4,
  maxDistance = 45
): DivergencePattern[] {
  if (!candles || !rsiValues || candles.length < 20 || rsiValues.length < 20) {
    return [];
  }

  const divergences: DivergencePattern[] = [];

  // Helper to find swing pivots on a series
  const findPivots = (
    values: number[],
    kind: 'low' | 'high'
  ): { bar: number; val: number }[] => {
    const pivots: { bar: number; val: number }[] = [];
    for (let p = lookback; p < values.length - lookback; p++) {
      const v = values[p];
      let isPivot = true;
      for (let j = p - lookback; isPivot && j <= p + lookback; j++) {
        if (j === p) continue;
        if (kind === 'low' && values[j] < v) isPivot = false;
        if (kind === 'high' && values[j] > v) isPivot = false;
      }
      if (isPivot) {
        pivots.push({ bar: p, val: v });
      }
    }
    return pivots;
  };

  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);

  // 1. Scan for Bullish Divergence (Price Lower Low + RSI Higher Low)
  const lowPivots = findPivots(lows, 'low');
  for (let k = 1; k < lowPivots.length; k++) {
    const prev = lowPivots[k - 1];
    const cur = lowPivots[k];
    const dist = cur.bar - prev.bar;
    if (dist < minDistance || dist > maxDistance) continue;

    const prevRsi = rsiValues[prev.bar];
    const curRsi = rsiValues[cur.bar];

    if (
      prevRsi !== null &&
      curRsi !== null &&
      prevRsi !== undefined &&
      curRsi !== undefined
    ) {
      // Bullish regular divergence: Price Lower Low, but RSI Higher Low
      // (RSI typically in oversold or lower half: prevRsi < 55)
      if (cur.val < prev.val && curRsi > prevRsi && prevRsi < 60) {
        divergences.push({
          id: `bull-div-${prev.bar}-${cur.bar}`,
          kind: 'bullish',
          prevBar: prev.bar,
          curBar: cur.bar,
          prevPrice: prev.val,
          curPrice: cur.val,
          prevRsi,
          curRsi,
        });
      }
    }
  }

  // 2. Scan for Bearish Divergence (Price Higher High + RSI Lower High)
  const highPivots = findPivots(highs, 'high');
  for (let k = 1; k < highPivots.length; k++) {
    const prev = highPivots[k - 1];
    const cur = highPivots[k];
    const dist = cur.bar - prev.bar;
    if (dist < minDistance || dist > maxDistance) continue;

    const prevRsi = rsiValues[prev.bar];
    const curRsi = rsiValues[cur.bar];

    if (
      prevRsi !== null &&
      curRsi !== null &&
      prevRsi !== undefined &&
      curRsi !== undefined
    ) {
      // Bearish regular divergence: Price Higher High, but RSI Lower High
      // (RSI typically in overbought or upper half: prevRsi > 40)
      if (cur.val > prev.val && curRsi < prevRsi && prevRsi > 40) {
        divergences.push({
          id: `bear-div-${prev.bar}-${cur.bar}`,
          kind: 'bearish',
          prevBar: prev.bar,
          curBar: cur.bar,
          prevPrice: prev.val,
          curPrice: cur.val,
          prevRsi,
          curRsi,
        });
      }
    }
  }

  return divergences;
}
