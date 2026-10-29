import { describe, it, expect } from 'vitest';
import { calculateFibLevels, FIB_RATIOS } from '../../client/utils/fibonacci';

describe('calculateFibLevels', () => {
  it('calculates standard retracement levels between swing low and swing high', () => {
    const p1 = 100;
    const p2 = 200;
    const levels = calculateFibLevels(p1, p2);

    expect(levels).toHaveLength(FIB_RATIOS.length);

    const level0 = levels.find((l) => l.ratio === 0.0);
    const level236 = levels.find((l) => l.ratio === 0.236);
    const level382 = levels.find((l) => l.ratio === 0.382);
    const level500 = levels.find((l) => l.ratio === 0.5);
    const level618 = levels.find((l) => l.ratio === 0.618);
    const level786 = levels.find((l) => l.ratio === 0.786);
    const level1000 = levels.find((l) => l.ratio === 1.0);

    expect(level0?.price).toBeCloseTo(200);
    expect(level236?.price).toBeCloseTo(176.4);
    expect(level382?.price).toBeCloseTo(161.8);
    expect(level500?.price).toBeCloseTo(150.0);
    expect(level618?.price).toBeCloseTo(138.2);
    expect(level786?.price).toBeCloseTo(121.4);
    expect(level1000?.price).toBeCloseTo(100.0);
  });

  it('marks key levels 0.382, 0.5, and 0.618 properly', () => {
    const levels = calculateFibLevels(50, 100);
    const keyLevels = levels.filter((l) => l.isKey);

    expect(keyLevels.map((l) => l.ratio)).toEqual([0.382, 0.5, 0.618]);

    const golden = levels.find((l) => l.isGoldenPocket);
    expect(golden?.ratio).toBe(0.618);
  });

  it('works correctly for downtrend retracements (swing high to swing low)', () => {
    const p1 = 300;
    const p2 = 100;
    const levels = calculateFibLevels(p1, p2);

    // diff = 100 - 300 = -200
    // level = 100 - ratio * (-200) = 100 + ratio * 200
    const level0 = levels.find((l) => l.ratio === 0.0);
    const level500 = levels.find((l) => l.ratio === 0.5);
    const level618 = levels.find((l) => l.ratio === 0.618);
    const level1000 = levels.find((l) => l.ratio === 1.0);

    expect(level0?.price).toBeCloseTo(100);
    expect(level500?.price).toBeCloseTo(200);
    expect(level618?.price).toBeCloseTo(223.6);
    expect(level1000?.price).toBeCloseTo(300);
  });
});
