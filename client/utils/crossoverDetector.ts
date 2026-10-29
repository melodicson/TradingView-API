import type { Candle, Indicators, PriceAlertConfig, ToastAlert } from '../types';

interface AlertState {
  lastDirection: 'above' | 'below' | 'neutral';
  lastCrossTime: number;
}

const stateMap: Record<string, AlertState> = {};

export function checkIndicatorCrossovers(
  symbol: string,
  candles: Candle[],
  indicators: Indicators | null,
  currentPrice: number,
  config: PriceAlertConfig
): ToastAlert[] {
  if (!config.enabled || !indicators || candles.length < 25) {
    return [];
  }

  const alerts: ToastAlert[] = [];
  const currIdx = candles.length - 1;
  const prevIdx = currIdx - 1;

  const prevCandle = candles[prevIdx];
  const currCandle = candles[currIdx];

  // Price points to compare
  const prevPrice = prevCandle.close;
  const effectiveCurrPrice = currentPrice || currCandle.close;

  const indicatorsToCheck: ('EMA20' | 'SMA20')[] = [];
  if (config.indicator === 'EMA20' || config.indicator === 'BOTH') {
    indicatorsToCheck.push('EMA20');
  }
  if (config.indicator === 'SMA20' || config.indicator === 'BOTH') {
    indicatorsToCheck.push('SMA20');
  }

  for (const ind of indicatorsToCheck) {
    const series = ind === 'EMA20' ? indicators.ema20 : indicators.sma20;
    const prevIndVal = series[prevIdx];
    const currIndVal = series[currIdx];

    if (prevIndVal === null || currIndVal === null) continue;

    const stateKey = `${symbol}_${ind}`;
    if (!stateMap[stateKey]) {
      stateMap[stateKey] = {
        lastDirection: prevPrice >= prevIndVal ? 'above' : 'below',
        lastCrossTime: 0,
      };
    }

    const currentState = stateMap[stateKey];
    const isAboveNow = effectiveCurrPrice > currIndVal;
    const wasAboveBefore = prevPrice >= prevIndVal;

    const now = Date.now();
    // Throttle duplicate alerts within 20 seconds
    const throttleMs = 20_000;

    // Condition 1: Bullish Cross Above
    if ((!wasAboveBefore || currentState.lastDirection === 'below') && isAboveNow) {
      if (config.direction === 'both' || config.direction === 'above') {
        if (now - currentState.lastCrossTime > throttleMs) {
          currentState.lastDirection = 'above';
          currentState.lastCrossTime = now;

          alerts.push({
            id: `alert-${symbol}-${ind}-above-${now}`,
            symbol,
            indicator: ind,
            direction: 'cross_above',
            currentPrice: effectiveCurrPrice,
            indicatorValue: currIndVal,
            timestamp: now,
            message: `${symbol} Price ($${effectiveCurrPrice.toFixed(2)}) crossed ABOVE ${ind} ($${currIndVal.toFixed(2)})`,
          });
        }
      } else {
        currentState.lastDirection = 'above';
      }
    }
    // Condition 2: Bearish Cross Below
    else if ((wasAboveBefore || currentState.lastDirection === 'above') && !isAboveNow) {
      if (config.direction === 'both' || config.direction === 'below') {
        if (now - currentState.lastCrossTime > throttleMs) {
          currentState.lastDirection = 'below';
          currentState.lastCrossTime = now;

          alerts.push({
            id: `alert-${symbol}-${ind}-below-${now}`,
            symbol,
            indicator: ind,
            direction: 'cross_below',
            currentPrice: effectiveCurrPrice,
            indicatorValue: currIndVal,
            timestamp: now,
            message: `${symbol} Price ($${effectiveCurrPrice.toFixed(2)}) crossed BELOW ${ind} ($${currIndVal.toFixed(2)})`,
          });
        }
      } else {
        currentState.lastDirection = 'below';
      }
    }
  }

  return alerts;
}
