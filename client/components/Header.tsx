import React, { useState, useEffect, useRef } from 'react';
import { Search, Activity, Terminal, RefreshCw, BarChart3, TrendingUp, Sparkles, Bell, Palette } from 'lucide-react';
import type { MarketSearchResult } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  apiStatus: { status: string; version: string; library: string } | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenAlerts: () => void;
  alertCount: number;
  onOpenColorSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  activeTab,
  setActiveTab,
  apiStatus,
  refreshing,
  onRefresh,
  onOpenAlerts,
  alertCount,
  onOpenColorSettings,
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MarketSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Version */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">TradingView Hub</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v{apiStatus?.version || '4.1.0'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Node.js High-Level Market Data & Backtester</p>
            </div>
          </div>

          {/* Symbol Search Bar */}
          <div className="relative flex-1 max-w-md hidden md:flex items-center gap-2" ref={dropdownRef}>
            <span className="hidden xl:inline-block px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 font-bold">
              {currentSymbol}
            </span>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol (e.g. BTCUSDT, AAPL, EURUSD, NVDA)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && (searchResults.length > 0 || searchQuery.length >= 2) && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto z-50 divide-y divide-slate-800/60">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectSymbol(item.id);
                        setShowDropdown(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-white group-hover:text-blue-400">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                            {item.exchange}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate max-w-xs">{item.description}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {item.type}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No matching instruments found for "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('chart')}
              style={activeTab === 'chart' ? { backgroundColor: theme.primaryColor } : undefined}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'chart'
                  ? 'text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Chart</span>
            </button>
            <button
              onClick={() => setActiveTab('screener')}
              style={activeTab === 'screener' ? { backgroundColor: theme.primaryColor } : undefined}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'screener'
                  ? 'text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Screener</span>
            </button>
            <button
              onClick={() => setActiveTab('backtest')}
              style={activeTab === 'backtest' ? { backgroundColor: theme.primaryColor } : undefined}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'backtest'
                  ? 'text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Backtest</span>
            </button>
            <button
              onClick={() => setActiveTab('api')}
              style={activeTab === 'api' ? { backgroundColor: theme.primaryColor } : undefined}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'api'
                  ? 'text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>API Explorer</span>
            </button>
          </nav>

          {/* Quick Actions / Alerts / Theme / Refresh */}
          <div className="flex items-center gap-2">
            {/* UI Color & Theme Settings Button */}
            <button
              onClick={onOpenColorSettings}
              title="UI Color & Theme Settings (Customize Accents & Candles)"
              className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all flex items-center gap-1.5 group shadow-xs"
            >
              <Palette className="w-4 h-4 text-slate-300 group-hover:scale-110 transition-transform" />
              <span
                className="w-2.5 h-2.5 rounded-full ring-1 ring-black/40 shadow-xs transition-colors"
                style={{ backgroundColor: theme.primaryColor }}
              />
            </button>

            {/* Bell Alert Button */}
            <button
              onClick={onOpenAlerts}
              title="Crossover Alert Settings & History"
              className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-[9px] font-mono font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>

            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh data"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ready</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
