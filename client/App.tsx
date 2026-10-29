import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { CandleChart } from './components/CandleChart';
import { WatchlistPanel } from './components/WatchlistPanel';
import { ScreenerPanel } from './components/ScreenerPanel';
import { BacktestPanel } from './components/BacktestPanel';
import { ApiExplorer } from './components/ApiExplorer';
import { ToastContainer } from './components/ToastNotification';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { checkIndicatorCrossovers } from './utils/crossoverDetector';
import { soundManager } from './utils/sound';
import { calculateATR14 } from './utils/volatility';
import { MarketSentimentGauge } from './components/MarketSentimentGauge';
import { ColorSettingsModal } from './components/ColorSettingsModal';
import { useTheme } from './context/ThemeContext';
import type { Candle, Indicators, QuoteData, PriceAlertConfig, ToastAlert, MarketSentimentData } from './types';
import { Layers, Bell, Play, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export default function App() {
  const { getBgClass, getCardBgClass } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('chart');
  const [symbol, setSymbol] = useState<string>('BINANCE:BTCUSDT');
  const [timeframe, setTimeframe] = useState<string>('1D');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  
  // Data state
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, QuoteData>>({});
  const [loadingChart, setLoadingChart] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chartSource, setChartSource] = useState<'live' | 'fallback'>('live');
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [sentiment, setSentiment] = useState<MarketSentimentData | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);

  // Notification & Crossover Alert State
  const [alertConfig, setAlertConfig] = useState<PriceAlertConfig>({
    enabled: true,
    indicator: 'BOTH',
    direction: 'both',
    soundEnabled: true,
    browserNotifications: false,
  });
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<ToastAlert[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Ref to hold latest config for callbacks
  const alertConfigRef = useRef(alertConfig);
  alertConfigRef.current = alertConfig;

  // Last Tick percentage change tracking
  const lastTickPriceRef = useRef<number | null>(null);
  const [tickChange, setTickChange] = useState<{
    changePct: number;
    prevPrice: number;
    currentPrice: number;
    direction: 'up' | 'down' | 'flat';
  } | null>(null);

  // Market Volatility (ATR 14 bars) calculation to gauge market noise
  const currentPrice = quote?.lp ?? (candles.length ? candles[candles.length - 1].close : 0);
  const volatility = React.useMemo(() => {
    return calculateATR14(candles, currentPrice);
  }, [candles, currentPrice]);

  // Fetch status on mount
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setApiStatus(data))
      .catch((err) => console.error('Failed to load API status:', err));
  }, []);

  // Dispatch alert to UI, sound and native notifications
  const triggerAlert = useCallback((newAlert: ToastAlert) => {
    setToasts((prev) => [newAlert, ...prev.slice(0, 4)]);
    setAlertHistory((prev) => [newAlert, ...prev.slice(0, 49)]);

    const cfg = alertConfigRef.current;

    // Audio chime
    if (cfg.soundEnabled) {
      if (newAlert.direction === 'cross_above') {
        soundManager.playCrossAbove();
      } else {
        soundManager.playCrossBelow();
      }
    }

    // Native browser system notification
    if (cfg.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`${newAlert.symbol} Price Crossover`, {
          body: newAlert.message,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }
  }, []);

  // Dismiss a specific toast
  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch candles for active symbol & timeframe
  const loadCandles = useCallback(async (sym: string, tf: string) => {
    setLoadingChart(true);
    try {
      const res = await fetch(`/api/candles?symbol=${encodeURIComponent(sym)}&timeframe=${tf}&count=120`);
      const data = await res.json();
      const loadedCandles: Candle[] = data.candles || [];
      const loadedIndicators: Indicators | null = data.indicators || null;
      setCandles(loadedCandles);
      setIndicators(loadedIndicators);
      setChartSource(data.source || 'live');

      // Check for price crosses above or below EMA20 / SMA20
      if (loadedCandles.length > 20 && loadedIndicators) {
        const lastPrice = loadedCandles[loadedCandles.length - 1]?.close || 0;
        const newAlerts = checkIndicatorCrossovers(
          sym,
          loadedCandles,
          loadedIndicators,
          lastPrice,
          alertConfigRef.current
        );
        newAlerts.forEach((a) => triggerAlert(a));
      }

      // Compute initial baseline tick change from candle history if not yet established
      if (loadedCandles.length >= 2 && lastTickPriceRef.current === null) {
        const prevBar = loadedCandles[loadedCandles.length - 2];
        const lastBar = loadedCandles[loadedCandles.length - 1];
        if (prevBar && lastBar && prevBar.close > 0) {
          const pct = ((lastBar.close - prevBar.close) / prevBar.close) * 100;
          setTickChange({
            changePct: pct,
            prevPrice: prevBar.close,
            currentPrice: lastBar.close,
            direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
          });
          lastTickPriceRef.current = lastBar.close;
        }
      }
    } catch (err) {
      console.error('Error loading candles:', err);
    } finally {
      setLoadingChart(false);
    }
  }, [triggerAlert]);

  // Fetch single quote for current symbol
  const loadQuote = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      const loadedQuote: QuoteData | null = data.quote || null;
      setQuote(loadedQuote);

      // Track percentage change of the price since the last tick
      if (loadedQuote?.lp) {
        const currentPrice = loadedQuote.lp;
        if (lastTickPriceRef.current !== null && lastTickPriceRef.current !== currentPrice) {
          const prev = lastTickPriceRef.current;
          const pct = ((currentPrice - prev) / prev) * 100;
          setTickChange({
            changePct: pct,
            prevPrice: prev,
            currentPrice,
            direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
          });
        } else if (lastTickPriceRef.current === null) {
          const pct = loadedQuote.chp ?? 0;
          setTickChange({
            changePct: pct,
            prevPrice: loadedQuote.open_price ?? currentPrice,
            currentPrice,
            direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
          });
        }
        lastTickPriceRef.current = currentPrice;
      }

      // Check crossover against quote price if available
      if (loadedQuote?.lp && candles.length > 20 && indicators) {
        const newAlerts = checkIndicatorCrossovers(
          sym,
          candles,
          indicators,
          loadedQuote.lp,
          alertConfigRef.current
        );
        newAlerts.forEach((a) => triggerAlert(a));
      }
    } catch (err) {
      console.error('Error loading quote:', err);
    }
  }, [candles, indicators, triggerAlert]);

  // Fetch watchlist quotes
  const loadWatchlistQuotes = useCallback(async () => {
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      setWatchlistQuotes(data.quotes || {});
    } catch (err) {
      console.error('Error loading watchlist quotes:', err);
    }
  }, []);

  // Fetch live market news sentiment
  const loadSentiment = useCallback(async (sym: string) => {
    setLoadingSentiment(true);
    try {
      const res = await fetch(`/api/sentiment?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      setSentiment(data);
    } catch (err) {
      console.error('Error loading market sentiment:', err);
    } finally {
      setLoadingSentiment(false);
    }
  }, []);

  // Trigger when symbol or timeframe changes
  useEffect(() => {
    lastTickPriceRef.current = null;
    setTickChange(null);
    loadCandles(symbol, timeframe);
    loadQuote(symbol);
    loadSentiment(symbol);
  }, [symbol, timeframe, loadCandles, loadQuote, loadSentiment]);

  // Initial watchlist load
  useEffect(() => {
    loadWatchlistQuotes();
  }, [loadWatchlistQuotes]);

  // Periodic price poll for active crossover triggers (every 10 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      loadQuote(symbol);
    }, 10_000);
    return () => clearInterval(timer);
  }, [symbol, loadQuote]);

  // Global refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadCandles(symbol, timeframe),
      loadQuote(symbol),
      loadWatchlistQuotes(),
      loadSentiment(symbol),
    ]);
    setRefreshing(false);
  };

  const handleSelectSymbol = (newSymbol: string) => {
    setSymbol(newSymbol);
    setActiveTab('chart');
  };

  // Manual trigger for testing alerts
  const handleTriggerTestAlert = (direction: 'cross_above' | 'cross_below', indicator: 'EMA20' | 'SMA20') => {
    const isAbove = direction === 'cross_above';
    const currentPrice = quote?.lp || (candles.length ? candles[candles.length - 1].close : 67850);
    const indicatorValue = isAbove ? currentPrice * 0.985 : currentPrice * 1.015;

    const testAlert: ToastAlert = {
      id: `test-${Date.now()}`,
      symbol,
      indicator,
      direction,
      currentPrice,
      indicatorValue,
      timestamp: Date.now(),
      message: `${symbol} Price ($${currentPrice.toFixed(2)}) crossed ${isAbove ? 'ABOVE' : 'BELOW'} ${indicator} ($${indicatorValue.toFixed(2)})`,
    };

    triggerAlert(testAlert);
  };

  return (
    <div className={`min-h-screen ${getBgClass()} flex flex-col font-sans transition-colors duration-200`}>
      {/* Toast Notification Container */}
      <ToastContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
        onSelectSymbol={handleSelectSymbol}
        onClearAll={() => setToasts([])}
      />

      {/* Top Navigation Bar */}
      <Header
        currentSymbol={symbol}
        onSelectSymbol={handleSelectSymbol}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiStatus={apiStatus}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onOpenAlerts={() => setIsAlertModalOpen(true)}
        alertCount={alertHistory.length}
        onOpenColorSettings={() => setIsColorModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Crossover Notification Status Banner */}
        <div className="mb-5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-white">
                  Indicator Crossover Alerts:
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    alertConfig.enabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {alertConfig.enabled ? 'Active Monitoring' : 'Disabled'}
                </span>
                <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
                  Target: {alertConfig.indicator} • Condition: {alertConfig.direction.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Browser toasts trigger automatically when market price crosses above or below EMA20 or SMA20.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerTestAlert('cross_above', 'EMA20')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
              title="Test Bullish Cross Above Toast"
            >
              <Play className="w-3 h-3" />
              <span>Test Alert</span>
            </button>
            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-all shadow flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Configure Alerts ({alertHistory.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'chart' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart Column (8 cols on large screens) */}
            <div className="lg:col-span-8 space-y-6">
              <CandleChart
                candles={candles}
                indicators={indicators}
                symbol={symbol}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                quote={quote}
                loading={loadingChart}
                source={chartSource}
              />

              {/* Symbol Description & Quick Specs */}
              <div className={`${getCardBgClass()} border rounded-xl p-5 shadow-lg transition-colors`}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white tracking-tight">Active Instrument Profile</h3>
                    {tickChange && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 border transition-all ${
                          tickChange.direction === 'up'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : tickChange.direction === 'down'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {tickChange.direction === 'up' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : tickChange.direction === 'down' ? (
                          <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : null}
                        <span>
                          {tickChange.changePct >= 0 ? '+' : ''}
                          {tickChange.changePct.toFixed(3)}% tick
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Source: TradingView Feed • News Sentiment: Live Wire
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono">
                  {/* Metric 1: Last Tick % Change */}
                  <div
                    className={`p-3 rounded-lg border transition-all ${
                      tickChange?.direction === 'up'
                        ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm shadow-emerald-950/30'
                        : tickChange?.direction === 'down'
                        ? 'bg-rose-950/25 border-rose-500/40 shadow-sm shadow-rose-950/30'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                        Last Tick Change
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tickChange?.direction === 'up'
                            ? 'bg-emerald-400 animate-pulse'
                            : tickChange?.direction === 'down'
                            ? 'bg-rose-400 animate-pulse'
                            : 'bg-slate-500'
                        }`}
                        title="Live tick status"
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className={`text-base font-extrabold font-mono flex items-center ${
                          tickChange?.direction === 'up'
                            ? 'text-emerald-400'
                            : tickChange?.direction === 'down'
                            ? 'text-rose-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {tickChange?.direction === 'up' ? (
                          <ArrowUpRight className="w-4 h-4 mr-0.5 stroke-[3]" />
                        ) : tickChange?.direction === 'down' ? (
                          <ArrowDownRight className="w-4 h-4 mr-0.5 stroke-[3]" />
                        ) : null}
                        {tickChange
                          ? `${tickChange.changePct >= 0 ? '+' : ''}${tickChange.changePct.toFixed(3)}%`
                          : '0.000%'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5 truncate">
                      {tickChange?.prevPrice
                        ? `$${tickChange.currentPrice.toFixed(2)} vs $${tickChange.prevPrice.toFixed(2)}`
                        : 'Since previous tick'}
                    </span>
                  </div>

                  {/* Metric 2: Market Volatility (ATR 14 Bars) */}
                  <div
                    className="p-3 rounded-lg border transition-all relative overflow-hidden"
                    style={{
                      backgroundColor: volatility ? volatility.noiseBg : 'rgba(15, 23, 42, 0.6)',
                      borderColor: volatility ? volatility.noiseBorder : 'rgba(51, 65, 85, 0.8)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-purple-400" />
                        Market Volatility
                      </span>
                      {volatility && (
                        <span
                          className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider"
                          style={{
                            color: volatility.noiseColor,
                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                            border: `1px solid ${volatility.noiseBorder}`,
                          }}
                        >
                          {volatility.noiseLevel} Noise
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-base font-extrabold font-mono text-slate-100">
                        {volatility ? (
                          volatility.atr14 >= 1000
                            ? `$${volatility.atr14.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : volatility.atr14 >= 1
                            ? `$${volatility.atr14.toFixed(2)}`
                            : `$${volatility.atr14.toFixed(4)}`
                        ) : (
                          '—'
                        )}
                      </span>
                      {volatility && (
                        <span
                          className="text-[11px] font-bold font-mono"
                          style={{ color: volatility.noiseColor }}
                        >
                          ±{volatility.atrPct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-400 font-mono">
                      <span>ATR (14 bars)</span>
                      {volatility && (
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5">
                          {volatility.isExpanding ? '▲ Expanding' : '▼ Contracting'}
                        </span>
                      )}
                    </div>
                    {volatility && (
                      <div className="w-full bg-slate-800/80 rounded-full h-1 mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(12, (volatility.atrPct / 3.5) * 100))}%`,
                            backgroundColor: volatility.noiseColor,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Metric 3: Market Sentiment (News Sentiment Gauge & Bullish/Bearish Score) */}
                  <MarketSentimentGauge
                    symbol={symbol}
                    sentiment={sentiment}
                    loading={loadingSentiment}
                    onRefresh={() => loadSentiment(symbol)}
                  />

                  {/* Metric 4: Timeframe */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Timeframe</span>
                    <span className="text-slate-200 font-bold mt-1 block">{timeframe} interval</span>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Aggregated bars</span>
                  </div>

                  {/* Metric 5: Total Bars */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Bars</span>
                    <span className="text-slate-200 font-bold mt-1 block">{candles.length} bars</span>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Historical range</span>
                  </div>

                  {/* Metric 6: Moving Averages */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Moving Averages</span>
                    <div className="flex items-center gap-1.5 mt-1 font-bold">
                      <span className="text-amber-400">SMA20</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-cyan-400">EMA20</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Overlay series</span>
                  </div>

                  {/* Metric 7: Alert Triggers */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Alert Triggers</span>
                    <span className="text-emerald-400 font-bold mt-1 block">EMA20/SMA20</span>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Browser toasts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Watchlist Sidebar (4 cols on large screens) */}
            <div className="lg:col-span-4">
              <WatchlistPanel
                currentSymbol={symbol}
                onSelectSymbol={handleSelectSymbol}
                quotes={watchlistQuotes}
                loading={refreshing}
              />
            </div>
          </div>
        )}

        {activeTab === 'screener' && (
          <ScreenerPanel onSelectSymbol={handleSelectSymbol} />
        )}

        {activeTab === 'backtest' && (
          <BacktestPanel currentSymbol={symbol} />
        )}

        {activeTab === 'api' && (
          <ApiExplorer />
        )}
      </main>

      {/* Alert Settings Modal */}
      <AlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        config={alertConfig}
        onUpdateConfig={setAlertConfig}
        alertHistory={alertHistory}
        onClearHistory={() => setAlertHistory([])}
        onTriggerTestAlert={handleTriggerTestAlert}
        onSelectSymbol={handleSelectSymbol}
      />

      {/* UI Color & Theme Customizer Modal */}
      <ColorSettingsModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>TradingView Market Data Hub</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-400">Independent community project, not affiliated with TradingView</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Dev Server Active
            </span>
            <span className="text-slate-700">•</span>
            <span>Port 3000</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
