import React, { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2 } from 'lucide-react';
import type { ScreenerRow } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ScreenerPanelProps {
  onSelectSymbol: (symbol: string) => void;
}

export const ScreenerPanel: React.FC<ScreenerPanelProps> = ({ onSelectSymbol }) => {
  const { theme, getCardBgClass } = useTheme();
  const [market, setMarket] = useState<'crypto' | 'america' | 'forex'>('crypto');
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'live' | 'fallback'>('live');

  const fetchScreenerData = async (selectedMarket: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/screener?market=${selectedMarket}`);
      const data = await res.json();
      setSource(data.source || 'live');
      setRows(data.result?.rows || []);
    } catch (err) {
      console.error('Screener fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenerData(market);
  }, [market]);

  const getRecommendationBadge = (score?: number) => {
    if (score === undefined || score === null) {
      return <span className="text-slate-500 font-mono text-xs">Neutral</span>;
    }
    if (score >= 0.5) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Strong Buy
        </span>
      );
    }
    if (score >= 0.1) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          Buy
        </span>
      );
    }
    if (score <= -0.5) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          Strong Sell
        </span>
      );
    }
    if (score <= -0.1) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
          Sell
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
        Neutral
      </span>
    );
  };

  const formatVolume = (vol?: number) => {
    if (!vol) return '—';
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  return (
    <div className={`${getCardBgClass()} border rounded-xl overflow-hidden shadow-xl transition-colors`}>
      {/* Screener Header */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Market Screener</h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  source === 'live'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {source === 'live' ? 'Live Screener' : 'Cached Universe'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time multi-market scanner with TradingView technical ratings
            </p>
          </div>
        </div>

        {/* Market Universe Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setMarket('crypto')}
              style={market === 'crypto' ? { backgroundColor: theme.primaryColor } : undefined}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                market === 'crypto'
                  ? 'text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Crypto
            </button>
            <button
              onClick={() => setMarket('america')}
              style={market === 'america' ? { backgroundColor: theme.primaryColor } : undefined}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                market === 'america'
                  ? 'text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              US Equities
            </button>
            <button
              onClick={() => setMarket('forex')}
              style={market === 'forex' ? { backgroundColor: theme.primaryColor } : undefined}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                market === 'forex'
                  ? 'text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Forex
            </button>
          </div>

          <button
            onClick={() => fetchScreenerData(market)}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-50"
            title="Refresh screener"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Screener Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="py-3 px-4 font-semibold">Instrument</th>
              <th className="py-3 px-4 font-semibold text-right">Last Price</th>
              <th className="py-3 px-4 font-semibold text-right">24h Change</th>
              <th className="py-3 px-4 font-semibold text-right">Volume</th>
              <th className="py-3 px-4 font-semibold text-center">Technical Rating</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                    <span>Loading market scanner results...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No screener records available for this market.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const change = Number(row.values.change || 0);
                const isPositive = change >= 0;
                return (
                  <tr key={row.symbol} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{row.values.name || row.symbol}</span>
                        <span className="text-[10px] text-slate-500">{row.symbol}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-200 font-bold">
                      ${Number(row.values.close || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className="inline-flex items-center font-semibold"
                        style={{ color: isPositive ? theme.bullishColor : theme.bearishColor }}
                      >
                        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {isPositive ? '+' : ''}
                        {change.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {formatVolume(Number(row.values.volume))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getRecommendationBadge(row.values['Recommend.All'] as number)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectSymbol(row.symbol)}
                        className="px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 transition-all text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <BarChart2 className="w-3 h-3" />
                        <span>Chart</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
