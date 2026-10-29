import type { Candle } from '../types';

export interface VolumeProfileBin {
  binIndex: number;
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  isPoc: boolean;
  isValueArea: boolean;
}

export interface VolumeProfileResult {
  bins: VolumeProfileBin[];
  pocBin: VolumeProfileBin | null;
  pocPrice: number;
  vahPrice: number; // Value Area High (70%)
  valPrice: number; // Value Area Low (70%)
  totalVolume: number;
  maxBinVolume: number;
}

/**
 * Calculates Volume Profile Visible Range (VPVR) across the price series.
 * Distributes trading volume into horizontal price tiers to identify
 * Point of Control (POC), Value Area (VAH/VAL), and high-liquidity S/R zones.
 */
export function calculateVolumeProfile(
  candles: Candle[],
  numBins = 28,
  valueAreaRatio = 0.7
): VolumeProfileResult | null {
  if (!candles || candles.length < 2) return null;

  let minP = Infinity;
  let maxP = -Infinity;

  for (const c of candles) {
    if (c.low < minP) minP = c.low;
    if (c.high > maxP) maxP = c.high;
  }

  const range = maxP - minP;
  if (range <= 0 || !isFinite(range)) return null;

  const binStep = range / numBins;

  // Initialize bins
  const bins: VolumeProfileBin[] = [];
  for (let b = 0; b < numBins; b++) {
    const pLow = minP + b * binStep;
    const pHigh = pLow + binStep;
    bins.push({
      binIndex: b,
      priceLow: pLow,
      priceHigh: pHigh,
      priceMid: (pLow + pHigh) / 2,
      buyVolume: 0,
      sellVolume: 0,
      totalVolume: 0,
      isPoc: false,
      isValueArea: false,
    });
  }

  let totalVol = 0;

  // Distribute each candle's volume across intersected price bins
  for (const c of candles) {
    const cLow = c.low;
    const cHigh = c.high;
    const cRange = cHigh - cLow;
    const vol = c.volume || 0;
    if (vol <= 0) continue;

    totalVol += vol;
    const isBullish = c.close >= c.open;

    if (cRange <= 0.000001) {
      // Pinpoint single bin
      const bIdx = Math.min(numBins - 1, Math.max(0, Math.floor((c.close - minP) / binStep)));
      if (isBullish) {
        bins[bIdx].buyVolume += vol;
      } else {
        bins[bIdx].sellVolume += vol;
      }
      bins[bIdx].totalVolume += vol;
      continue;
    }

    // Allocate volume proportionally across overlapped bins
    for (let b = 0; b < numBins; b++) {
      const bin = bins[b];
      const overlapLow = Math.max(cLow, bin.priceLow);
      const overlapHigh = Math.min(cHigh, bin.priceHigh);

      if (overlapHigh > overlapLow) {
        const overlapRatio = (overlapHigh - overlapLow) / cRange;
        const binVol = vol * overlapRatio;

        if (isBullish) {
          bin.buyVolume += binVol;
        } else {
          bin.sellVolume += binVol;
        }
        bin.totalVolume += binVol;
      }
    }
  }

  // Find POC (Point of Control): Bin with highest traded volume
  let maxBinVolume = 0;
  let pocIndex = 0;

  for (let b = 0; b < numBins; b++) {
    if (bins[b].totalVolume > maxBinVolume) {
      maxBinVolume = bins[b].totalVolume;
      pocIndex = b;
    }
  }

  if (bins[pocIndex]) {
    bins[pocIndex].isPoc = true;
  }

  // Determine Value Area (70% of total volume around POC)
  const targetVaVolume = totalVol * valueAreaRatio;
  let accumulatedVol = bins[pocIndex] ? bins[pocIndex].totalVolume : 0;
  if (bins[pocIndex]) bins[pocIndex].isValueArea = true;

  let upperIdx = pocIndex + 1;
  let lowerIdx = pocIndex - 1;

  while (accumulatedVol < targetVaVolume && (upperIdx < numBins || lowerIdx >= 0)) {
    const upperVol = upperIdx < numBins ? bins[upperIdx].totalVolume : -1;
    const lowerVol = lowerIdx >= 0 ? bins[lowerIdx].totalVolume : -1;

    if (upperVol >= lowerVol && upperIdx < numBins) {
      accumulatedVol += bins[upperIdx].totalVolume;
      bins[upperIdx].isValueArea = true;
      upperIdx++;
    } else if (lowerIdx >= 0) {
      accumulatedVol += bins[lowerIdx].totalVolume;
      bins[lowerIdx].isValueArea = true;
      lowerIdx--;
    } else if (upperIdx < numBins) {
      accumulatedVol += bins[upperIdx].totalVolume;
      bins[upperIdx].isValueArea = true;
      upperIdx++;
    } else {
      break;
    }
  }

  // Find Value Area High (VAH) & Value Area Low (VAL)
  let valPrice = minP;
  let vahPrice = maxP;

  for (let b = 0; b < numBins; b++) {
    if (bins[b].isValueArea) {
      valPrice = bins[b].priceLow;
      break;
    }
  }

  for (let b = numBins - 1; b >= 0; b--) {
    if (bins[b].isValueArea) {
      vahPrice = bins[b].priceHigh;
      break;
    }
  }

  return {
    bins,
    pocBin: bins[pocIndex] || null,
    pocPrice: bins[pocIndex] ? bins[pocIndex].priceMid : (minP + maxP) / 2,
    vahPrice,
    valPrice,
    totalVolume: totalVol,
    maxBinVolume: maxBinVolume || 1,
  };
}
