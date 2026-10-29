export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  sma20: (number | null)[];
  sma50: (number | null)[];
  ema20: (number | null)[];
  rsi14: (number | null)[];
  atr14: (number | null)[];
}

export interface QuoteData {
  lp?: number;
  ch?: number;
  chp?: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  prev_close_price?: number;
  volume?: number;
  currency_code?: string;
  [key: string]: any;
}

export interface MarketSearchResult {
  id: string;
  exchange: string;
  fullExchange: string;
  symbol: string;
  description: string;
  type: string;
  currency?: string;
}

export interface TechnicalRating {
  Other: number;
  All: number;
  MA: number;
}

export interface ScreenerRow {
  symbol: string;
  values: {
    name?: string;
    close?: number;
    change?: number;
    change_abs?: number;
    volume?: number;
    'Recommend.All'?: number;
    [key: string]: any;
  };
}

export interface TradeRecord {
  entryIndex: number;
  exitIndex: number;
  entryTime: string;
  exitTime: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  exitReason: string;
}

export interface BacktestResult {
  success: boolean;
  symbol: string;
  timeframe: string;
  barsAnalyzed: number;
  strategy: string;
  params: {
    stopLossAtr: number;
    takeProfitAtr: number;
    maxHoldingBars: number;
  };
  metrics: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    totalReturnPct: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    averageTradePct: number;
  };
  trades: TradeRecord[];
}

export type CrossDirection = 'cross_above' | 'cross_below';
export type MonitoredIndicator = 'EMA20' | 'SMA20' | 'BOTH';

export interface PriceAlertConfig {
  enabled: boolean;
  indicator: MonitoredIndicator;
  direction: 'both' | 'above' | 'below';
  soundEnabled: boolean;
  browserNotifications: boolean;
}

export interface ToastAlert {
  id: string;
  symbol: string;
  indicator: 'EMA20' | 'SMA20';
  direction: CrossDirection;
  currentPrice: number;
  indicatorValue: number;
  timestamp: number;
  message: string;
}

export interface NewsHeadline {
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  score: number;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

export interface MarketSentimentData {
  symbol: string;
  name: string;
  score: number; // -100 to +100
  normalizedScore: number; // 0 to 100
  label: 'Very Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Very Bearish';
  color: string;
  bgColor: string;
  borderColor: string;
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
  articleCount: number;
  articles: NewsHeadline[];
  fearAndGreed?: {
    value: number;
    classification: string;
  } | null;
  timestamp: number;
  source: 'live' | 'fallback';
}

export type ThemePresetId = 'default' | 'bloomberg' | 'tokyonight' | 'emerald' | 'obsidian' | 'matrix' | 'cyan';
export type BgStyle = 'midnight' | 'oled' | 'navy' | 'charcoal';
export type ChartGridContrast = 'subtle' | 'normal' | 'high';

export interface ThemeConfig {
  preset: ThemePresetId;
  name: string;
  primaryColor: string;
  primaryHover: string;
  bullishColor: string;
  bearishColor: string;
  bgStyle: BgStyle;
  chartGridContrast: ChartGridContrast;
}

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  tagline: string;
  description: string;
  config: Omit<ThemeConfig, 'preset' | 'name'>;
}


