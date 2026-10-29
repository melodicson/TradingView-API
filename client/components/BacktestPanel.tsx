import React, { useState } from 'react';
import { Play } from 'lucide-react';
import type { BacktestResult } from '../types';
import { useTheme } from '../context/ThemeContext';

interface BacktestPanelProps {
  currentSymbol: string;
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ currentSymbol }) => {
  const { theme, getCardBgClass } = useTheme();
  const [symbol, setSymbol] = useState(currentSymbol);
  const [strategy, setStrategy] = useState('rsi_divergence');
  const [timeframe, setTimeframe] = useState('60');
  const [count, setCount] = useState('300');
  const [stopLossAtr, setStopLossAtr] = useState('2.0');
  const [takeProfitAtr, setTakeProfitAtr] = useState('4.0');
  const [maxHoldingBars, setMaxHoldingBars] = useState('30');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          count: Number(count),
          strategy,
          stopLossAtr: Number(stopLossAtr),
          takeProfitAtr: Number(takeProfitAtr),
          maxHoldingBars: Number(maxHoldingBars),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Backtest simulation failed');
      }
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className={`${getCardBgClass()} border rounded-xl p-6 shadow-xl transition-colors`}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Honest Strategy Backtester</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                @mathieuc/tradingview/backtest
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict walk-forward protocol with ATR volatility exits, no look-ahead bias, and pessimistic fills
            </p>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            style={{ backgroundColor: theme.primaryColor }}
            className="px-5 py-2.5 rounded-lg text-white font-mono text-xs font-bold transition-all shadow-lg hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>{loading ? 'Simulating Trades...' : 'Run Simulation'}</span>
          </button>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-5">
          {/* Symbol */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Entry Signal Model</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            >
              <option value="rsi_divergence">RSI Divergence (Built-in)</option>
              <option value="ma_crossover">EMA 9 / 21 Crossover</option>
              <option value="rsi_bands">RSI Extreme Mean Reversion</option>
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            >
              <option value="15">15 Minutes</option>
              <option value="60">1 Hour (60m)</option>
              <option value="240">4 Hours (240m)</option>
              <option value="1D">1 Day</option>
            </select>
          </div>

          {/* Stop Loss ATR */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Stop Loss (x ATR)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="10"
              value={stopLossAtr}
              onChange={(e) => setStopLossAtr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Take Profit ATR */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Take Profit (x ATR)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="15"
              value={takeProfitAtr}
              onChange={(e) => setTakeProfitAtr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Max Holding Bars */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Max Holding Bars</label>
            <input
              type="number"
              min="5"
              max="120"
              value={maxHoldingBars}
              onChange={(e) => setMaxHoldingBars(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Historical Bars */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Sample Bars</label>
            <input
              type="number"
              min="50"
              max="500"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}
      </div>

      {/* KPI Metrics Dashboard */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Return */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Total Return</span>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  result.metrics.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.metrics.totalReturnPct >= 0 ? '+' : ''}
                {result.metrics.totalReturnPct}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Cumulative compounded</span>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Win Rate</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {result.metrics.winRate}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{result.metrics.totalTrades} completed trades</span>
            </div>

            {/* Profit Factor */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Profit Factor</span>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  result.metrics.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-slate-100'
                }`}
              >
                {result.metrics.profitFactor}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Gross profits / losses</span>
            </div>

            {/* Max Drawdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Max Drawdown</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                -{result.metrics.maxDrawdownPct}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Peak-to-trough decline</span>
            </div>

            {/* Sharpe Ratio */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Sharpe Ratio</span>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {result.metrics.sharpeRatio}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Risk-adjusted return</span>
            </div>

            {/* Avg Trade Return */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Avg Trade Return</span>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  result.metrics.averageTradePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.metrics.averageTradePct >= 0 ? '+' : ''}
                {result.metrics.averageTradePct}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Per position average</span>
            </div>
          </div>

          {/* Trade Log Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <h4 className="text-sm font-bold text-white font-mono">Execution Log (Recent Trades)</h4>
              <span className="text-xs text-slate-400 font-mono">
                Analyzed {result.barsAnalyzed} historical bars
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Direction</th>
                    <th className="py-2.5 px-4 font-semibold">Entry Time</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Entry Price</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Exit Price</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Return</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Exit Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {result.trades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No trade triggers generated by this parameter configuration.
                      </td>
                    </tr>
                  ) : (
                    result.trades.map((t, idx) => {
                      const isProfit = t.returnPct >= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.direction === 'long'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {t.entryTime ? new Date(t.entryTime).toLocaleDateString() : `#${t.entryIndex}`}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-200">
                            ${t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-200">
                            ${t.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold">
                            <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                              {isProfit ? '+' : ''}
                              {t.returnPct}%
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                              {t.exitReason}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
