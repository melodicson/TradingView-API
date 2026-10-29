import React, { useState } from 'react';
import { Terminal, Copy, Check, Play, FileCode, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Snippet {
  id: string;
  title: string;
  method: string;
  description: string;
  code: string;
  apiUrl: string;
}

const SNIPPETS: Snippet[] = [
  {
    id: 'candles',
    title: 'Fetch Candles (One-Shot)',
    method: 'getCandles',
    description: 'Load historical OHLCV candlestick records with automatic pagination and session teardown.',
    code: `import { getCandles } from '@mathieuc/tradingview/data';

// Fetch the 100 most recent 1-hour candles for Bitcoin
const candles = await getCandles({
  symbol: 'BINANCE:BTCUSDT',
  timeframe: '60',
  count: 100,
});

console.log('Latest close:', candles.at(-1)?.close);`,
    apiUrl: '/api/candles?symbol=BINANCE:BTCUSDT&timeframe=60&count=5',
  },
  {
    id: 'quote',
    title: 'Single Quote Lookup',
    method: 'getQuote',
    description: 'Fetch last price, 24h change, high/low, bid/ask, and volume for an exchange symbol.',
    code: `import { getQuote } from '@mathieuc/tradingview/data';

const quote = await getQuote('NASDAQ:AAPL');
console.log(\`\${quote.symbol}: $\${quote.lp} (\${quote.chp}%)\`);`,
    apiUrl: '/api/quote?symbol=NASDAQ:AAPL',
  },
  {
    id: 'screener',
    title: 'Market Screener Scan',
    method: 'getScreener',
    description: 'Scan equities, crypto or forex with multi-column filters and technical ratings.',
    code: `import { getScreener } from '@mathieuc/tradingview/data';

const result = await getScreener({
  market: 'crypto',
  columns: ['name', 'close', 'change', 'volume', 'Recommend.All'],
  range: [0, 10],
  sort: { sortBy: 'volume', sortOrder: 'desc' },
});

console.log(\`Found \${result.totalCount} tickers\`);`,
    apiUrl: '/api/screener?market=crypto',
  },
  {
    id: 'ta',
    title: 'Technical Rating Analysis',
    method: 'getTechnicalAnalysis',
    description: 'Retrieve summary moving average and oscillator consensus ratings (-1 to 1).',
    code: `import { getTechnicalAnalysis } from '@mathieuc/tradingview/data';

const ratings = await getTechnicalAnalysis('BINANCE:BTCUSDT');
console.log('Daily consensus rating:', ratings?.['1D']?.All);`,
    apiUrl: '/api/technical-analysis?symbol=BINANCE:BTCUSDT',
  },
  {
    id: 'backtest',
    title: 'Strategy Simulation & Metrics',
    method: 'simulate',
    description: 'Run walk-forward trade execution with volatility-based trailing stop exits.',
    code: `import { simulate, defaultExits, computeMetrics, rsiDivergence } from '@mathieuc/tradingview/backtest';

const result = simulate({
  candles,
  signal: rsiDivergence({ rsiPeriod: 14 }),
  exit: defaultExits({ stopLossAtr: 2.0, takeProfitAtr: 4.0 }),
});

const stats = computeMetrics(result.trades);
console.log(\`Win Rate: \${(stats.winRate * 100).toFixed(1)}%\`);`,
    apiUrl: '/api/status',
  },
];

export const ApiExplorer: React.FC = () => {
  const { theme, getCardBgClass } = useTheme();
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet>(SNIPPETS[0]);
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  const copyCode = () => {
    navigator.clipboard.writeText(selectedSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeLive = async () => {
    setExecuting(true);
    setApiResponse(null);
    try {
      const res = await fetch(selectedSnippet.apiUrl);
      const json = await res.json();
      setApiResponse(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setApiResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar List of SDK functions */}
      <div className="lg:col-span-4 space-y-2">
        <div className={`p-4 ${getCardBgClass()} border rounded-xl mb-4 transition-colors`}>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">SDK Quick-Reference</h3>
          </div>
          <p className="text-xs text-slate-400">
            Select a high-level API function from <code className="text-blue-400">@mathieuc/tradingview</code> to inspect usage patterns and test endpoints.
          </p>
        </div>

        {SNIPPETS.map((snip) => {
          const isSelected = selectedSnippet.id === snip.id;
          return (
            <button
              key={snip.id}
              onClick={() => {
                setSelectedSnippet(snip);
                setApiResponse(null);
              }}
              style={isSelected ? { borderColor: theme.primaryColor } : undefined}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-blue-600/10 shadow-md ring-1 ring-blue-500/30'
                  : `${getCardBgClass()} hover:border-slate-700`
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                  {snip.method}()
                </span>
                <span className="text-[10px] font-mono text-slate-500">{snip.id}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{snip.description}</p>
            </button>
          );
        })}
      </div>

      {/* Code Viewer & Live Response Console */}
      <div className="lg:col-span-8 space-y-4">
        {/* Code Snippet Card */}
        <div className={`${getCardBgClass()} border rounded-xl overflow-hidden shadow-xl transition-colors`}>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-white">{selectedSnippet.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyCode}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs font-mono flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                onClick={executeLive}
                disabled={executing}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-all text-xs font-mono font-semibold flex items-center gap-1.5 shadow"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>{executing ? 'Calling...' : 'Execute Endpoint'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed border-b border-slate-800">
            <pre>
              <code>{selectedSnippet.code}</code>
            </pre>
          </div>

          <div className="px-4 py-2 bg-slate-900/60 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>GET {selectedSnippet.apiUrl}</span>
            <span className="text-slate-500">Node.js 20+ ESM compatible</span>
          </div>
        </div>

        {/* Live Output Console */}
        {apiResponse && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl animate-fade-in">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white">Live Endpoint Response</span>
              </div>
              <button
                onClick={() => setApiResponse(null)}
                className="text-[11px] text-slate-400 hover:text-white font-mono"
              >
                Clear
              </button>
            </div>
            <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-72 overflow-y-auto">
              <pre>{apiResponse}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
