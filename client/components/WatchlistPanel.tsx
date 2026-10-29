import React from 'react';
import { ArrowUpRight, ArrowDownRight, Star } from 'lucide-react';
import type { QuoteData } from '../types';
import { useTheme } from '../context/ThemeContext';

interface WatchlistPanelProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  quotes: Record<string, QuoteData>;
  loading: boolean;
}

const DEFAULT_SYMBOLS = [
  { id: 'BINANCE:BTCUSDT', name: 'Bitcoin', symbol: 'BTCUSDT', category: 'Crypto' },
  { id: 'BINANCE:ETHUSDT', name: 'Ethereum', symbol: 'ETHUSDT', category: 'Crypto' },
  { id: 'BINANCE:SOLUSDT', name: 'Solana', symbol: 'SOLUSDT', category: 'Crypto' },
  { id: 'NASDAQ:AAPL', name: 'Apple Inc.', symbol: 'AAPL', category: 'US Stocks' },
  { id: 'NASDAQ:NVDA', name: 'NVIDIA Corp.', symbol: 'NVDA', category: 'US Stocks' },
  { id: 'NASDAQ:TSLA', name: 'Tesla Inc.', symbol: 'TSLA', category: 'US Stocks' },
  { id: 'NASDAQ:MSFT', name: 'Microsoft', symbol: 'MSFT', category: 'US Stocks' },
  { id: 'FOREXCOM:EURUSD', name: 'Euro / US Dollar', symbol: 'EURUSD', category: 'Forex' },
  { id: 'FOREXCOM:SPXUSD', name: 'S&P 500 Index', symbol: 'SPXUSD', category: 'Indices' },
];

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  currentSymbol,
  onSelectSymbol,
  quotes,
  loading,
}) => {
  const { theme, getCardBgClass } = useTheme();
  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return '—';
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    if (p > 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return p.toFixed(2);
  };

  return (
    <div className={`${getCardBgClass()} border rounded-xl overflow-hidden shadow-xl transition-colors`}>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">Active Watchlist</h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {DEFAULT_SYMBOLS.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: theme.primaryColor }}
              title="Updating quotes"
            />
          )}
          <span className="text-[11px] text-slate-400 font-mono">Live Quotes via TradingView</span>
        </div>
      </div>

      <div className="divide-y divide-slate-800/60 max-h-[480px] overflow-y-auto">
        {DEFAULT_SYMBOLS.map((item) => {
          const q = quotes[item.id] || {};
          const isSelected = currentSymbol === item.id;
          const change = q.ch ?? 0;
          const changePct = q.chp ?? 0;
          const isUp = change >= 0;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSymbol(item.id)}
              style={isSelected ? { borderLeftColor: theme.primaryColor } : undefined}
              className={`w-full text-left p-3.5 flex items-center justify-between transition-all group ${
                isSelected
                  ? 'bg-blue-600/10 border-l-4'
                  : 'hover:bg-slate-800/50 border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: isSelected ? theme.primaryColor : undefined }}
                  >
                    {item.symbol}
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                    {item.category}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 truncate mt-0.5">{item.name}</span>
              </div>

              <div className="text-right font-mono">
                <div className="text-xs font-bold text-slate-100">
                  ${formatPrice(q.lp)}
                </div>
                <div
                  className="text-[11px] font-semibold flex items-center justify-end"
                  style={{ color: isUp ? theme.bullishColor : theme.bearishColor }}
                >
                  {isUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                  {isUp ? '+' : ''}
                  {changePct.toFixed(2)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
