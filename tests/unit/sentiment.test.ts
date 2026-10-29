import { describe, it, expect } from 'vitest';
import { scoreHeadline, aggregateSentiment } from '../../client/utils/sentiment';

describe('scoreHeadline', () => {
  it('correctly scores bullish headlines', () => {
    const res1 = scoreHeadline('Bitcoin surges to new record high as inflows skyrocket');
    expect(res1.sentiment).toBe('Bullish');
    expect(res1.score).toBeGreaterThan(0);

    const res2 = scoreHeadline('NVIDIA stock rallies after massive earnings beat');
    expect(res2.sentiment).toBe('Bullish');
    expect(res2.score).toBeGreaterThan(0);
  });

  it('correctly scores bearish headlines', () => {
    const res1 = scoreHeadline('Tech stocks plunge amid heavy selloff and recession fears');
    expect(res1.sentiment).toBe('Bearish');
    expect(res1.score).toBeLessThan(0);

    const res2 = scoreHeadline('Tesla drops as deliveries miss expectations');
    expect(res2.sentiment).toBe('Bearish');
    expect(res2.score).toBeLessThan(0);
  });

  it('handles negation correctly', () => {
    // "not bullish" or "failed to rally"
    const res = scoreHeadline('Market failed to rally despite optimism');
    expect(res.sentiment).toBe('Bearish');
    expect(res.score).toBeLessThanOrEqual(0);
  });

  it('scores neutral headlines as Neutral', () => {
    const res = scoreHeadline('Federal Reserve schedules regular monetary policy meeting');
    expect(res.sentiment).toBe('Neutral');
    expect(res.score).toBe(0);
  });
});

describe('aggregateSentiment', () => {
  it('produces a normalized 0-100 score and proper labels', () => {
    const headlines = [
      { title: 'Bitcoin surges past resistance with strong momentum', source: 'CoinDesk' },
      { title: 'Institutional crypto adoption expands rapidly', source: 'Bloomberg' },
      { title: 'Bitcoin rally continues as bulls take control', source: 'Reuters' },
    ];

    const result = aggregateSentiment('BINANCE:BTCUSDT', 'Bitcoin', headlines, { value: 65, classification: 'Greed' });
    expect(result.normalizedScore).toBeGreaterThan(60);
    expect(['Bullish', 'Very Bullish']).toContain(result.label);
    expect(result.bullishPct).toBeGreaterThan(50);
    expect(result.articleCount).toBe(3);
  });

  it('handles predominantly bearish news', () => {
    const headlines = [
      { title: 'Stocks plunge on grim inflation warnings', source: 'WSJ' },
      { title: 'Heavy selloff triggers market crash alarms', source: 'CNBC' },
      { title: 'Shares slump as revenue slides to record low', source: 'Financial Times' },
    ];

    const result = aggregateSentiment('NASDAQ:AAPL', 'Apple', headlines, null);
    expect(result.normalizedScore).toBeLessThan(40);
    expect(['Bearish', 'Very Bearish']).toContain(result.label);
    expect(result.bearishPct).toBeGreaterThan(50);
  });
});
