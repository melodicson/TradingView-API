import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

// Import TradingView API library modules directly
import {
  getCandles,
  getQuote,
  getQuotes,
  searchMarkets,
  getTechnicalAnalysis,
  getScreener,
} from './src/index.js';

import {
  simulate,
  computeMetrics,
  sma,
  ema,
  rsi,
  atr,
  defaultExits,
  rsiDivergence,
  type Candle,
  type Signal,
} from './src/backtest/index.js';

import { aggregateSentiment } from './client/utils/sentiment.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Helper for generating deterministic mock candles if live network is unreachable
function generateFallbackCandles(symbol: string, timeframe: string, count: number): Candle[] {
  const now = Math.floor(Date.now() / 1000);
  let stepSec = 86400; // default 1D
  if (timeframe === '1') stepSec = 60;
  else if (timeframe === '5') stepSec = 300;
  else if (timeframe === '15') stepSec = 900;
  else if (timeframe === '60') stepSec = 3600;
  else if (timeframe === '240') stepSec = 14400;
  else if (timeframe === '1W') stepSec = 604800;

  // Base price by symbol heuristic
  let basePrice = 100;
  if (/BTC/i.test(symbol)) basePrice = 67500;
  else if (/ETH/i.test(symbol)) basePrice = 3450;
  else if (/SOL/i.test(symbol)) basePrice = 175;
  else if (/AAPL/i.test(symbol)) basePrice = 232;
  else if (/TSLA/i.test(symbol)) basePrice = 255;
  else if (/NVDA/i.test(symbol)) basePrice = 142;
  else if (/SPX|SPY/i.test(symbol)) basePrice = 5820;
  else if (/EUR|GBP/i.test(symbol)) basePrice = 1.085;

  const candles: Candle[] = [];
  let currentPrice = basePrice * 0.88;

  for (let i = count; i >= 0; i--) {
    const time = now - i * stepSec;
    // pseudo-random walk
    const variation = (Math.sin(i * 0.3) * 0.015 + (Math.cos(i * 0.7) * 0.012) + (Math.random() - 0.48) * 0.02);
    const open = currentPrice;
    currentPrice = Math.max(0.0001, currentPrice * (1 + variation));
    const close = currentPrice;
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);
    const volume = Math.floor(Math.random() * 10000 + 1000) * (basePrice > 1000 ? 0.1 : 10);

    candles.push({
      time,
      open: Number(open.toFixed(basePrice < 10 ? 4 : 2)),
      high: Number(high.toFixed(basePrice < 10 ? 4 : 2)),
      low: Number(low.toFixed(basePrice < 10 ? 4 : 2)),
      close: Number(close.toFixed(basePrice < 10 ? 4 : 2)),
      volume: Math.round(volume),
    });
  }
  return candles;
}

// 1. Status route
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    version: '4.1.0',
    library: '@mathieuc/tradingview',
    sessionConfigured: Boolean(process.env.SESSION && process.env.SIGNATURE),
    supportedMarkets: ['crypto', 'america', 'forex', 'global', 'india', 'uk'],
    timestamp: new Date().toISOString(),
  });
});

// 2. Search markets
app.get('/api/search', async (req: Request, res: Response) => {
  const query = String(req.query.q || 'BTC').trim();
  const type = req.query.type ? String(req.query.type) : undefined;
  const exchange = req.query.exchange ? String(req.query.exchange) : undefined;

  try {
    const results = await Promise.race([
      searchMarkets(query, { type: type as any, exchange, timeout: 5000 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 5000)),
    ]);
    res.json({ source: 'live', results });
  } catch (err: any) {
    // Return curated list matching query
    const sampleUniverse = [
      { id: 'BINANCE:BTCUSDT', exchange: 'BINANCE', fullExchange: 'Binance', symbol: 'BTCUSDT', description: 'Bitcoin / TetherUS', type: 'crypto', currency: 'USDT' },
      { id: 'BINANCE:ETHUSDT', exchange: 'BINANCE', fullExchange: 'Binance', symbol: 'ETHUSDT', description: 'Ethereum / TetherUS', type: 'crypto', currency: 'USDT' },
      { id: 'BINANCE:SOLUSDT', exchange: 'BINANCE', fullExchange: 'Binance', symbol: 'SOLUSDT', description: 'Solana / TetherUS', type: 'crypto', currency: 'USDT' },
      { id: 'NASDAQ:AAPL', exchange: 'NASDAQ', fullExchange: 'NASDAQ', symbol: 'AAPL', description: 'Apple Inc.', type: 'stock', currency: 'USD' },
      { id: 'NASDAQ:NVDA', exchange: 'NASDAQ', fullExchange: 'NASDAQ', symbol: 'NVDA', description: 'NVIDIA Corporation', type: 'stock', currency: 'USD' },
      { id: 'NASDAQ:TSLA', exchange: 'NASDAQ', fullExchange: 'NASDAQ', symbol: 'TSLA', description: 'Tesla, Inc.', type: 'stock', currency: 'USD' },
      { id: 'NASDAQ:MSFT', exchange: 'NASDAQ', fullExchange: 'NASDAQ', symbol: 'MSFT', description: 'Microsoft Corporation', type: 'stock', currency: 'USD' },
      { id: 'FOREXCOM:EURUSD', exchange: 'FOREXCOM', fullExchange: 'Forex.com', symbol: 'EURUSD', description: 'Euro / US Dollar', type: 'forex', currency: 'USD' },
      { id: 'FOREXCOM:SPXUSD', exchange: 'FOREXCOM', fullExchange: 'Forex.com', symbol: 'SPXUSD', description: 'S&P 500 Index', type: 'index', currency: 'USD' },
      { id: 'COINBASE:BTCUSD', exchange: 'COINBASE', fullExchange: 'Coinbase', symbol: 'BTCUSD', description: 'Bitcoin / US Dollar', type: 'crypto', currency: 'USD' },
    ];
    const filtered = sampleUniverse.filter(
      (m) => m.id.toUpperCase().includes(query.toUpperCase()) || m.description.toUpperCase().includes(query.toUpperCase())
    );
    res.json({ source: 'fallback', warning: err?.message || 'Upstream search unavailable', results: filtered.length > 0 ? filtered : sampleUniverse.slice(0, 5) });
  }
});

// 3. Quotes (single & multiple)
app.get('/api/quote', async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol || 'BINANCE:BTCUSDT');
  try {
    const data = await Promise.race([
      getQuote(symbol, { timeout: 6000 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Quote timeout')), 6000)),
    ]);
    res.json({ source: 'live', symbol, quote: data });
  } catch (err: any) {
    // Generate fallback quote
    const isCrypto = symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL');
    const price = symbol.includes('BTC') ? 67840 : symbol.includes('ETH') ? 3480 : symbol.includes('AAPL') ? 232.5 : 100;
    res.json({
      source: 'fallback',
      warning: err?.message || 'Live quote timeout',
      symbol,
      quote: {
        lp: price,
        ch: 1.84,
        chp: 0.79,
        open_price: price * 0.992,
        high_price: price * 1.015,
        low_price: price * 0.988,
        prev_close_price: price * 0.992,
        volume: 48920,
        currency_code: isCrypto ? 'USDT' : 'USD',
      },
    });
  }
});

app.get('/api/quotes', async (req: Request, res: Response) => {
  const symbolsParam = String(req.query.symbols || 'BINANCE:BTCUSDT,NASDAQ:AAPL,FOREXCOM:EURUSD,BINANCE:ETHUSDT,NASDAQ:NVDA');
  const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);

  try {
    const data = await Promise.race([
      getQuotes(symbols, { timeout: 7000 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Quotes timeout')), 7000)),
    ]);
    res.json({ source: 'live', quotes: data });
  } catch {
    const mockQuotes: Record<string, any> = {};
    for (const sym of symbols) {
      const base = sym.includes('BTC') ? 67840 : sym.includes('ETH') ? 3480 : sym.includes('AAPL') ? 232.5 : sym.includes('NVDA') ? 141.2 : 100;
      const changePct = ((Math.random() - 0.45) * 4);
      mockQuotes[sym] = {
        lp: Number((base * (1 + changePct / 100)).toFixed(2)),
        ch: Number((base * (changePct / 100)).toFixed(2)),
        chp: Number(changePct.toFixed(2)),
        open_price: Number(base.toFixed(2)),
        high_price: Number((base * 1.018).toFixed(2)),
        low_price: Number((base * 0.985).toFixed(2)),
        prev_close_price: Number(base.toFixed(2)),
        volume: Math.floor(Math.random() * 50000 + 10000),
      };
    }
    res.json({ source: 'fallback', quotes: mockQuotes });
  }
});

// 4. Candles + Indicator calculations
app.get('/api/candles', async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol || 'BINANCE:BTCUSDT');
  const timeframe = String(req.query.timeframe || '1D');
  const count = Math.min(500, Math.max(20, Number(req.query.count) || 120));

  let candleData: Candle[] = [];
  let source: 'live' | 'fallback' = 'live';
  let warning: string | undefined;

  try {
    candleData = await Promise.race([
      getCandles({ symbol, timeframe: timeframe as any, count, timeout: 7000 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Candles request timeout')), 7000)),
    ]);
  } catch (err: any) {
    source = 'fallback';
    warning = err?.message || 'Live candle stream unavailable';
    candleData = generateFallbackCandles(symbol, timeframe, count);
  }

  // Calculate technical indicators on candle data
  const closePrices = candleData.map((c) => c.close);
  const sma20 = sma(closePrices, 20);
  const sma50 = sma(closePrices, 50);
  const ema20 = ema(closePrices, 20);
  const rsi14 = rsi(closePrices, 14);
  const atr14 = atr(candleData, 14);

  const indicators = {
    sma20,
    sma50,
    ema20,
    rsi14,
    atr14,
  };

  res.json({
    source,
    warning,
    symbol,
    timeframe,
    count: candleData.length,
    candles: candleData,
    indicators,
  });
});

// 5. Technical Analysis
app.get('/api/technical-analysis', async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol || 'BINANCE:BTCUSDT');
  try {
    const analysis = await Promise.race([
      getTechnicalAnalysis(symbol, { timeout: 6000 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TA timeout')), 6000)),
    ]);
    res.json({ source: 'live', symbol, analysis });
  } catch (err: any) {
    // Provide standard technical summary
    const periods = ['1', '5', '15', '60', '240', '1D', '1W', '1M'];
    const mockAnalysis: Record<string, { Other: number; All: number; MA: number }> = {};
    periods.forEach((p, idx) => {
      const all = Number((0.2 + (Math.sin(idx) * 0.4)).toFixed(2));
      mockAnalysis[p] = {
        All: all,
        MA: Number((all + 0.1).toFixed(2)),
        Other: Number((all - 0.1).toFixed(2)),
      };
    });
    res.json({ source: 'fallback', warning: err?.message, symbol, analysis: mockAnalysis });
  }
});

// 6. Screener
app.get('/api/screener', async (req: Request, res: Response) => {
  const market = String(req.query.market || 'crypto');
  const columns = ['name', 'close', 'change', 'change_abs', 'volume', 'Recommend.All'];

  try {
    const screener = await Promise.race([
      getScreener({
        market,
        columns,
        range: [0, 25],
        sort: { sortBy: 'volume', sortOrder: 'desc' },
      }, { timeout: 6000 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Screener timeout')), 6000)),
    ]);
    res.json({ source: 'live', market, result: screener });
  } catch (err: any) {
    // Realistic fallback screener items
    const rows = market === 'crypto' ? [
      { symbol: 'BINANCE:BTCUSDT', values: { name: 'BTCUSDT', close: 67840, change: 1.45, change_abs: 970, volume: 450000000, 'Recommend.All': 0.6 } },
      { symbol: 'BINANCE:ETHUSDT', values: { name: 'ETHUSDT', close: 3480, change: 2.15, change_abs: 73, volume: 280000000, 'Recommend.All': 0.5 } },
      { symbol: 'BINANCE:SOLUSDT', values: { name: 'SOLUSDT', close: 178.5, change: 4.8, change_abs: 8.2, volume: 160000000, 'Recommend.All': 0.8 } },
      { symbol: 'BINANCE:BNBUSDT', values: { name: 'BNBUSDT', close: 595, change: -0.3, change_abs: -1.8, volume: 80000000, 'Recommend.All': 0.1 } },
      { symbol: 'BINANCE:DOGEUSDT', values: { name: 'DOGEUSDT', close: 0.142, change: 6.2, change_abs: 0.008, volume: 110000000, 'Recommend.All': 0.7 } },
      { symbol: 'BINANCE:ADAUSDT', values: { name: 'ADAUSDT', close: 0.36, change: -1.2, change_abs: -0.004, volume: 40000000, 'Recommend.All': -0.2 } },
    ] : [
      { symbol: 'NASDAQ:NVDA', values: { name: 'NVDA', close: 141.54, change: 2.4, change_abs: 3.3, volume: 62000000, 'Recommend.All': 0.7 } },
      { symbol: 'NASDAQ:AAPL', values: { name: 'AAPL', close: 232.1, change: 0.8, change_abs: 1.8, volume: 45000000, 'Recommend.All': 0.4 } },
      { symbol: 'NASDAQ:MSFT', values: { name: 'MSFT', close: 428.3, change: -0.4, change_abs: -1.7, volume: 22000000, 'Recommend.All': 0.2 } },
      { symbol: 'NASDAQ:TSLA', values: { name: 'TSLA', close: 258.4, change: 5.1, change_abs: 12.5, volume: 88000000, 'Recommend.All': 0.6 } },
      { symbol: 'NASDAQ:AMZN', values: { name: 'AMZN', close: 188.7, change: 1.1, change_abs: 2.05, volume: 31000000, 'Recommend.All': 0.5 } },
    ];
    res.json({
      source: 'fallback',
      warning: err?.message,
      market,
      result: { totalCount: rows.length, rows },
    });
  }
});

// 7. Market Sentiment & Public News Analysis
interface SentimentCacheItem {
  timestamp: number;
  data: any;
}
const sentimentCache = new Map<string, SentimentCacheItem>();

function generateFallbackNews(name: string, isCrypto: boolean) {
  if (isCrypto) {
    return [
      { title: `${name} sustains upward momentum as institutional spot ETF inflows surge`, source: 'CoinDesk' },
      { title: `Network activity and whale wallet accumulation on ${name} hit 3-month highs`, source: 'Decrypt' },
      { title: `Analysts project breakout for ${name} ahead of upcoming macroeconomic data`, source: 'CoinTelegraph' },
      { title: `${name} market liquidity expands across major centralized exchanges`, source: 'The Block' },
      { title: `Crypto market sentiment remains cautious amid broader interest rate outlook`, source: 'Bloomberg Crypto' },
    ];
  }
  return [
    { title: `${name} gains ground as quarterly earnings guidance outperforms estimates`, source: 'Wall Street Journal' },
    { title: `Institutional investors increase allocations to ${name} on solid fundamentals`, source: 'Barron\'s' },
    { title: `${name} launches product innovation expansion to accelerate revenue growth`, source: 'Bloomberg' },
    { title: `Market volatility eases as ${name} tests key technical resistance level`, source: 'Reuters' },
    { title: `Wall Street analysts reiterate overweight rating on ${name} shares`, source: 'MarketWatch' },
  ];
}

app.get('/api/sentiment', async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol || 'BINANCE:BTCUSDT').trim();

  // Check cache (TTL 2.5 minutes)
  const cached = sentimentCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < 150000) {
    return res.json(cached.data);
  }

  // Derive human-readable name & search keywords
  const isCrypto =
    symbol.includes('BTC') ||
    symbol.includes('ETH') ||
    symbol.includes('SOL') ||
    symbol.includes('DOGE') ||
    symbol.includes('BNB') ||
    symbol.includes('BINANCE') ||
    symbol.includes('COINBASE');

  let cleanName = symbol;
  let searchQuery = symbol;

  if (symbol.includes('BTC')) {
    cleanName = 'Bitcoin';
    searchQuery = 'Bitcoin crypto price news';
  } else if (symbol.includes('ETH')) {
    cleanName = 'Ethereum';
    searchQuery = 'Ethereum crypto price news';
  } else if (symbol.includes('SOL')) {
    cleanName = 'Solana';
    searchQuery = 'Solana crypto price news';
  } else if (symbol.includes('AAPL')) {
    cleanName = 'Apple Inc.';
    searchQuery = 'Apple AAPL stock market news';
  } else if (symbol.includes('NVDA')) {
    cleanName = 'NVIDIA';
    searchQuery = 'NVIDIA NVDA stock market news';
  } else if (symbol.includes('TSLA')) {
    cleanName = 'Tesla';
    searchQuery = 'Tesla TSLA stock market news';
  } else if (symbol.includes('MSFT')) {
    cleanName = 'Microsoft';
    searchQuery = 'Microsoft MSFT stock news';
  } else if (symbol.includes('EURUSD')) {
    cleanName = 'EUR / USD';
    searchQuery = 'EUR USD forex market news';
  } else if (symbol.includes('SPX')) {
    cleanName = 'S&P 500';
    searchQuery = 'S&P 500 stock index news';
  } else {
    const parts = symbol.split(':');
    const ticker = parts[parts.length - 1];
    cleanName = ticker;
    searchQuery = `${ticker} market financial news`;
  }

  try {
    // 1. Fetch live public RSS news headlines
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
    const newsPromise = fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(4500),
    })
      .then(async (r) => {
        if (!r.ok) return [];
        const xml = await r.text();
        const items: { title: string; source: string; url?: string; publishedAt?: string }[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
          const itemContent = match[1];
          const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
          const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
          const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
          const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);

          if (titleMatch) {
            let rawTitle = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
            let sourceName = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
            if (!sourceName && rawTitle.includes(' - ')) {
              const parts = rawTitle.split(' - ');
              sourceName = parts.pop() || '';
              rawTitle = parts.join(' - ');
            }
            items.push({
              title: rawTitle,
              source: sourceName || 'Public News Wire',
              url: linkMatch ? linkMatch[1] : undefined,
              publishedAt: pubDateMatch ? pubDateMatch[1] : undefined,
            });
          }
        }
        return items;
      })
      .catch(() => []);

    // 2. Fetch Alternative.me Fear & Greed index if crypto
    const fgPromise = isCrypto
      ? fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(3000) })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            const row = d?.data?.[0];
            return row ? { value: Number(row.value), classification: String(row.value_classification) } : null;
          })
          .catch(() => null)
      : Promise.resolve(null);

    const [headlines, fearAndGreed] = await Promise.all([newsPromise, fgPromise]);

    let finalHeadlines = headlines;
    let source: 'live' | 'fallback' = 'live';

    if (!finalHeadlines || finalHeadlines.length === 0) {
      source = 'fallback';
      finalHeadlines = generateFallbackNews(cleanName, isCrypto);
    }

    const sentiment = aggregateSentiment(symbol, cleanName, finalHeadlines, fearAndGreed);
    sentiment.source = source;

    sentimentCache.set(symbol, { timestamp: Date.now(), data: sentiment });
    res.json(sentiment);
  } catch {
    const fallbackNews = generateFallbackNews(cleanName, isCrypto);
    const sentiment = aggregateSentiment(symbol, cleanName, fallbackNews, null);
    sentiment.source = 'fallback';
    res.json(sentiment);
  }
});

// 8. Strategy Backtesting Runner
app.post('/api/backtest', async (req: Request, res: Response) => {
  const {
    symbol = 'BINANCE:BTCUSDT',
    timeframe = '60',
    count = 300,
    strategy = 'rsi_divergence',
    stopLossAtr = 2.0,
    takeProfitAtr = 4.0,
    maxHoldingBars = 30,
  } = req.body || {};

  try {
    let candles: Candle[];
    try {
      candles = await getCandles({ symbol, timeframe, count: Number(count), timeout: 6000 });
    } catch {
      candles = generateFallbackCandles(symbol, timeframe, Number(count));
    }

    if (candles.length < 50) {
      candles = generateFallbackCandles(symbol, timeframe, Number(count));
    }

    // Determine signals based on selected strategy
    let signalFn: (bar: Candle, index: number, history: readonly Candle[]) => Signal | null;

    if (strategy === 'rsi_divergence') {
      signalFn = rsiDivergence({ rsiPeriod: 14, pivotPeriod: 5 });
    } else if (strategy === 'ma_crossover') {
      // Fast EMA (9) crosses Slow EMA (21)
      const closePrices = candles.map((c) => c.close);
      const fastEma = ema(closePrices, 9);
      const slowEma = ema(closePrices, 21);

      signalFn = (_bar, index) => {
        if (index < 22) return null;
        const prevFast = fastEma[index - 1];
        const prevSlow = slowEma[index - 1];
        const currFast = fastEma[index];
        const currSlow = slowEma[index];
        if (prevFast === null || prevSlow === null || currFast === null || currSlow === null) return null;

        if (prevFast <= prevSlow && currFast > currSlow) {
          return { direction: 'long', meta: { rule: 'Fast EMA crossed above Slow EMA' } };
        }
        if (prevFast >= prevSlow && currFast < currSlow) {
          return { direction: 'short', meta: { rule: 'Fast EMA crossed below Slow EMA' } };
        }
        return null;
      };
    } else {
      // RSI oversold (<30) / overbought (>70)
      const closePrices = candles.map((c) => c.close);
      const rsiValues = rsi(closePrices, 14);

      signalFn = (_bar, index) => {
        if (index < 15) return null;
        const prev = rsiValues[index - 1];
        const curr = rsiValues[index];
        if (prev === null || curr === null) return null;

        if (prev < 30 && curr >= 30) {
          return { direction: 'long', meta: { rsi: curr, rule: 'RSI exit oversold (<30)' } };
        }
        if (prev > 70 && curr <= 70) {
          return { direction: 'short', meta: { rsi: curr, rule: 'RSI exit overbought (>70)' } };
        }
        return null;
      };
    }

    const exitModel = defaultExits({
      stopLossAtr: Number(stopLossAtr),
      takeProfitAtr: Number(takeProfitAtr),
      maxHoldingBars: Number(maxHoldingBars),
    });

    const result = simulate({
      candles,
      signal: signalFn,
      exit: exitModel,
    });

    const metrics = computeMetrics(result.trades);

    res.json({
      success: true,
      symbol,
      timeframe,
      barsAnalyzed: candles.length,
      strategy,
      params: { stopLossAtr, takeProfitAtr, maxHoldingBars },
      metrics: {
        totalTrades: metrics.totalTrades,
        winRate: Number((metrics.winRate * 100).toFixed(2)),
        profitFactor: metrics.profitFactor === Infinity ? 99 : Number(metrics.profitFactor.toFixed(2)),
        totalReturnPct: Number((metrics.totalReturn * 100).toFixed(2)),
        maxDrawdownPct: Number((metrics.maxDrawdown * 100).toFixed(2)),
        sharpeRatio: Number((metrics.sharpeRatio || 0).toFixed(2)),
        averageTradePct: Number((metrics.averageTrade * 100).toFixed(2)),
      },
      trades: result.trades.slice(-20).map((t) => ({
        entryIndex: t.entryIndex,
        exitIndex: t.exitIndex,
        entryTime: candles[t.entryIndex]?.time ? new Date(candles[t.entryIndex].time * 1000).toISOString() : '',
        exitTime: candles[t.exitIndex]?.time ? new Date(candles[t.exitIndex].time * 1000).toISOString() : '',
        direction: t.direction,
        entryPrice: Number(t.entryPrice.toFixed(2)),
        exitPrice: Number(t.exitPrice.toFixed(2)),
        returnPct: Number((t.return * 100).toFixed(2)),
        exitReason: t.exitReason,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Backtest failed' });
  }
});

// Configure Vite middleware or static serving
if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist/client')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist/client/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[TradingView-API Hub] Server listening on http://0.0.0.0:${PORT}`);
});
