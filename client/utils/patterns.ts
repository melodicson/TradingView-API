import type { Candle } from '../types';

export type PatternType = 'bullish' | 'bearish' | 'neutral';

export interface CandlePatternMatch {
  id: string;
  barIndex: number;
  name: string;
  shortLabel: string;
  type: PatternType;
  time: number;
  price: number; // Anchor price for badge placement (high or low)
  candle: Candle;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

/**
 * Recognizes classic candlestick patterns (Engulfing, Doji, Hammer, Shooting Star, etc.)
 * across the specified recent bars (default: last 5 bars).
 */
export function detectCandlePatterns(
  candles: Candle[],
  scanWindow = 5
): CandlePatternMatch[] {
  if (!candles || candles.length < 2) return [];

  const matches: CandlePatternMatch[] = [];
  const startIdx = Math.max(1, candles.length - scanWindow);

  for (let i = startIdx; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    const curRange = cur.high - cur.low;
    const curBody = Math.abs(cur.close - cur.open);
    const curUpperWick = cur.high - Math.max(cur.open, cur.close);
    const curLowerWick = Math.min(cur.open, cur.close) - cur.low;

    const prevBody = Math.abs(prev.close - prev.open);
    const prevIsGreen = prev.close >= prev.open;
    const curIsGreen = cur.close >= cur.open;

    // Minimum range threshold to avoid division by zero or meaningless micro-ticks
    if (curRange <= 0.000001) continue;

    const bodyToRangeRatio = curBody / curRange;

    // 1. DOJI PATTERN: Body is extremely thin (< 10% of total range)
    if (bodyToRangeRatio <= 0.1) {
      matches.push({
        id: `doji-${i}`,
        barIndex: i,
        name: 'Doji',
        shortLabel: 'Doji',
        type: 'neutral',
        time: cur.time,
        price: cur.high,
        candle: cur,
        description: 'Market indecision: buyers and sellers in equilibrium',
        color: '#94a3b8',
        bgColor: 'rgba(51, 65, 85, 0.9)',
        textColor: '#f1f5f9',
        icon: '⚖️',
      });
      continue; // Move to next bar
    }

    // 2. BULLISH ENGULFING: Prior bar bearish, current bar bullish engulfing prior body
    if (
      !prevIsGreen &&
      curIsGreen &&
      cur.open <= prev.close &&
      cur.close >= prev.open &&
      curBody >= prevBody * 0.95 &&
      prevBody > 0
    ) {
      matches.push({
        id: `bull-engulf-${i}`,
        barIndex: i,
        name: 'Bullish Engulfing',
        shortLabel: 'Bull Engulf',
        type: 'bullish',
        time: cur.time,
        price: cur.low,
        candle: cur,
        description: 'Strong bullish reversal: buyers overpowered sellers',
        color: '#10b981',
        bgColor: 'rgba(6, 78, 59, 0.92)',
        textColor: '#6ee7b7',
        icon: '⚡',
      });
      continue;
    }

    // 3. BEARISH ENGULFING: Prior bar bullish, current bar bearish engulfing prior body
    if (
      prevIsGreen &&
      !curIsGreen &&
      cur.open >= prev.close &&
      cur.close <= prev.open &&
      curBody >= prevBody * 0.95 &&
      prevBody > 0
    ) {
      matches.push({
        id: `bear-engulf-${i}`,
        barIndex: i,
        name: 'Bearish Engulfing',
        shortLabel: 'Bear Engulf',
        type: 'bearish',
        time: cur.time,
        price: cur.high,
        candle: cur,
        description: 'Strong bearish reversal: sellers overpowered buyers',
        color: '#f43f5e',
        bgColor: 'rgba(136, 19, 55, 0.92)',
        textColor: '#fda4af',
        icon: '⚡',
      });
      continue;
    }

    // 4. HAMMER: Small body at the top, long lower wick (>= 2x body), minimal upper wick (<= 0.25x body)
    if (
      curLowerWick >= curBody * 2 &&
      curUpperWick <= curBody * 0.35 &&
      bodyToRangeRatio >= 0.15 &&
      bodyToRangeRatio <= 0.45
    ) {
      matches.push({
        id: `hammer-${i}`,
        barIndex: i,
        name: 'Hammer',
        shortLabel: 'Hammer',
        type: 'bullish',
        time: cur.time,
        price: cur.low,
        candle: cur,
        description: 'Bullish rejection: sellers pushed price down but buyers pushed it back up',
        color: '#10b981',
        bgColor: 'rgba(6, 78, 59, 0.92)',
        textColor: '#6ee7b7',
        icon: '🔨',
      });
      continue;
    }

    // 5. SHOOTING STAR / INVERTED HAMMER: Small body at bottom, long upper wick (>= 2x body), minimal lower wick
    if (
      curUpperWick >= curBody * 2 &&
      curLowerWick <= curBody * 0.35 &&
      bodyToRangeRatio >= 0.15 &&
      bodyToRangeRatio <= 0.45
    ) {
      const isShootingStar = !curIsGreen || i > 0 && cur.close > prev.close;
      matches.push({
        id: `shooting-star-${i}`,
        barIndex: i,
        name: isShootingStar ? 'Shooting Star' : 'Inverted Hammer',
        shortLabel: isShootingStar ? 'Shooting Star' : 'Inv Hammer',
        type: isShootingStar ? 'bearish' : 'bullish',
        time: cur.time,
        price: cur.high,
        candle: cur,
        description: isShootingStar
          ? 'Bearish rejection: buyers rallied price but sellers slammed it down'
          : 'Potential bullish reversal attempt at support',
        color: isShootingStar ? '#f43f5e' : '#38bdf8',
        bgColor: isShootingStar ? 'rgba(136, 19, 55, 0.92)' : 'rgba(12, 74, 110, 0.92)',
        textColor: isShootingStar ? '#fda4af' : '#7dd3fc',
        icon: isShootingStar ? '🌠' : '🔺',
      });
      continue;
    }
  }

  return matches;
}
