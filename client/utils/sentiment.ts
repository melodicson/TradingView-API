import type { MarketSentimentData, NewsHeadline } from '../types';

export const FINANCIAL_LEXICON = {
  bullish: [
    'surge', 'surges', 'surging', 'surged', 'soar', 'soars', 'soaring', 'soared',
    'rally', 'rallies', 'rallying', 'rallied', 'jump', 'jumps', 'jumping', 'jumped',
    'gain', 'gains', 'gaining', 'gained', 'rise', 'rises', 'rising', 'rose',
    'bull', 'bulls', 'bullish', 'breakout', 'breakouts', 'high', 'highs', 'ath',
    'growth', 'grow', 'grows', 'profit', 'profits', 'profitable', 'upgrade', 'upgraded',
    'upgrades', 'beat', 'beats', 'beating', 'outperform', 'outperforms', 'outperformed',
    'accumulate', 'accumulation', 'rebound', 'rebounds', 'rebounding', 'climb', 'climbs',
    'climbing', 'climbed', 'boost', 'boosts', 'boosted', 'boosting', 'positive',
    'expansion', 'momentum', 'strength', 'strong', 'inflow', 'inflows', 'adoption',
    'partnership', 'buy', 'buys', 'buying', 'optimism', 'optimistic', 'upside', 'promising',
    'recover', 'recovers', 'recovery', 'uptrend', 'boom', 'booming',
  ],
  bearish: [
    'plunge', 'plunges', 'plunging', 'plunged', 'slump', 'slumps', 'slumping', 'slumped',
    'crash', 'crashes', 'crashing', 'crashed', 'drop', 'drops', 'dropping', 'dropped',
    'fall', 'falls', 'falling', 'fell', 'bear', 'bears', 'bearish', 'breakdown',
    'low', 'lows', 'loss', 'losses', 'losing', 'lost', 'downgrade', 'downgrades',
    'downgraded', 'miss', 'misses', 'missed', 'missing', 'underperform', 'underperformed',
    'dump', 'dumps', 'dumping', 'dumped', 'selloff', 'selloffs', 'sell-off', 'selling',
    'sold', 'slide', 'slides', 'sliding', 'slid', 'retreat', 'retreats', 'retreating',
    'decline', 'declines', 'declining', 'declined', 'negative', 'weakness', 'weak',
    'warning', 'warns', 'warned', 'fear', 'fears', 'recession', 'outflow', 'outflows',
    'investigation', 'lawsuit', 'hack', 'hacked', 'risk', 'risks', 'risky', 'pessimism',
    'pessimistic', 'downside', 'struggle', 'struggles', 'struggling', 'downtrend',
    'fail', 'fails', 'failed', 'failure',
  ],
  intensifiers: ['huge', 'massive', 'sharp', 'steep', 'historic', 'major', 'heavy', 'explosive', 'record'],
  negations: ['not', 'no', 'never', 'fail', 'failed', 'fails', 'failing', 'unable', 'despite'],
};

/**
 * Computes sentiment score (-1 to +1) for a single news title/text
 */
export function scoreHeadline(title: string): { score: number; sentiment: 'Bullish' | 'Bearish' | 'Neutral' } {
  const clean = title.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);

  let bullCount = 0;
  let bearCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const prev2Word = i > 1 ? words[i - 2] : '';
    const isNegated =
      FINANCIAL_LEXICON.negations.includes(prevWord) ||
      (FINANCIAL_LEXICON.negations.includes(prev2Word) && (prevWord === 'to' || prevWord === 'a' || prevWord === 'the'));
    const isIntensified =
      (i > 0 && FINANCIAL_LEXICON.intensifiers.includes(prevWord)) ||
      (i > 1 && FINANCIAL_LEXICON.intensifiers.includes(prev2Word) && prevWord === 'a');
    const weight = isIntensified ? 1.5 : 1.0;

    if (FINANCIAL_LEXICON.bullish.includes(word)) {
      if (isNegated) {
        bearCount += weight;
      } else {
        bullCount += weight;
      }
    } else if (FINANCIAL_LEXICON.bearish.includes(word)) {
      if (isNegated) {
        bullCount += weight;
      } else {
        bearCount += weight;
      }
    }
  }

  const total = bullCount + bearCount;
  if (total === 0) {
    return { score: 0, sentiment: 'Neutral' };
  }

  const rawScore = (bullCount - bearCount) / total;
  const clamped = Math.max(-1, Math.min(1, rawScore));

  if (clamped >= 0.15) {
    return { score: Number(clamped.toFixed(2)), sentiment: 'Bullish' };
  }
  if (clamped <= -0.15) {
    return { score: Number(clamped.toFixed(2)), sentiment: 'Bearish' };
  }
  return { score: Number(clamped.toFixed(2)), sentiment: 'Neutral' };
}

/**
 * Aggregates headline scores into a comprehensive MarketSentimentData object
 */
export function aggregateSentiment(
  symbol: string,
  symbolName: string,
  headlines: { title: string; source: string; url?: string; publishedAt?: string }[],
  fearAndGreed?: { value: number; classification: string } | null
): MarketSentimentData {
  const scoredHeadlines: NewsHeadline[] = headlines.map((h) => {
    const scored = scoreHeadline(h.title);
    return {
      title: h.title,
      source: h.source || 'News Feed',
      url: h.url,
      publishedAt: h.publishedAt,
      score: scored.score,
      sentiment: scored.sentiment,
    };
  });

  const totalArticles = scoredHeadlines.length;
  let bullCount = 0;
  let bearCount = 0;
  let totalScoreSum = 0;

  scoredHeadlines.forEach((h) => {
    if (h.sentiment === 'Bullish') bullCount++;
    else if (h.sentiment === 'Bearish') bearCount++;
    totalScoreSum += h.score;
  });

  // Calculate base score from news (-100 to +100)
  const newsScore = totalArticles > 0 ? (totalScoreSum / totalArticles) * 100 : 0;

  // If Fear & Greed is available (0 to 100), blend it with 25% weight
  let finalScore = newsScore;
  if (fearAndGreed && !isNaN(fearAndGreed.value)) {
    // F&G 50 is neutral, 0 is -100, 100 is +100
    const fgNormalized = (fearAndGreed.value - 50) * 2;
    finalScore = newsScore * 0.75 + fgNormalized * 0.25;
  }

  // Clamped -100 to +100
  const rawScore = Math.round(Math.max(-100, Math.min(100, finalScore)));
  // Normalized 0 to 100 (50 is neutral)
  const normalizedScore = Math.round(Math.max(0, Math.min(100, (rawScore + 100) / 2)));

  const bullPct = totalArticles > 0 ? Math.round((bullCount / totalArticles) * 100) : 50;
  const bearPct = totalArticles > 0 ? Math.round((bearCount / totalArticles) * 100) : 30;
  const neutPct = Math.max(0, 100 - bullPct - bearPct);

  let label: 'Very Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Very Bearish' = 'Neutral';
  let color = '#94a3b8';
  let bgColor = 'rgba(148, 163, 184, 0.1)';
  let borderColor = 'rgba(148, 163, 184, 0.3)';

  if (normalizedScore >= 72) {
    label = 'Very Bullish';
    color = '#10b981';
    bgColor = 'rgba(16, 185, 129, 0.12)';
    borderColor = 'rgba(16, 185, 129, 0.35)';
  } else if (normalizedScore >= 56) {
    label = 'Bullish';
    color = '#34d399';
    bgColor = 'rgba(52, 211, 153, 0.1)';
    borderColor = 'rgba(52, 211, 153, 0.3)';
  } else if (normalizedScore <= 28) {
    label = 'Very Bearish';
    color = '#f43f5e';
    bgColor = 'rgba(244, 63, 94, 0.12)';
    borderColor = 'rgba(244, 63, 94, 0.35)';
  } else if (normalizedScore <= 44) {
    label = 'Bearish';
    color = '#fb7185';
    bgColor = 'rgba(251, 113, 133, 0.1)';
    borderColor = 'rgba(251, 113, 133, 0.3)';
  } else {
    label = 'Neutral';
    color = '#38bdf8';
    bgColor = 'rgba(56, 189, 248, 0.1)';
    borderColor = 'rgba(56, 189, 248, 0.3)';
  }

  return {
    symbol,
    name: symbolName,
    score: rawScore,
    normalizedScore,
    label,
    color,
    bgColor,
    borderColor,
    bullishPct: bullPct,
    bearishPct: bearPct,
    neutralPct: neutPct,
    articleCount: totalArticles,
    articles: scoredHeadlines,
    fearAndGreed,
    timestamp: Date.now(),
    source: 'live',
  };
}
