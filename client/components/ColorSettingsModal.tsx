import React from 'react';
import { Palette, Check, RotateCcw, X, Sparkles, Monitor, Eye } from 'lucide-react';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import type { BgStyle, ChartGridContrast } from '../types';

interface ColorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIMARY_SWATCHES = [
  { name: 'Electric Blue', hex: '#3b82f6' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Neon Violet', hex: '#8b5cf6' },
  { name: 'Emerald Mint', hex: '#10b981' },
  { name: 'Cyber Cyan', hex: '#06b6d4' },
  { name: 'Vivid Rose', hex: '#f43f5e' },
  { name: 'Sunset Orange', hex: '#ff6b00' },
  { name: 'Matrix Green', hex: '#22c55e' },
];

const BULLISH_SWATCHES = [
  { name: 'Emerald Green', hex: '#22c55e' },
  { name: 'Mint Seafoam', hex: '#10b981' },
  { name: 'Electric Cyan', hex: '#06b6d4' },
  { name: 'Bright Lime', hex: '#84cc16' },
  { name: 'Ice White', hex: '#f8fafc' },
];

const BEARISH_SWATCHES = [
  { name: 'Vivid Red', hex: '#ef4444' },
  { name: 'Rose Scarlet', hex: '#f43f5e' },
  { name: 'Deep Crimson', hex: '#dc2626' },
  { name: 'Hot Magenta', hex: '#ec4899' },
  { name: 'Neon Coral', hex: '#fb7185' },
];

const BG_STYLES: { id: BgStyle; label: string; desc: string; previewBg: string; border: string }[] = [
  {
    id: 'midnight',
    label: 'Midnight Slate',
    desc: 'High-tech dark slate blue',
    previewBg: '#020617',
    border: '#1e293b',
  },
  {
    id: 'oled',
    label: 'Pure Obsidian OLED',
    desc: 'True #000000 pitch black',
    previewBg: '#000000',
    border: '#18181b',
  },
  {
    id: 'navy',
    label: 'Indigo Navy',
    desc: 'Deep financial midnight navy',
    previewBg: '#030712',
    border: '#172554',
  },
  {
    id: 'charcoal',
    label: 'Carbon Charcoal',
    desc: 'Graphite terminal texture',
    previewBg: '#101114',
    border: '#2a2c38',
  },
];

export const ColorSettingsModal: React.FC<ColorSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    theme,
    presets,
    isCustomized,
    applyPreset,
    setPrimaryColor,
    setBullishColor,
    setBearishColor,
    setBgStyle,
    setChartGridContrast,
    resetTheme,
    getCardBgClass,
  } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className={`${getCardBgClass()} border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors duration-200`}
        style={{
          boxShadow: `0 20px 50px -10px ${hexToRgba(theme.primaryColor, 0.15)}`,
        }}
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-colors"
              style={{
                backgroundColor: theme.primaryColor,
                boxShadow: `0 4px 14px ${hexToRgba(theme.primaryColor, 0.4)}`,
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">UI Color & Theme Customizer</h3>
                {isCustomized ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                    Customized
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
                    Preset Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Personalize terminal accents, candlestick styling, and background depth.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Close theme settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Live Mini Chart Preview Widget */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Live Visual Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Active Tab Preview Button */}
                <span
                  className="px-2.5 py-1 rounded text-[11px] font-semibold text-white shadow-sm transition-all"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Active Tab
                </span>
                {/* Sample Price Return Badge */}
                <span
                  className="px-2 py-1 rounded text-[10px] font-mono font-bold border transition-colors"
                  style={{
                    color: theme.bullishColor,
                    borderColor: hexToRgba(theme.bullishColor, 0.4),
                    backgroundColor: hexToRgba(theme.bullishColor, 0.12),
                  }}
                >
                  ▲ +4.25% Bull
                </span>
                <span
                  className="px-2 py-1 rounded text-[10px] font-mono font-bold border transition-colors"
                  style={{
                    color: theme.bearishColor,
                    borderColor: hexToRgba(theme.bearishColor, 0.4),
                    backgroundColor: hexToRgba(theme.bearishColor, 0.12),
                  }}
                >
                  ▼ -1.80% Bear
                </span>
              </div>
            </div>

            {/* Miniature Candlestick SVG */}
            <div className="w-full h-20 bg-slate-950 rounded-lg p-2 border border-slate-800/60 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 400 65" preserveAspectRatio="none">
                {/* Grid line */}
                <line
                  x1="10"
                  y1="32"
                  x2="390"
                  y2="32"
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                  opacity={
                    theme.chartGridContrast === 'high' ? '0.7' : theme.chartGridContrast === 'subtle' ? '0.2' : '0.4'
                  }
                />

                {/* Moving Average Polyline */}
                <polyline
                  points="20,45 70,40 130,28 190,32 250,22 310,18 370,12"
                  fill="none"
                  stroke={theme.primaryColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Candles: 7 bars */}
                {[
                  { x: 35, high: 22, low: 52, open: 44, close: 26, isBull: true },
                  { x: 90, high: 20, low: 48, open: 28, close: 38, isBull: false },
                  { x: 145, high: 14, low: 42, open: 36, close: 18, isBull: true },
                  { x: 200, high: 16, low: 46, open: 22, close: 32, isBull: false },
                  { x: 255, high: 12, low: 38, open: 30, close: 16, isBull: true },
                  { x: 310, high: 8, low: 30, open: 20, close: 11, isBull: true },
                  { x: 365, high: 6, low: 28, open: 14, close: 8, isBull: true },
                ].map((c, i) => {
                  const color = c.isBull ? theme.bullishColor : theme.bearishColor;
                  const top = Math.min(c.open, c.close);
                  const height = Math.max(2, Math.abs(c.close - c.open));
                  return (
                    <g key={`mini-candle-${i}`}>
                      <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={color} strokeWidth="1.2" />
                      <rect
                        x={c.x - 5}
                        y={top}
                        width="10"
                        height={height}
                        fill={color}
                        rx="1"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Section 1: Presets Gallery */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Curated Theme Presets
              </span>
              <span className="text-[11px] text-slate-400">Click to instantly apply preset</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map((p) => {
                const isActive = theme.preset === p.id && !isCustomized;
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className={`text-left p-3 rounded-xl border transition-all relative group flex flex-col justify-between ${
                      isActive
                        ? 'border-blue-500/80 bg-blue-500/10 shadow-md ring-1 ring-blue-500/50'
                        : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full mb-1.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white group-hover:text-slate-100">{p.name}</span>
                          {isActive && (
                            <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">{p.tagline}</span>
                      </div>

                      {/* Swatch chips */}
                      <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-md border border-slate-800/80">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                          style={{ backgroundColor: p.config.primaryColor }}
                          title={`Primary: ${p.config.primaryColor}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                          style={{ backgroundColor: p.config.bullishColor }}
                          title={`Bull: ${p.config.bullishColor}`}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                          style={{ backgroundColor: p.config.bearishColor }}
                          title={`Bear: ${p.config.bearishColor}`}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Primary Brand & Accent Color */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Primary Accent Color</span>
                <span className="text-[11px] text-slate-400">
                  Controls active navigation tabs, interactive buttons, and indicator focal points
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md border border-slate-700 shadow-sm"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  title="Choose custom primary accent"
                />
              </div>
            </div>

            {/* Quick Swatches */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {PRIMARY_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  onClick={() => setPrimaryColor(swatch.hex)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5 border transition-all ${
                    theme.primaryColor.toLowerCase() === swatch.hex.toLowerCase()
                      ? 'border-white text-white font-bold shadow-md bg-slate-800'
                      : 'border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: swatch.hex }} />
                  <span>{swatch.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Candlestick & Return Colors (Bull & Bear) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bullish Color */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block">Bullish (Up Candles)</span>
                  <span className="text-[11px] text-slate-400">Green bars, positive returns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-md border border-slate-700 shadow-sm"
                    style={{ backgroundColor: theme.bullishColor }}
                  />
                  <input
                    type="color"
                    value={theme.bullishColor}
                    onChange={(e) => setBullishColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    title="Choose custom bullish color"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BULLISH_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    onClick={() => setBullishColor(swatch.hex)}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 border transition-all ${
                      theme.bullishColor.toLowerCase() === swatch.hex.toLowerCase()
                        ? 'border-white text-white font-bold bg-slate-800'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: swatch.hex }} />
                    <span>{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bearish Color */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-400 block">Bearish (Down Candles)</span>
                  <span className="text-[11px] text-slate-400">Red bars, negative returns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-md border border-slate-700 shadow-sm"
                    style={{ backgroundColor: theme.bearishColor }}
                  />
                  <input
                    type="color"
                    value={theme.bearishColor}
                    onChange={(e) => setBearishColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    title="Choose custom bearish color"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {BEARISH_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    onClick={() => setBearishColor(swatch.hex)}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 border transition-all ${
                      theme.bearishColor.toLowerCase() === swatch.hex.toLowerCase()
                        ? 'border-white text-white font-bold bg-slate-800'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: swatch.hex }} />
                    <span>{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Display Canvas Background Depth */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              Display Canvas Background Depth
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BG_STYLES.map((bg) => {
                const isSelected = theme.bgStyle === bg.id;
                return (
                  <button
                    key={bg.id}
                    onClick={() => setBgStyle(bg.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/50'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{bg.label}</span>
                      <span
                        className="w-3.5 h-3.5 rounded border shadow-inner"
                        style={{ backgroundColor: bg.previewBg, borderColor: bg.border }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{bg.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Chart Grid & Axis Contrast */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">Chart Grid & Axis Contrast</span>
              <span className="text-[11px] text-slate-400">Controls visibility of price gridlines and crosshairs</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
              {(['subtle', 'normal', 'high'] as ChartGridContrast[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setChartGridContrast(level)}
                  className={`px-3 py-1 rounded text-xs font-mono uppercase transition-all ${
                    theme.chartGridContrast === level
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={resetTheme}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white shadow-md hover:brightness-110 active:brightness-95 transition-all"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
