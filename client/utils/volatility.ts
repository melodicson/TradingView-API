import type { Candle } from '../types';

export interface VolatilityMetrics {
  atr14: number;
  atrPct: number;
  noiseLevel: 'Low' | 'Moderate' | 'Elevated' | 'Extreme';
  noiseColor: string;
  noiseBg: string;
  noiseBorder: string;
  isExpanding: boolean;
  trueRanges: number[];
  avgTrueRange: number;
}

/**
 * Calculates 14-period Average True Range (ATR) across the last 14 bars
 * to gauge current market noise and volatility.
 */
export function calculateATR14(
  candles: Candle[],
  currentPrice?: number
): VolatilityMetrics | null {
  if (!candles || candles.length < 2) return null;

  // Compute True Range (TR) for each candle
  // TR = max(high - low, abs(high - prevClose), abs(low - prevClose))
  const trList: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const cur = candles[i];
    if (i === 0) {
      trList.push(cur.high - cur.low);
    } else {
      const prev = candles[i - 1];
      const tr = Math.max(
        cur.high - cur.low,
        Math.abs(cur.high - prev.close),
        Math.abs(cur.low - prev.close)
      );
      trList.push(tr);
    }
  }

  const period = 14;
  const price = currentPrice || candles[candles.length - 1].close || 1;

  if (trList.length < period) {
    const simpleAvg = trList.reduce((acc, v) => acc + v, 0) / trList.length;
    const atrPct = (simpleAvg / price) * 100;
    return {
      atr14: simpleAvg,
      atrPct,
      noiseLevel: atrPct > 2.5 ? 'Elevated' : atrPct > 1.2 ? 'Moderate' : 'Low',
      noiseColor: atrPct > 2.5 ? '#f59e0b' : atrPct > 1.2 ? '#38bdf8' : '#10b981',
      noiseBg: atrPct > 2.5 ? 'rgba(245, 158, 11, 0.1)' : atrPct > 1.2 ? 'rgba(56, 189, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)',
      noiseBorder: atrPct > 2.5 ? 'rgba(245, 158, 11, 0.3)' : atrPct > 1.2 ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)',
      isExpanding: false,
      trueRanges: trList,
      avgTrueRange: simpleAvg,
    };
  }

  // Standard Wilder's smoothing RMA for ATR(14)
  let currentATR = trList.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let prevATR = currentATR;

  for (let i = period; i < trList.length; i++) {
    prevATR = currentATR;
    currentATR = (currentATR * 13 + trList[i]) / 14;
  }

  const last14TR = trList.slice(-14);
  const atrPct = (currentATR / price) * 100;

  let noiseLevel: 'Low' | 'Moderate' | 'Elevated' | 'Extreme' = 'Moderate';
  let noiseColor = '#38bdf8';
  let noiseBg = 'rgba(56, 189, 248, 0.1)';
  let noiseBorder = 'rgba(56, 189, 248, 0.3)';

  if (atrPct < 0.8) {
    noiseLevel = 'Low';
    noiseColor = '#10b981';
    noiseBg = 'rgba(16, 185, 129, 0.1)';
    noiseBorder = 'rgba(16, 185, 129, 0.3)';
  } else if (atrPct <= 2.0) {
    noiseLevel = 'Moderate';
    noiseColor = '#38bdf8';
    noiseBg = 'rgba(56, 189, 248, 0.1)';
    noiseBorder = 'rgba(56, 189, 248, 0.3)';
  } else if (atrPct <= 3.5) {
    noiseLevel = 'Elevated';
    noiseColor = '#f59e0b';
    noiseBg = 'rgba(245, 158, 11, 0.1)';
    noiseBorder = 'rgba(245, 158, 11, 0.3)';
  } else {
    noiseLevel = 'Extreme';
    noiseColor = '#f43f5e';
    noiseBg = 'rgba(244, 63, 94, 0.1)';
    noiseBorder = 'rgba(244, 63, 94, 0.3)';
  }

  return {
    atr14: currentATR,
    atrPct,
    noiseLevel,
    noiseColor,
    noiseBg,
    noiseBorder,
    isExpanding: currentATR >= prevATR,
    trueRanges: last14TR,
    avgTrueRange: currentATR,
  };
}
