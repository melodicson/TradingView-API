import React, { useState } from 'react';
import type { MarketSentimentData } from '../types';
import { Newspaper, ExternalLink, RefreshCw, X, ShieldAlert, Sparkles } from 'lucide-react';

interface MarketSentimentGaugeProps {
  symbol: string;
  sentiment: MarketSentimentData | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const MarketSentimentGauge: React.FC<MarketSentimentGaugeProps> = ({
  sentiment,
  loading,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Normalize score to 0..100 (50 is neutral)
  const score = sentiment ? sentiment.normalizedScore : 50;

  // Gauge needle angle: 0% -> 180 deg (left/bearish), 50% -> 90 deg (top/neutral), 100% -> 0 deg (right/bullish)
  // In SVG coordinates from center (cx=90, cy=75, r=60):
  // Angle theta in radians from -PI (left) to 0 (right): theta = -PI + (score / 100) * PI
  const needleAngle = -180 + (score / 100) * 180;
  const rad = (needleAngle * Math.PI) / 180;
  const needleLen = 48;
  const cx = 90;
  const cy = 72;
  const needleX = cx + needleLen * Math.cos(rad);
  const needleY = cy + needleLen * Math.sin(rad);

  const isBullish = score >= 55;
  const isBearish = score <= 44;

  return (
    <>
      <div
        className="p-3 rounded-lg border transition-all relative overflow-hidden flex flex-col justify-between"
        style={{
          backgroundColor: sentiment ? sentiment.bgColor : 'rgba(15, 23, 42, 0.6)',
          borderColor: sentiment ? sentiment.borderColor : 'rgba(51, 65, 85, 0.8)',
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-slate-300 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
            <Newspaper className="w-3.5 h-3.5 text-blue-400" />
            Market Sentiment
          </span>

          <div className="flex items-center gap-1">
            {sentiment && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider transition-colors"
                style={{
                  color: sentiment.color,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: `1px solid ${sentiment.borderColor}`,
                }}
              >
                {sentiment.label}
              </span>
            )}

            {onRefresh && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={loading}
                className="p-1 hover:bg-slate-800/80 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh news sentiment"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Semi-Circular SVG Speedometer Gauge */}
        <div className="relative flex flex-col items-center justify-center my-1">
          <svg viewBox="0 0 180 82" className="w-full max-w-[170px] overflow-visible">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="35%" stopColor="#fb7185" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="65%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {/* Background Arc */}
            <path
              d="M 25 72 A 65 65 0 0 1 155 72"
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Colored Gradient Arc */}
            <path
              d="M 25 72 A 65 65 0 0 1 155 72"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="9"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Ticks at 25, 50, 75 */}
            {/* Left label: Bearish */}
            <text x="22" y="80" fill="#f43f5e" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              BEAR
            </text>
            {/* Center label: Neutral */}
            <text x="90" y="24" fill="#64748b" fontSize="7" fontFamily="monospace" textAnchor="middle">
              50
            </text>
            {/* Right label: Bullish */}
            <text x="158" y="80" fill="#10b981" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              BULL
            </text>

            {/* Needle Pivot & Pointer */}
            <line
              x1={cx}
              y1={cy}
              x2={needleX}
              y2={needleY}
              stroke={sentiment ? sentiment.color : '#e2e8f0'}
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
            <circle cx={cx} cy={cy} r="4.5" fill="#0f172a" stroke={sentiment ? sentiment.color : '#38bdf8'} strokeWidth="2" />
            <circle cx={needleX} cy={needleY} r="2.5" fill={sentiment ? sentiment.color : '#38bdf8'} />
          </svg>

          {/* Current Score Overlay */}
          <div className="flex items-baseline gap-1 -mt-2">
            <span
              className="text-lg font-extrabold font-mono"
              style={{ color: sentiment ? sentiment.color : '#f1f5f9' }}
            >
              {loading && !sentiment ? '...' : `${score}`}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">/ 100</span>
            <span
              className={`text-[10px] font-bold font-mono ml-1 ${
                isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-sky-400'
              }`}
            >
              {isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral'}
            </span>
          </div>
        </div>

        {/* Sentiment Distribution Bar */}
        {sentiment && (
          <div className="space-y-1 mt-0.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="text-emerald-400 font-semibold">{sentiment.bullishPct}% Bull</span>
              <span className="text-slate-400">{sentiment.neutralPct}% Neu</span>
              <span className="text-rose-400 font-semibold">{sentiment.bearishPct}% Bear</span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${sentiment.bullishPct}%` }}
                title={`${sentiment.bullishPct}% Bullish News`}
              />
              <div
                className="bg-slate-600 h-full transition-all duration-500"
                style={{ width: `${sentiment.neutralPct}%` }}
                title={`${sentiment.neutralPct}% Neutral News`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${sentiment.bearishPct}%` }}
                title={`${sentiment.bearishPct}% Bearish News`}
              />
            </div>

            {/* Sub-bar tags & view headlines action */}
            <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-slate-400">
              {sentiment.fearAndGreed ? (
                <span className="text-amber-300 font-medium" title="Alternative.me Crypto Fear & Greed Index">
                  F&G: {sentiment.fearAndGreed.value} {sentiment.fearAndGreed.classification}
                </span>
              ) : (
                <span className="text-slate-400">
                  {sentiment.articleCount} news items
                </span>
              )}

              <button
                onClick={() => setIsModalOpen(true)}
                className="text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-0.5 transition-colors"
                title="View analyzed public news headlines"
              >
                <span>News Wire ({sentiment.articles.length})</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Analyzed Public News Headlines & Sentiment Breakdown */}
      {isModalOpen && sentiment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Newspaper className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{sentiment.name} Market News Sentiment</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold"
                      style={{
                        color: sentiment.color,
                        backgroundColor: sentiment.bgColor,
                        border: `1px solid ${sentiment.borderColor}`,
                      }}
                    >
                      {sentiment.label} ({sentiment.normalizedScore}/100)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Scored using public financial news wire feeds & keyword sentiment modeling
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sentiment Summary Bar in Modal */}
            <div className="p-4 bg-slate-950/30 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Bullish Ratio</span>
                <span className="text-sm font-bold text-emerald-400">{sentiment.bullishPct}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Bearish Ratio</span>
                <span className="text-sm font-bold text-rose-400">{sentiment.bearishPct}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Neutral Ratio</span>
                <span className="text-sm font-bold text-slate-300">{sentiment.neutralPct}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Feed Source</span>
                <span className="text-sm font-bold text-blue-400 capitalize">{sentiment.source} RSS</span>
              </div>
            </div>

            {/* Articles List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-800/60">
              {sentiment.articles.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-mono">
                  No headlines available for this instrument.
                </div>
              ) : (
                sentiment.articles.map((art, idx) => (
                  <div key={idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 group">
                    <div className="space-y-1 flex-1">
                      <a
                        href={art.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-200 group-hover:text-blue-400 font-medium transition-colors line-clamp-2 leading-relaxed"
                      >
                        {art.title}
                      </a>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="text-slate-400 font-medium">{art.source}</span>
                        {art.publishedAt && <span>• {new Date(art.publishedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>

                    {/* Sentiment Tag */}
                    <div className="shrink-0 flex items-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                          art.sentiment === 'Bullish'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : art.sentiment === 'Bearish'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-slate-800/80 text-slate-400 border-slate-700'
                        }`}
                      >
                        {art.sentiment === 'Bullish' ? (
                          <Sparkles className="w-3 h-3" />
                        ) : art.sentiment === 'Bearish' ? (
                          <ShieldAlert className="w-3 h-3" />
                        ) : null}
                        <span>{art.sentiment}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{sentiment.articles.length} public articles scanned</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
