import React, { useState, useRef, useMemo } from 'react';
import type { Candle, Indicators, QuoteData } from '../types';
import { ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { detectRsiDivergences } from '../utils/divergence';
import { calculatePivotLevels } from '../utils/pivotPoints';
import { detectCandlePatterns } from '../utils/patterns';
import { calculateVolumeProfile } from '../utils/volumeProfile';
import { calculateFibLevels, type FibPoint, type FibRetracement } from '../utils/fibonacci';
import { useTheme, hexToRgba } from '../context/ThemeContext';

interface CandleChartProps {
  candles: Candle[];
  indicators: Indicators | null;
  symbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  quote: QuoteData | null;
  loading: boolean;
  source: 'live' | 'fallback';
}

const TIMEFRAMES = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1h', value: '60' },
  { label: '4h', value: '240' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
];

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  indicators,
  symbol,
  timeframe,
  onTimeframeChange,
  quote,
  loading,
  source,
}) => {
  const { theme, getCardBgClass } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showSma, setShowSma] = useState(true);
  const [showEma, setShowEma] = useState(true);
  const [showRsi, setShowRsi] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showVo, setShowVo] = useState(true);
  const [showDivergence, setShowDivergence] = useState(true);
  const [showPivotSR, setShowPivotSR] = useState(true);
  const [showPatterns, setShowPatterns] = useState(true);
  const [showVpvr, setShowVpvr] = useState(true);
  const [showFib, setShowFib] = useState(true);
  const [isDrawingFib, setIsDrawingFib] = useState(false);
  const [fibPoint1, setFibPoint1] = useState<FibPoint | null>(null);
  const [fibPreviewPoint, setFibPreviewPoint] = useState<FibPoint | null>(null);
  const [fibRetracement, setFibRetracement] = useState<FibRetracement | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Layout & Pane Geometries
  const width = 900;
  const padding = { top: 25, right: 65, left: 15 };
  const chartWidth = width - padding.left - padding.right;

  // Dynamic pane heights and tops
  const mainChartTop = padding.top;
  const mainChartHeight = 280;

  // Pane 2: RSI Sub-Chart (directly below main candles)
  const rsiHeight = 85;
  const rsiTop = mainChartTop + mainChartHeight + 35;

  // Pane 3: Volume Bars Sub-Chart (directly below RSI)
  const volHeight = 80;
  const volTop = showRsi ? rsiTop + rsiHeight + 35 : mainChartTop + mainChartHeight + 35;

  // Pane 4: Volume Oscillator Sub-Chart (directly below volume bars)
  const voHeight = 75;
  const voTop = showVolume
    ? volTop + volHeight + 35
    : showRsi
    ? rsiTop + rsiHeight + 35
    : mainChartTop + mainChartHeight + 35;

  // Total SVG height
  const height = showVo
    ? voTop + voHeight + 25
    : showVolume
    ? volTop + volHeight + 25
    : showRsi
    ? rsiTop + rsiHeight + 25
    : mainChartTop + mainChartHeight + 30;

  // Price & Volume Extents
  const { minPrice, maxVolume, priceRange } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 0, maxVolume: 100, priceRange: 100 };
    }
    let min = Infinity;
    let max = -Infinity;
    let volMax = 0;

    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > volMax) volMax = c.volume;
    });

    const range = max - min || 1;
    return {
      minPrice: min - range * 0.05,
      maxVolume: volMax || 1,
      priceRange: range * 1.1 || 1,
    };
  }, [candles]);

  // Volume 20-period Moving Average
  const volumeSma20 = useMemo(() => {
    if (!candles || candles.length < 5) return [];
    const result: (number | null)[] = [];
    let sum = 0;
    for (let i = 0; i < candles.length; i++) {
      sum += candles[i].volume;
      if (i >= 20) {
        sum -= candles[i - 20].volume;
        result.push(sum / 20);
      } else if (i === 19) {
        result.push(sum / 20);
      } else {
        result.push(null);
      }
    }
    return result;
  }, [candles]);

  // Coordinate Converters
  const getY = (val: number) => {
    return mainChartTop + mainChartHeight - ((val - minPrice) / priceRange) * mainChartHeight;
  };

  const getRsiY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return rsiTop + rsiHeight - (clamped / 100) * rsiHeight;
  };

  const getVolY = (val: number) => {
    const clamped = Math.max(0, val);
    return volTop + volHeight - (clamped / (maxVolume || 1)) * volHeight;
  };

  const candleWidth = useMemo(() => {
    if (!candles.length) return 5;
    return Math.max(2, Math.min(18, (chartWidth / candles.length) * 0.7));
  }, [candles.length, chartWidth]);

  // Volume Oscillator (VO) calculation: (ShortVolMA - LongVolMA) / LongVolMA * 100
  // Standard periods: Short = 5, Long = 10
  const shortVolPeriod = 5;
  const longVolPeriod = 10;

  const voSeries = useMemo(() => {
    if (!candles || candles.length < 2) return [];
    const result: {
      index: number;
      shortMa: number | null;
      longMa: number | null;
      oscillator: number | null;
    }[] = [];

    let sumShort = 0;
    let sumLong = 0;

    for (let i = 0; i < candles.length; i++) {
      const vol = candles[i].volume;
      sumShort += vol;
      sumLong += vol;

      if (i >= shortVolPeriod) {
        sumShort -= candles[i - shortVolPeriod].volume;
      }
      if (i >= longVolPeriod) {
        sumLong -= candles[i - longVolPeriod].volume;
      }

      const shortMa = i >= shortVolPeriod - 1 ? sumShort / shortVolPeriod : null;
      const longMa = i >= longVolPeriod - 1 ? sumLong / longVolPeriod : null;

      let vo: number | null = null;
      if (shortMa !== null && longMa !== null && longMa > 0) {
        vo = ((shortMa - longMa) / longMa) * 100;
      }

      result.push({
        index: i,
        shortMa,
        longMa,
        oscillator: vo,
      });
    }

    return result;
  }, [candles]);

  const maxVoLimit = useMemo(() => {
    let max = 20;
    voSeries.forEach((item) => {
      if (item.oscillator !== null && !isNaN(item.oscillator)) {
        const abs = Math.abs(item.oscillator);
        if (abs > max) max = abs;
      }
    });
    return Math.min(100, Math.ceil(max * 1.15));
  }, [voSeries]);

  const voCenterY = voTop + voHeight / 2;

  const getVoY = (val: number) => {
    const clamped = Math.max(-maxVoLimit, Math.min(maxVoLimit, val));
    return voCenterY - (clamped / (maxVoLimit || 1)) * (voHeight / 2);
  };

  const activeCandle = hoveredIndex !== null && candles[hoveredIndex] ? candles[hoveredIndex] : candles[candles.length - 1];
  const activeSma = hoveredIndex !== null && indicators?.sma20 ? indicators.sma20[hoveredIndex] : indicators?.sma20?.at(-1);
  const activeEma = hoveredIndex !== null && indicators?.ema20 ? indicators.ema20[hoveredIndex] : indicators?.ema20?.at(-1);
  const activeRsi = hoveredIndex !== null && indicators?.rsi14 ? indicators.rsi14[hoveredIndex] : indicators?.rsi14?.at(-1);
  const activeVolSma = hoveredIndex !== null ? volumeSma20[hoveredIndex] : volumeSma20.at(-1);
  const activeVo = hoveredIndex !== null && voSeries[hoveredIndex] ? voSeries[hoveredIndex].oscillator : voSeries.at(-1)?.oscillator;

  // Path generators for SMA & EMA lines
  const smaPoints = useMemo(() => {
    if (!indicators?.sma20 || !showSma) return '';
    return indicators.sma20
      .map((val, idx) => {
        if (val === null) return null;
        const x = padding.left + (idx + 0.5) * (chartWidth / candles.length);
        const y = getY(val);
        return `${x},${y}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [indicators?.sma20, showSma, candles.length, chartWidth, minPrice, priceRange, mainChartTop, mainChartHeight]);

  const emaPoints = useMemo(() => {
    if (!indicators?.ema20 || !showEma) return '';
    return indicators.ema20
      .map((val, idx) => {
        if (val === null) return null;
        const x = padding.left + (idx + 0.5) * (chartWidth / candles.length);
        const y = getY(val);
        return `${x},${y}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [indicators?.ema20, showEma, candles.length, chartWidth, minPrice, priceRange, mainChartTop, mainChartHeight]);

  // Path generator for RSI
  const rsiPoints = useMemo(() => {
    if (!indicators?.rsi14 || !showRsi) return '';
    return indicators.rsi14
      .map((val, idx) => {
        if (val === null) return null;
        const x = padding.left + (idx + 0.5) * (chartWidth / candles.length);
        const y = getRsiY(val);
        return `${x},${y}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [indicators?.rsi14, showRsi, candles.length, chartWidth, rsiTop, rsiHeight]);

  const rsiAreaPath = useMemo(() => {
    if (!indicators?.rsi14 || !showRsi || !candles.length) return '';
    const points: string[] = [];
    indicators.rsi14.forEach((val, idx) => {
      if (val === null) return;
      const x = padding.left + (idx + 0.5) * (chartWidth / candles.length);
      const y = getRsiY(val);
      points.push(`${x},${y}`);
    });
    if (!points.length) return '';
    const firstX = padding.left + 0.5 * (chartWidth / candles.length);
    const lastX = padding.left + (candles.length - 0.5) * (chartWidth / candles.length);
    const baselineY = getRsiY(30);
    return `M ${firstX},${baselineY} L ${points.join(' L ')} L ${lastX},${baselineY} Z`;
  }, [indicators?.rsi14, showRsi, candles.length, chartWidth, rsiTop, rsiHeight]);

  // Path generator for Volume SMA line
  const volSmaPoints = useMemo(() => {
    if (!volumeSma20.length || !showVolume) return '';
    return volumeSma20
      .map((val, idx) => {
        if (val === null) return null;
        const x = padding.left + (idx + 0.5) * (chartWidth / candles.length);
        const y = getVolY(val);
        return `${x},${y}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [volumeSma20, showVolume, candles.length, chartWidth, volTop, volHeight, maxVolume]);

  // Path generator for Volume Oscillator line
  const voPoints = useMemo(() => {
    if (!voSeries.length || !showVo) return '';
    return voSeries
      .map((item) => {
        if (item.oscillator === null) return null;
        const x = padding.left + (item.index + 0.5) * (chartWidth / candles.length);
        const y = getVoY(item.oscillator);
        return `${x},${y}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [voSeries, showVo, candles.length, chartWidth, voCenterY, maxVoLimit, voHeight]);

  // Detect RSI Bullish & Bearish Divergence Patterns
  const divergences = useMemo(() => {
    if (!showDivergence || !showRsi || !indicators?.rsi14) return [];
    return detectRsiDivergences(candles, indicators.rsi14, 3, 4, 45);
  }, [candles, indicators?.rsi14, showDivergence, showRsi]);

  const bullishDivs = useMemo(() => divergences.filter((d) => d.kind === 'bullish'), [divergences]);
  const bearishDivs = useMemo(() => divergences.filter((d) => d.kind === 'bearish'), [divergences]);

  // Daily Pivot Points & Support/Resistance Levels
  const pivotData = useMemo(() => {
    return calculatePivotLevels(candles);
  }, [candles]);

  // Real-time Candlestick Pattern Recognition on the last 5 bars
  const detectedPatterns = useMemo(() => {
    if (!showPatterns || !candles.length) return [];
    return detectCandlePatterns(candles, 5);
  }, [candles, showPatterns]);

  // Volume Profile Visible Range (VPVR) Calculation
  const vpvrData = useMemo(() => {
    if (!candles.length || !showVpvr) return null;
    return calculateVolumeProfile(candles, 28, 0.7);
  }, [candles, showVpvr]);

  // Auto-calculated Swing Low & High for Fibonacci Retracement baseline
  const autoFibPoints = useMemo(() => {
    if (!candles || candles.length < 2) return null;
    let minC = candles[0];
    let minIdx = 0;
    let maxC = candles[0];
    let maxIdx = 0;
    for (let i = 0; i < candles.length; i++) {
      if (candles[i].low < minC.low) {
        minC = candles[i];
        minIdx = i;
      }
      if (candles[i].high > maxC.high) {
        maxC = candles[i];
        maxIdx = i;
      }
    }
    const step = chartWidth / candles.length;
    // Standard retracement: from major swing point 1 to swing point 2
    const p1Idx = minIdx <= maxIdx ? minIdx : maxIdx;
    const p1Price = minIdx <= maxIdx ? minC.low : maxC.high;

    const p2Idx = minIdx <= maxIdx ? maxIdx : minIdx;
    const p2Price = minIdx <= maxIdx ? maxC.high : minC.low;

    return {
      p1: {
        x: padding.left + (p1Idx + 0.5) * step,
        y: mainChartTop + mainChartHeight - ((p1Price - minPrice) / priceRange) * mainChartHeight,
        price: p1Price,
        barIndex: p1Idx,
      },
      p2: {
        x: padding.left + (p2Idx + 0.5) * step,
        y: mainChartTop + mainChartHeight - ((p2Price - minPrice) / priceRange) * mainChartHeight,
        price: p2Price,
        barIndex: p2Idx,
      },
    };
  }, [candles, chartWidth, minPrice, priceRange, mainChartTop, mainChartHeight]);

  // Active Fibonacci Retracement anchors (user-drawn, preview during draw, or auto-swing)
  const activeFib = useMemo<FibRetracement | null>(() => {
    if (isDrawingFib && fibPoint1 && fibPreviewPoint) {
      return { p1: fibPoint1, p2: fibPreviewPoint };
    }
    if (fibRetracement) {
      return fibRetracement;
    }
    return autoFibPoints;
  }, [isDrawingFib, fibPoint1, fibPreviewPoint, fibRetracement, autoFibPoints]);

  // Calculated Fibonacci Levels
  const fibLevels = useMemo(() => {
    if (!showFib || !activeFib) return [];
    return calculateFibLevels(activeFib.p1.price, activeFib.p2.price);
  }, [showFib, activeFib]);

  // Chart Coordinate Converter for Interactive Point Selection
  const getChartCoords = (e: React.MouseEvent<SVGSVGElement>): FibPoint | null => {
    if (!svgRef.current || !candles.length) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const viewBoxX = (clientX / rect.width) * width;
    const viewBoxY = (clientY / rect.height) * height;

    const clampedY = Math.max(mainChartTop, Math.min(mainChartTop + mainChartHeight, viewBoxY));
    const price = minPrice + ((mainChartTop + mainChartHeight - clampedY) / mainChartHeight) * priceRange;

    const boundedX = Math.max(padding.left, Math.min(width - padding.right, viewBoxX));
    const step = chartWidth / candles.length;
    const idx = Math.max(0, Math.min(candles.length - 1, Math.floor((boundedX - padding.left) / step)));

    return { x: viewBoxX, y: clampedY, price, barIndex: idx };
  };

  // Handle Chart Clicks for 2-Point Fibonacci Retracement Drawing
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingFib) return;
    const pt = getChartCoords(e);
    if (!pt) return;

    if (!fibPoint1) {
      setFibPoint1(pt);
      setFibPreviewPoint(pt);
    } else {
      setFibRetracement({ p1: fibPoint1, p2: pt });
      setFibPoint1(null);
      setFibPreviewPoint(null);
      setIsDrawingFib(false);
      setShowFib(true);
    }
  };

  const handleStartDrawFib = () => {
    setIsDrawingFib(true);
    setFibPoint1(null);
    setFibPreviewPoint(null);
    setShowFib(true);
  };

  const handleCancelDrawFib = () => {
    setIsDrawingFib(false);
    setFibPoint1(null);
    setFibPreviewPoint(null);
  };

  const handleResetFib = () => {
    setFibRetracement(null);
    setFibPoint1(null);
    setFibPreviewPoint(null);
    setIsDrawingFib(false);
  };

  // Handle Mouse Move for Hover Crosshair & Fibonacci Draw Preview
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !candles.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const viewBoxX = (clientX / rect.width) * width;
    const boundedX = Math.max(padding.left, Math.min(width - padding.right, viewBoxX));
    const step = chartWidth / candles.length;
    const idx = Math.floor((boundedX - padding.left) / step);
    if (idx >= 0 && idx < candles.length) {
      setHoveredIndex(idx);
    }

    if (isDrawingFib && fibPoint1) {
      const pt = getChartCoords(e);
      if (pt) {
        setFibPreviewPoint(pt);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Price & Volume Formatters
  const formatPrice = (p: number) => {
    if (p < 0.01) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    if (p > 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return p.toFixed(2);
  };

  const formatVolumeValue = (v: number) => {
    if (!v) return '0';
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString();
  };

  const currentPrice = quote?.lp ?? activeCandle?.close ?? 0;
  const priceChange = quote?.ch ?? (activeCandle ? activeCandle.close - activeCandle.open : 0);
  const priceChangePct = quote?.chp ?? (activeCandle && activeCandle.open ? ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100 : 0);
  const isPositive = priceChange >= 0;

  return (
    <div className={`${getCardBgClass()} border rounded-xl overflow-hidden shadow-xl transition-colors`}>
      {/* Chart Top Control Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
        {/* Symbol Overview */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-mono tracking-tight text-white">{symbol}</h2>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                  source === 'live'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
                title={source === 'live' ? 'Connected to live TradingView endpoint' : 'Using cached/fallback dataset'}
              >
                <Zap className="w-2.5 h-2.5" />
                {source === 'live' ? 'Live TV' : 'Simulated'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-bold font-mono text-white tracking-tight">
                ${formatPrice(currentPrice)}
              </span>
              <span
                className="flex items-center text-xs font-mono font-semibold"
                style={{ color: isPositive ? theme.bullishColor : theme.bearishColor }}
              >
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {isPositive ? '+' : ''}
                {priceChange.toFixed(2)} ({isPositive ? '+' : ''}
                {priceChangePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe Selector & Overlay Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Timeframes */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => onTimeframeChange(tf.value)}
                style={timeframe === tf.value ? { backgroundColor: theme.primaryColor } : undefined}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                  timeframe === tf.value
                    ? 'text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Indicator toggles */}
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => setShowSma(!showSma)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showSma
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              SMA 20
            </button>
            <button
              onClick={() => setShowEma(!showEma)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showEma
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              EMA 20
            </button>
            <button
              onClick={() => setShowRsi(!showRsi)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showRsi
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              RSI 14
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showVolume
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              VOL
            </button>
            <button
              onClick={() => setShowVo(!showVo)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showVo
                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Toggle Volume Oscillator (Short 5 / Long 10)"
            >
              VO
            </button>
            <button
              onClick={() => setShowPivotSR(!showPivotSR)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showPivotSR
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Toggle Daily Pivot Points & Support/Resistance Levels (R2, R1, P, S1, S2)"
            >
              P-S/R
            </button>
            <button
              onClick={() => setShowDivergence(!showDivergence)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showDivergence
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Toggle RSI Bullish & Bearish Divergence Patterns"
            >
              DIV {divergences.length > 0 ? `(${divergences.length})` : ''}
            </button>
            <button
              onClick={() => setShowPatterns(!showPatterns)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showPatterns
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Toggle Candlestick Pattern Badges (Last 5 Bars: Engulfing, Doji, Hammer, Shooting Star)"
            >
              PAT {detectedPatterns.length > 0 ? `(${detectedPatterns.length})` : ''}
            </button>
            <button
              onClick={() => setShowVpvr(!showVpvr)}
              className={`px-2 py-1 text-[11px] font-mono rounded border transition-all ${
                showVpvr
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-300 font-bold shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Toggle Volume Profile Visible Range (VPVR) Side-Chart & POC Level"
            >
              VPVR
            </button>

            {/* Fibonacci Retracement Tool Controls */}
            <div className="flex items-center rounded border border-slate-800 bg-slate-900 overflow-hidden shadow-xs">
              <button
                onClick={() => setShowFib(!showFib)}
                className={`px-2 py-1 text-[11px] font-mono transition-all ${
                  showFib
                    ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
                title="Toggle Fibonacci Retracement Overlays"
              >
                FIB
              </button>
              <button
                onClick={handleStartDrawFib}
                className={`px-2 py-1 text-[11px] font-mono border-l border-slate-800 transition-all ${
                  isDrawingFib
                    ? 'bg-indigo-600 text-white font-bold animate-pulse'
                    : 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/40'
                }`}
                title="Click 2 points on chart to draw custom Fibonacci Retracement"
              >
                {isDrawingFib ? '● Drawing...' : '✎ Draw'}
              </button>
              {fibRetracement && (
                <button
                  onClick={handleResetFib}
                  className="px-1.5 py-1 text-[10px] font-mono text-slate-400 hover:text-rose-400 border-l border-slate-800"
                  title="Reset to Auto Swing High/Low Anchors"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OHLCV Crosshair Stats Bar */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 text-[11px] font-mono flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
        <div>
          <span className="text-slate-500 mr-1">Time:</span>
          <span className="text-slate-200">
            {activeCandle?.time ? new Date(activeCandle.time * 1000).toLocaleString() : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 mr-1">O:</span>
          <span className="text-slate-200">${formatPrice(activeCandle?.open || 0)}</span>
        </div>
        <div>
          <span className="text-slate-500 mr-1">H:</span>
          <span className="text-emerald-400">${formatPrice(activeCandle?.high || 0)}</span>
        </div>
        <div>
          <span className="text-slate-500 mr-1">L:</span>
          <span className="text-rose-400">${formatPrice(activeCandle?.low || 0)}</span>
        </div>
        <div>
          <span className="text-slate-500 mr-1">C:</span>
          <span className="text-slate-100 font-bold">${formatPrice(activeCandle?.close || 0)}</span>
        </div>
        <div>
          <span className="text-slate-500 mr-1">Vol:</span>
          <span className="text-slate-200 font-bold">{formatVolumeValue(activeCandle?.volume || 0)}</span>
        </div>
        {showSma && activeSma && (
          <div>
            <span className="text-amber-400 mr-1">SMA20:</span>
            <span className="text-slate-200">${formatPrice(activeSma)}</span>
          </div>
        )}
        {showEma && activeEma && (
          <div>
            <span className="text-cyan-400 mr-1">EMA20:</span>
            <span className="text-slate-200">${formatPrice(activeEma)}</span>
          </div>
        )}
        {showRsi && activeRsi && (
          <div>
            <span className="text-purple-400 mr-1">RSI14:</span>
            <span className={`font-bold ${activeRsi >= 70 ? 'text-rose-400' : activeRsi <= 30 ? 'text-emerald-400' : 'text-slate-200'}`}>
              {activeRsi.toFixed(1)}
            </span>
          </div>
        )}
        {showVo && activeVo !== null && activeVo !== undefined && (
          <div>
            <span className="text-sky-400 mr-1">VO(5,10):</span>
            <span
              className={`font-bold ${
                activeVo >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {activeVo >= 0 ? '+' : ''}
              {activeVo.toFixed(1)}%
            </span>
          </div>
        )}
        {showPivotSR && pivotData && (
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <span className="text-amber-400 font-bold">P:</span>
            <span className="text-amber-200 font-mono">${formatPrice(pivotData.pivotPrice)}</span>
            <span className="text-rose-400 font-bold">R1:</span>
            <span className="text-rose-200 font-mono">${formatPrice(pivotData.levels[1]?.price || 0)}</span>
            <span className="text-emerald-400 font-bold">S1:</span>
            <span className="text-emerald-200 font-mono">${formatPrice(pivotData.levels[3]?.price || 0)}</span>
          </div>
        )}
        {showVpvr && vpvrData && (
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <span className="text-amber-400 font-bold">POC:</span>
            <span className="text-amber-200 font-mono">${formatPrice(vpvrData.pocPrice)}</span>
            <span className="text-sky-400 font-bold">VAH:</span>
            <span className="text-sky-200 font-mono">${formatPrice(vpvrData.vahPrice)}</span>
            <span className="text-sky-400 font-bold">VAL:</span>
            <span className="text-sky-200 font-mono">${formatPrice(vpvrData.valPrice)}</span>
          </div>
        )}
        {showFib && fibLevels.length > 0 && (
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <span className="text-indigo-400 font-bold">FIB:</span>
            <span className="text-emerald-400 font-mono text-[10px]">
              0.382: ${formatPrice(fibLevels.find((l) => l.ratio === 0.382)?.price || 0)}
            </span>
            <span className="text-amber-400 font-mono text-[10px]">
              0.500: ${formatPrice(fibLevels.find((l) => l.ratio === 0.5)?.price || 0)}
            </span>
            <span className="text-rose-400 font-mono text-[10px]">
              0.618: ${formatPrice(fibLevels.find((l) => l.ratio === 0.618)?.price || 0)}
            </span>
          </div>
        )}
        {showPatterns && detectedPatterns.length > 0 && (
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            {detectedPatterns.map((pat) => (
              <span
                key={`stat-pat-${pat.id}`}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border"
                style={{
                  backgroundColor: pat.bgColor,
                  borderColor: pat.color,
                  color: pat.textColor,
                }}
                title={pat.description}
              >
                <span>{pat.icon}</span>
                <span>{pat.shortLabel}</span>
              </span>
            ))}
          </div>
        )}
        {showDivergence && showRsi && divergences.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            {bullishDivs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ▲ {bullishDivs.length} Bull Div
              </span>
            )}
            {bearishDivs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-300 border border-rose-500/30">
                ▼ {bearishDivs.length} Bear Div
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Multi-Pane SVG Chart Container */}
      <div className="relative w-full aspect-[16/11] min-h-[500px] max-h-[760px] bg-slate-950/80">
        {/* Interactive Drawing Guidance Banner */}
        {isDrawingFib && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-indigo-500/80 shadow-2xl px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-3 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span className="text-indigo-100 font-medium">
              {!fibPoint1
                ? 'Fibonacci Tool: Click swing origin point on chart (Point 1)'
                : 'Fibonacci Tool: Move mouse & click anchor point (Point 2)'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelDrawFib();
              }}
              className="px-2 py-0.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded border border-rose-500/40 text-[10px] font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-xs font-mono text-slate-400">Loading candles from TradingView...</span>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full h-full select-none ${isDrawingFib ? 'cursor-crosshair' : 'cursor-crosshair'}`}
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="rsiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* ========================================================= */}
          {/* PANE 1: MAIN CANDLESTICK CHART                            */}
          {/* ========================================================= */}
          {/* Horizontal Grid lines & Price Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const price = minPrice + (1 - pct) * priceRange;
            const y = mainChartTop + pct * mainChartHeight;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={width - padding.right + 8}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  {formatPrice(price)}
                </text>
              </g>
            );
          })}

          {/* ========================================================= */}
          {/* VOLUME PROFILE VISIBLE RANGE (VPVR) SIDE-CHART            */}
          {/* ========================================================= */}
          {showVpvr && vpvrData && (
            <g opacity="0.95">
              {/* Subtle side-chart backdrop */}
              <rect
                x={width - padding.right - Math.min(130, chartWidth * 0.22)}
                y={mainChartTop}
                width={Math.min(130, chartWidth * 0.22)}
                height={mainChartHeight}
                fill="rgba(15, 23, 42, 0.45)"
                stroke="#334155"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />

              {/* Volume Profile Bars (Horizontal Price Tiers) */}
              {vpvrData.bins.map((bin) => {
                const yTop = getY(bin.priceHigh);
                const yBottom = getY(bin.priceLow);
                const barY = Math.min(yTop, yBottom);
                const barHeight = Math.max(1.5, Math.abs(yBottom - yTop) - 0.5);

                const maxVpvrWidth = Math.min(130, chartWidth * 0.22);
                const totalBarWidth = (bin.totalVolume / vpvrData.maxBinVolume) * maxVpvrWidth;
                const buyBarWidth = (bin.buyVolume / vpvrData.maxBinVolume) * maxVpvrWidth;
                const sellBarWidth = (bin.sellVolume / vpvrData.maxBinVolume) * maxVpvrWidth;

                const vpvrRight = width - padding.right;
                const inValueArea = bin.isValueArea;

                return (
                  <g key={`vpvr-bin-${bin.binIndex}`}>
                    {/* Buy Volume Bar (Green) */}
                    <rect
                      x={vpvrRight - totalBarWidth}
                      y={barY}
                      width={buyBarWidth}
                      height={barHeight}
                      fill={inValueArea ? 'rgba(34, 197, 94, 0.65)' : 'rgba(34, 197, 94, 0.28)'}
                      stroke={bin.isPoc ? '#f59e0b' : 'none'}
                      strokeWidth={bin.isPoc ? 0.8 : 0}
                    />

                    {/* Sell Volume Bar (Red) */}
                    <rect
                      x={vpvrRight - sellBarWidth}
                      y={barY}
                      width={sellBarWidth}
                      height={barHeight}
                      fill={inValueArea ? 'rgba(239, 68, 68, 0.65)' : 'rgba(239, 68, 68, 0.28)'}
                      stroke={bin.isPoc ? '#f59e0b' : 'none'}
                      strokeWidth={bin.isPoc ? 0.8 : 0}
                    />
                  </g>
                );
              })}

              {/* Value Area High (VAH 70%) Line */}
              <line
                x1={padding.left}
                y1={getY(vpvrData.vahPrice)}
                x2={width - padding.right}
                y2={getY(vpvrData.vahPrice)}
                stroke="#60a5fa"
                strokeDasharray="4 2"
                strokeWidth="1.2"
                opacity="0.85"
              />
              <rect
                x={width - padding.right - 54}
                y={getY(vpvrData.vahPrice) - 13}
                width={52}
                height={12}
                fill="rgba(30, 58, 138, 0.9)"
                stroke="#60a5fa"
                strokeWidth="0.8"
                rx="2"
              />
              <text
                x={width - padding.right - 28}
                y={getY(vpvrData.vahPrice) - 4}
                fill="#93c5fd"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                VAH (70%)
              </text>

              {/* Point of Control (POC) Line across chart */}
              <line
                x1={padding.left}
                y1={getY(vpvrData.pocPrice)}
                x2={width - padding.right}
                y2={getY(vpvrData.pocPrice)}
                stroke="#f59e0b"
                strokeDasharray="5 2"
                strokeWidth="1.6"
                opacity="0.95"
              />
              <rect
                x={width - padding.right - 62}
                y={getY(vpvrData.pocPrice) - 7}
                width={60}
                height={14}
                fill="rgba(120, 53, 15, 0.95)"
                stroke="#f59e0b"
                strokeWidth="1"
                rx="2"
              />
              <text
                x={width - padding.right - 32}
                y={getY(vpvrData.pocPrice) + 3}
                fill="#fde68a"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                POC ${formatPrice(vpvrData.pocPrice)}
              </text>

              {/* Value Area Low (VAL 70%) Line */}
              <line
                x1={padding.left}
                y1={getY(vpvrData.valPrice)}
                x2={width - padding.right}
                y2={getY(vpvrData.valPrice)}
                stroke="#60a5fa"
                strokeDasharray="4 2"
                strokeWidth="1.2"
                opacity="0.85"
              />
              <rect
                x={width - padding.right - 54}
                y={getY(vpvrData.valPrice) + 1}
                width={52}
                height={12}
                fill="rgba(30, 58, 138, 0.9)"
                stroke="#60a5fa"
                strokeWidth="0.8"
                rx="2"
              />
              <text
                x={width - padding.right - 28}
                y={getY(vpvrData.valPrice) + 10}
                fill="#93c5fd"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                VAL (70%)
              </text>
            </g>
          )}

          {/* Candlesticks (Wicks and Bodies) */}
          {candles.map((c, i) => {
            const step = chartWidth / candles.length;
            const centerX = padding.left + i * step + step / 2;
            const x = centerX - candleWidth / 2;
            const isGreen = c.close >= c.open;
            const color = isGreen ? theme.bullishColor : theme.bearishColor;

            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

            return (
              <g key={`candle-${i}`}>
                {/* Wick */}
                <line
                  x1={centerX}
                  y1={highY}
                  x2={centerX}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />
                {/* Body */}
                <rect
                  x={x}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* SMA 20 Overlay Line */}
          {showSma && smaPoints && (
            <polyline
              points={smaPoints}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* EMA 20 Overlay Line */}
          {showEma && emaPoints && (
            <polyline
              points={emaPoints}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Daily Horizontal Support & Resistance Levels (Pivot Point Based) */}
          {showPivotSR && pivotData && (
            <g>
              {pivotData.levels.map((lvl) => {
                const y = getY(lvl.price);
                // Only render if within or near visible main chart vertical bounds
                if (y < mainChartTop - 15 || y > mainChartTop + mainChartHeight + 15) {
                  return null;
                }

                const isP = lvl.id === 'pivot';
                const strokeDash = isP ? '6 3' : '4 3';
                const strokeWidth = isP ? '1.5' : '1.2';

                return (
                  <g key={`pivot-sr-${lvl.id}`}>
                    {/* Horizontal S/R Line across the chart */}
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke={lvl.color}
                      strokeDasharray={strokeDash}
                      strokeWidth={strokeWidth}
                      opacity="0.85"
                    />

                    {/* In-Chart Left Label (Level Name & Price) */}
                    <rect
                      x={padding.left + 4}
                      y={y - 8}
                      width={lvl.name === 'P' ? 48 : 56}
                      height={14}
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke={lvl.color}
                      strokeWidth="0.8"
                      rx="2"
                    />
                    <text
                      x={padding.left + (lvl.name === 'P' ? 28 : 32)}
                      y={y + 2.5}
                      fill={lvl.textColor}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {lvl.name}: ${formatPrice(lvl.price)}
                    </text>

                    {/* Axis Right Pill Badge */}
                    <rect
                      x={width - padding.right + 2}
                      y={y - 7}
                      width={60}
                      height={14}
                      fill={lvl.bgColor}
                      stroke={lvl.color}
                      strokeWidth="0.8"
                      rx="2"
                    />
                    <text
                      x={width - padding.right + 5}
                      y={y + 3}
                      fill={lvl.textColor}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {lvl.name} {formatPrice(lvl.price)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Main Chart Divergence Price Pivot Rays & Badges */}
          {showDivergence && showRsi && (
            <g>
              {divergences.map((d) => {
                const step = chartWidth / candles.length;
                const x1 = padding.left + (d.prevBar + 0.5) * step;
                const x2 = padding.left + (d.curBar + 0.5) * step;
                const isBull = d.kind === 'bullish';
                const y1 = getY(d.prevPrice);
                const y2 = getY(d.curPrice);
                const color = isBull ? '#10b981' : '#f43f5e';

                return (
                  <g key={`main-div-${d.id}`}>
                    {/* Connecting dashed trendline across price pivots */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={color}
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                      opacity="0.9"
                    />
                    {/* Pivot Dots on Candles */}
                    <circle cx={x1} cy={y1} r="3" fill={color} stroke="#ffffff" strokeWidth="1" />
                    <circle cx={x2} cy={y2} r="3.5" fill={color} stroke="#ffffff" strokeWidth="1.5" />
                    {/* Price Marker Triangle */}
                    <polygon
                      points={
                        isBull
                          ? `${x2},${y2 + 6} ${x2 - 4},${y2 + 13} ${x2 + 4},${y2 + 13}`
                          : `${x2},${y2 - 6} ${x2 - 4},${y2 - 13} ${x2 + 4},${y2 - 13}`
                      }
                      fill={color}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Real-time Candlestick Pattern Badges (Last 5 Bars) */}
          {showPatterns && detectedPatterns.length > 0 && (
            <g>
              {detectedPatterns.map((pat) => {
                const step = chartWidth / candles.length;
                const candleX = padding.left + (pat.barIndex + 0.5) * step;
                const isBullish = pat.type === 'bullish';
                // Anchor above candle high or below candle low
                const anchorY = isBullish ? getY(pat.candle.low) : getY(pat.candle.high);
                const badgeY = isBullish
                  ? Math.min(mainChartTop + mainChartHeight - 16, anchorY + 14)
                  : Math.max(mainChartTop + 2, anchorY - 24);
                const badgeWidth = pat.shortLabel.length > 10 ? 82 : 72;

                return (
                  <g key={`pat-badge-${pat.id}`}>
                    {/* Connecting guide line from wick to badge */}
                    <line
                      x1={candleX}
                      y1={anchorY}
                      x2={candleX}
                      y2={isBullish ? badgeY : badgeY + 15}
                      stroke={pat.color}
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                      opacity="0.85"
                    />

                    {/* Small anchor dot on wick */}
                    <circle
                      cx={candleX}
                      cy={anchorY}
                      r="2.5"
                      fill={pat.color}
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />

                    {/* Badge Pill Background */}
                    <rect
                      x={candleX - badgeWidth / 2}
                      y={badgeY}
                      width={badgeWidth}
                      height={15}
                      fill={pat.bgColor}
                      stroke={pat.color}
                      strokeWidth="1"
                      rx="3"
                    />

                    {/* Badge Content Text */}
                    <text
                      x={candleX}
                      y={badgeY + 10.5}
                      fill={pat.textColor}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pat.icon} {pat.shortLabel}
                    </text>
                    <title>{`${pat.name} (${pat.type.toUpperCase()}): ${pat.description}`}</title>
                  </g>
                );
              })}
            </g>
          )}

          {/* ========================================================= */}
          {/* FIBONACCI RETRACEMENT OVERLAYS & GOLDEN POCKET            */}
          {/* ========================================================= */}
          {showFib && activeFib && fibLevels.length > 0 && (
            <g id="fibonacci-retracement-overlays">
              {/* Shaded Golden Pocket Zone (0.500 to 0.618) */}
              {(() => {
                const l500 = fibLevels.find((l) => l.ratio === 0.5);
                const l618 = fibLevels.find((l) => l.ratio === 0.618);
                if (!l500 || !l618) return null;
                const y1 = getY(l500.price);
                const y2 = getY(l618.price);
                const topY = Math.max(mainChartTop, Math.min(y1, y2));
                const bottomY = Math.min(mainChartTop + mainChartHeight, Math.max(y1, y2));
                const zoneHeight = Math.max(0, bottomY - topY);
                if (zoneHeight <= 0) return null;

                return (
                  <g key="fib-golden-pocket-zone">
                    <rect
                      x={padding.left}
                      y={topY}
                      width={chartWidth}
                      height={zoneHeight}
                      fill="rgba(244, 63, 94, 0.12)"
                    />
                    {/* Golden Pocket Banner Label */}
                    <text
                      x={width - padding.right - 8}
                      y={topY + zoneHeight / 2 + 3}
                      fill="#fda4af"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="end"
                      opacity="0.8"
                    >
                      ★ GOLDEN POCKET (0.500 - 0.618)
                    </text>
                  </g>
                );
              })()}

              {/* Shaded 0.382 to 0.500 Retracement Zone */}
              {(() => {
                const l382 = fibLevels.find((l) => l.ratio === 0.382);
                const l500 = fibLevels.find((l) => l.ratio === 0.5);
                if (!l382 || !l500) return null;
                const y1 = getY(l382.price);
                const y2 = getY(l500.price);
                const topY = Math.max(mainChartTop, Math.min(y1, y2));
                const bottomY = Math.min(mainChartTop + mainChartHeight, Math.max(y1, y2));
                const zoneHeight = Math.max(0, bottomY - topY);
                if (zoneHeight <= 0) return null;

                return (
                  <rect
                    key="fib-382-500-zone"
                    x={padding.left}
                    y={topY}
                    width={chartWidth}
                    height={zoneHeight}
                    fill="rgba(52, 211, 153, 0.06)"
                  />
                );
              })()}

              {/* Connecting Anchor Trendline between Point 1 and Point 2 */}
              <line
                x1={activeFib.p1.x}
                y1={getY(activeFib.p1.price)}
                x2={activeFib.p2.x}
                y2={getY(activeFib.p2.price)}
                stroke="#818cf8"
                strokeWidth="1.6"
                strokeDasharray="4 3"
                opacity="0.8"
              />

              {/* Anchor Handles & Origin Labels */}
              <g>
                {/* Point 1 Handle */}
                <circle
                  cx={activeFib.p1.x}
                  cy={getY(activeFib.p1.price)}
                  r="4"
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <rect
                  x={activeFib.p1.x - 32}
                  y={getY(activeFib.p1.price) - 18}
                  width="64"
                  height="14"
                  fill="rgba(30, 27, 75, 0.88)"
                  stroke="#818cf8"
                  strokeWidth="0.8"
                  rx="2"
                />
                <text
                  x={activeFib.p1.x}
                  y={getY(activeFib.p1.price) - 8}
                  fill="#c7d2fe"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  P1: ${formatPrice(activeFib.p1.price)}
                </text>

                {/* Point 2 Handle */}
                <circle
                  cx={activeFib.p2.x}
                  cy={getY(activeFib.p2.price)}
                  r="4.5"
                  fill="#ec4899"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <rect
                  x={activeFib.p2.x - 32}
                  y={getY(activeFib.p2.price) + 6}
                  width="64"
                  height="14"
                  fill="rgba(76, 5, 25, 0.88)"
                  stroke="#f43f5e"
                  strokeWidth="0.8"
                  rx="2"
                />
                <text
                  x={activeFib.p2.x}
                  y={getY(activeFib.p2.price) + 16}
                  fill="#fbcfe8"
                  fontSize="8.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  P2: ${formatPrice(activeFib.p2.price)}
                </text>
              </g>

              {/* Horizontal Fibonacci Retracement Levels & Badges */}
              {fibLevels.map((lvl) => {
                const y = getY(lvl.price);
                // Keep within reasonable display bounds
                if (y < mainChartTop - 12 || y > mainChartTop + mainChartHeight + 12) {
                  return null;
                }

                const isKey = lvl.isKey;
                const isGolden = lvl.isGoldenPocket;
                const strokeWidth = isGolden ? '1.8' : isKey ? '1.5' : '1';
                const strokeDash = isKey ? 'none' : '4 3';

                return (
                  <g key={`fib-lvl-${lvl.ratio}`}>
                    {/* Horizontal Overlay Line */}
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke={lvl.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      opacity={isGolden ? '0.95' : isKey ? '0.85' : '0.55'}
                    />

                    {/* In-Chart Left Pill Badge (Ratio, Name, Price) */}
                    <rect
                      x={padding.left + 4}
                      y={y - 8}
                      width={isGolden ? 124 : isKey ? 100 : 90}
                      height={15}
                      fill={lvl.bgColor}
                      stroke={lvl.color}
                      strokeWidth={isKey ? '1' : '0.8'}
                      rx="3"
                    />
                    <text
                      x={padding.left + 8}
                      y={y + 3}
                      fill={lvl.textColor}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight={isKey ? 'bold' : 'normal'}
                    >
                      {isGolden ? '★ ' : ''}
                      {lvl.name} ({lvl.ratio === 0 ? '0%' : lvl.ratio === 1 ? '100%' : `${(lvl.ratio * 100).toFixed(1)}%`}) : ${formatPrice(lvl.price)}
                    </text>

                    {/* Right Price Scale Axis Badge */}
                    <rect
                      x={width - padding.right + 2}
                      y={y - 7}
                      width={62}
                      height={14}
                      fill={lvl.bgColor}
                      stroke={lvl.color}
                      strokeWidth="0.8"
                      rx="2"
                    />
                    <text
                      x={width - padding.right + 5}
                      y={y + 3}
                      fill={lvl.textColor}
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight={isKey ? 'bold' : 'normal'}
                    >
                      {lvl.name} {formatPrice(lvl.price)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* ========================================================= */}
          {/* PANE 2: RSI (Relative Strength Index) SUB-CHART           */}
          {/* ========================================================= */}
          {showRsi && (
            <g>
              {/* RSI Sub-Panel Background & Separator */}
              <rect
                x={padding.left}
                y={rsiTop - 18}
                width={chartWidth}
                height={rsiHeight + 28}
                fill="rgba(15, 23, 42, 0.4)"
                rx="4"
              />
              <line
                x1={padding.left}
                y1={rsiTop - 18}
                x2={width - padding.right}
                y2={rsiTop - 18}
                stroke="#334155"
                strokeWidth="1.2"
              />

              {/* RSI Sub-Panel Header Information */}
              <text
                x={padding.left + 8}
                y={rsiTop - 4}
                fill="#c084fc"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                RSI (14, Close):
              </text>
              <text
                x={padding.left + 115}
                y={rsiTop - 4}
                fill={activeRsi && activeRsi >= 70 ? '#f87171' : activeRsi && activeRsi <= 30 ? '#4ade80' : '#e2e8f0'}
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {activeRsi ? activeRsi.toFixed(1) : '—'}
              </text>
              {activeRsi !== undefined && activeRsi !== null && (
                <text
                  x={padding.left + 160}
                  y={rsiTop - 4}
                  fill={activeRsi >= 70 ? '#f87171' : activeRsi <= 30 ? '#4ade80' : '#94a3b8'}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  [{activeRsi >= 70 ? 'OVERBOUGHT (>70)' : activeRsi <= 30 ? 'OVERSOLD (<30)' : 'NEUTRAL'}]
                </text>
              )}

              {/* RSI Divergence Counts in Header */}
              {showDivergence && (
                <g>
                  {bullishDivs.length > 0 && (
                    <text
                      x={padding.left + 300}
                      y={rsiTop - 4}
                      fill="#10b981"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ▲ {bullishDivs.length} Bull Div
                    </text>
                  )}
                  {bearishDivs.length > 0 && (
                    <text
                      x={padding.left + (bullishDivs.length > 0 ? 395 : 300)}
                      y={rsiTop - 4}
                      fill="#f43f5e"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ▼ {bearishDivs.length} Bear Div
                    </text>
                  )}
                </g>
              )}

              {/* Overbought Background Zone (>70) */}
              <rect
                x={padding.left}
                y={rsiTop}
                width={chartWidth}
                height={Math.max(0, getRsiY(70) - rsiTop)}
                fill="rgba(244, 63, 94, 0.07)"
              />

              {/* Oversold Background Zone (<30) */}
              <rect
                x={padding.left}
                y={getRsiY(30)}
                width={chartWidth}
                height={Math.max(0, rsiTop + rsiHeight - getRsiY(30))}
                fill="rgba(16, 185, 129, 0.07)"
              />

              {/* Shaded Neutral Channel between 30 and 70 */}
              <rect
                x={padding.left}
                y={getRsiY(70)}
                width={chartWidth}
                height={Math.max(1, getRsiY(30) - getRsiY(70))}
                fill="rgba(168, 85, 247, 0.05)"
              />

              {/* Horizontal Threshold Line at 70 (Overbought) */}
              <line
                x1={padding.left}
                y1={getRsiY(70)}
                x2={width - padding.right}
                y2={getRsiY(70)}
                stroke="#f43f5e"
                strokeDasharray="4 3"
                strokeWidth="1.2"
                opacity="0.9"
              />
              <text
                x={padding.left + 6}
                y={getRsiY(70) - 4}
                fill="#fda4af"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="600"
                opacity="0.85"
              >
                70 — OVERBOUGHT THRESHOLD
              </text>
              <rect
                x={width - padding.right + 2}
                y={getRsiY(70) - 7}
                width={26}
                height={14}
                fill="rgba(244, 63, 94, 0.25)"
                stroke="#f43f5e"
                strokeWidth="0.8"
                rx="2"
              />
              <text
                x={width - padding.right + 7}
                y={getRsiY(70) + 3}
                fill="#fda4af"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                70
              </text>

              {/* Midline Level 50 */}
              <line
                x1={padding.left}
                y1={getRsiY(50)}
                x2={width - padding.right}
                y2={getRsiY(50)}
                stroke="#475569"
                strokeDasharray="2 3"
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x={width - padding.right + 8}
                y={getRsiY(50) + 3}
                fill="#64748b"
                fontSize="8.5"
                fontFamily="monospace"
              >
                50
              </text>

              {/* Horizontal Threshold Line at 30 (Oversold) */}
              <line
                x1={padding.left}
                y1={getRsiY(30)}
                x2={width - padding.right}
                y2={getRsiY(30)}
                stroke="#10b981"
                strokeDasharray="4 3"
                strokeWidth="1.2"
                opacity="0.9"
              />
              <text
                x={padding.left + 6}
                y={getRsiY(30) + 11}
                fill="#6ee7b7"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="600"
                opacity="0.85"
              >
                30 — OVERSOLD THRESHOLD
              </text>
              <rect
                x={width - padding.right + 2}
                y={getRsiY(30) - 7}
                width={26}
                height={14}
                fill="rgba(16, 185, 129, 0.25)"
                stroke="#10b981"
                strokeWidth="0.8"
                rx="2"
              />
              <text
                x={width - padding.right + 7}
                y={getRsiY(30) + 3}
                fill="#6ee7b7"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                30
              </text>

              {/* Shaded Area under RSI Curve */}
              {rsiAreaPath && (
                <path
                  d={rsiAreaPath}
                  fill="url(#rsiGradient)"
                  opacity="0.8"
                />
              )}

              {/* RSI Curve Line */}
              {rsiPoints && (
                <polyline
                  points={rsiPoints}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Active Hover Dot on RSI Curve */}
              {hoveredIndex !== null && indicators?.rsi14?.[hoveredIndex] !== null && indicators?.rsi14?.[hoveredIndex] !== undefined && (
                <circle
                  cx={padding.left + (hoveredIndex + 0.5) * (chartWidth / candles.length)}
                  cy={getRsiY(indicators.rsi14[hoveredIndex] as number)}
                  r="3.5"
                  fill="#c084fc"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}

              {/* RSI Sub-Chart Divergence Trendlines, Pivot Circles & Badges */}
              {showDivergence && (
                <g>
                  {divergences.map((d) => {
                    const step = chartWidth / candles.length;
                    const x1 = padding.left + (d.prevBar + 0.5) * step;
                    const y1 = getRsiY(d.prevRsi);
                    const x2 = padding.left + (d.curBar + 0.5) * step;
                    const y2 = getRsiY(d.curRsi);
                    const isBull = d.kind === 'bullish';
                    const color = isBull ? '#10b981' : '#f43f5e';
                    const badgeY = isBull
                      ? Math.min(rsiTop + rsiHeight - 16, y2 + 8)
                      : Math.max(rsiTop + 2, y2 - 20);

                    return (
                      <g key={`rsi-div-${d.id}`}>
                        {/* Connecting trendline ray between RSI pivots */}
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={color}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        {/* Pivot dots on the RSI line */}
                        <circle cx={x1} cy={y1} r="3" fill={color} stroke="#ffffff" strokeWidth="1.2" />
                        <circle cx={x2} cy={y2} r="3.5" fill={color} stroke="#ffffff" strokeWidth="1.5" />

                        {/* Divergence Label Badge */}
                        <rect
                          x={x2 - 27}
                          y={badgeY}
                          width={54}
                          height={14}
                          fill={isBull ? 'rgba(6, 78, 59, 0.95)' : 'rgba(136, 19, 55, 0.95)'}
                          stroke={color}
                          strokeWidth="0.8"
                          rx="3"
                        />
                        <text
                          x={x2}
                          y={badgeY + 10}
                          fill={isBull ? '#6ee7b7' : '#fda4af'}
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {isBull ? '▲ Bull Div' : '▼ Bear Div'}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* ========================================================= */}
          {/* PANE 3: VOLUME BARS SUB-CHART (BELOW RSI INDICATOR)       */}
          {/* ========================================================= */}
          {showVolume && (
            <g>
              {/* Volume Sub-Panel Background & Separator */}
              <rect
                x={padding.left}
                y={volTop - 18}
                width={chartWidth}
                height={volHeight + 28}
                fill="rgba(15, 23, 42, 0.4)"
                rx="4"
              />
              <line
                x1={padding.left}
                y1={volTop - 18}
                x2={width - padding.right}
                y2={volTop - 18}
                stroke="#334155"
                strokeWidth="1.2"
              />

              {/* Volume Sub-Panel Header Information */}
              <text
                x={padding.left + 8}
                y={volTop - 4}
                fill="#94a3b8"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Volume:
              </text>
              <text
                x={padding.left + 65}
                y={volTop - 4}
                fill={activeCandle?.close >= activeCandle?.open ? theme.bullishColor : theme.bearishColor}
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {formatVolumeValue(activeCandle?.volume || 0)}
              </text>
              {activeVolSma !== null && activeVolSma !== undefined && (
                <text
                  x={padding.left + 155}
                  y={volTop - 4}
                  fill="#f59e0b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  SMA20 Vol: {formatVolumeValue(activeVolSma)}
                </text>
              )}

              {/* Horizontal Volume Guide Lines */}
              <line
                x1={padding.left}
                y1={getVolY(maxVolume / 2)}
                x2={width - padding.right}
                y2={getVolY(maxVolume / 2)}
                stroke="#1e293b"
                strokeDasharray="2 2"
                strokeWidth="1"
                opacity="0.6"
              />
              <line
                x1={padding.left}
                y1={volTop + volHeight}
                x2={width - padding.right}
                y2={volTop + volHeight}
                stroke="#334155"
                strokeWidth="1"
                opacity="0.6"
              />

              {/* Volume Y-Axis Right Labels */}
              <text
                x={width - padding.right + 8}
                y={volTop + 8}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                {formatVolumeValue(maxVolume)}
              </text>
              <text
                x={width - padding.right + 8}
                y={volTop + volHeight / 2 + 3}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                {formatVolumeValue(maxVolume / 2)}
              </text>
              <text
                x={width - padding.right + 8}
                y={volTop + volHeight}
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                0
              </text>

              {/* Volume Bars */}
              {candles.map((c, i) => {
                const step = chartWidth / candles.length;
                const x = padding.left + i * step + (step - candleWidth) / 2;
                const barHeight = Math.max(1.5, (c.volume / (maxVolume || 1)) * volHeight);
                const y = volTop + volHeight - barHeight;
                const isGreen = c.close >= c.open;
                const isHovered = hoveredIndex === i;

                return (
                  <rect
                    key={`pane-vol-${i}`}
                    x={x}
                    y={y}
                    width={candleWidth}
                    height={barHeight}
                    fill={isGreen ? hexToRgba(theme.bullishColor, 0.75) : hexToRgba(theme.bearishColor, 0.75)}
                    stroke={isHovered ? '#ffffff' : isGreen ? theme.bullishColor : theme.bearishColor}
                    strokeWidth={isHovered ? 1.2 : 0.6}
                    opacity={isHovered ? 1 : 0.85}
                    rx="0.5"
                  />
                );
              })}

              {/* Volume 20-period SMA Line */}
              {volSmaPoints && (
                <polyline
                  points={volSmaPoints}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                  strokeLinecap="round"
                />
              )}
            </g>
          )}

          {/* ========================================================= */}
          {/* PANE 4: VOLUME OSCILLATOR SUB-CHART (BELOW VOLUME BARS)   */}
          {/* ========================================================= */}
          {showVo && (
            <g>
              {/* Volume Oscillator Sub-Panel Background & Separator */}
              <rect
                x={padding.left}
                y={voTop - 18}
                width={chartWidth}
                height={voHeight + 28}
                fill="rgba(15, 23, 42, 0.45)"
                rx="4"
              />
              <line
                x1={padding.left}
                y1={voTop - 18}
                x2={width - padding.right}
                y2={voTop - 18}
                stroke="#334155"
                strokeWidth="1.2"
              />

              {/* Volume Oscillator Header Information */}
              <text
                x={padding.left + 8}
                y={voTop - 4}
                fill="#38bdf8"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Volume Oscillator (5, 10):
              </text>
              <text
                x={padding.left + 195}
                y={voTop - 4}
                fill={activeVo !== null && activeVo !== undefined && activeVo >= 0 ? '#34d399' : '#f87171'}
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {activeVo !== null && activeVo !== undefined ? `${activeVo >= 0 ? '+' : ''}${activeVo.toFixed(1)}%` : '—'}
              </text>
              {activeVo !== null && activeVo !== undefined && (
                <text
                  x={padding.left + 255}
                  y={voTop - 4}
                  fill={activeVo >= 0 ? '#34d399' : '#f87171'}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  [{activeVo >= 0 ? 'VOLUME EXPANSION (SHORT MA > LONG MA)' : 'VOLUME CONTRACTION (SHORT MA < LONG MA)'}]
                </text>
              )}

              {/* Upper Reference Level (+50% limit) */}
              <line
                x1={padding.left}
                y1={getVoY(maxVoLimit * 0.5)}
                x2={width - padding.right}
                y2={getVoY(maxVoLimit * 0.5)}
                stroke="#334155"
                strokeDasharray="2 3"
                strokeWidth="0.8"
                opacity="0.6"
              />
              <text
                x={width - padding.right + 6}
                y={getVoY(maxVoLimit * 0.5) + 3}
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                +{Math.round(maxVoLimit * 0.5)}%
              </text>

              {/* Zero Baseline (Reference Level) */}
              <line
                x1={padding.left}
                y1={voCenterY}
                x2={width - padding.right}
                y2={voCenterY}
                stroke="#64748b"
                strokeDasharray="3 2"
                strokeWidth="1.2"
                opacity="0.85"
              />
              <text
                x={width - padding.right + 6}
                y={voCenterY + 3}
                fill="#94a3b8"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                0%
              </text>

              {/* Lower Reference Level (-50% limit) */}
              <line
                x1={padding.left}
                y1={getVoY(-maxVoLimit * 0.5)}
                x2={width - padding.right}
                y2={getVoY(-maxVoLimit * 0.5)}
                stroke="#334155"
                strokeDasharray="2 3"
                strokeWidth="0.8"
                opacity="0.6"
              />
              <text
                x={width - padding.right + 6}
                y={getVoY(-maxVoLimit * 0.5) + 3}
                fill="#64748b"
                fontSize="8"
                fontFamily="monospace"
              >
                -{Math.round(maxVoLimit * 0.5)}%
              </text>

              {/* Histogram Bars from Zero Baseline */}
              {voSeries.map((item) => {
                if (item.oscillator === null) return null;
                const isHovered = hoveredIndex === item.index;
                const step = chartWidth / candles.length;
                const x = padding.left + (item.index + 0.5) * step - Math.max(1.5, candleWidth * 0.4);
                const w = Math.max(1.5, candleWidth * 0.8);
                const isPositive = item.oscillator >= 0;
                const barY = isPositive ? getVoY(item.oscillator) : voCenterY;
                const barHeight = Math.max(1, isPositive ? voCenterY - barY : getVoY(item.oscillator) - voCenterY);
                const fillColor = isPositive ? 'rgba(16, 185, 129, 0.75)' : 'rgba(244, 63, 94, 0.75)';
                const strokeColor = isHovered ? '#ffffff' : isPositive ? '#10b981' : '#f43f5e';

                return (
                  <rect
                    key={`vo-bar-${item.index}`}
                    x={x}
                    y={barY}
                    width={w}
                    height={barHeight}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? 1 : 0.5}
                    rx="0.5"
                    opacity={isHovered ? 1 : 0.85}
                  />
                );
              })}

              {/* Continuous Oscillator Line */}
              {voPoints && (
                <polyline
                  points={voPoints}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Active Hover Dot on Oscillator Curve */}
              {hoveredIndex !== null && voSeries[hoveredIndex]?.oscillator !== null && voSeries[hoveredIndex]?.oscillator !== undefined && (
                <circle
                  cx={padding.left + (hoveredIndex + 0.5) * (chartWidth / candles.length)}
                  cy={getVoY(voSeries[hoveredIndex].oscillator as number)}
                  r="3.5"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}

          {/* ========================================================= */}
          {/* HOVER CROSSHAIR OVERLAY (ACROSS ALL PANES)                */}
          {/* ========================================================= */}
          {hoveredIndex !== null && candles[hoveredIndex] && (
            <g>
              {/* Vertical Crosshair Line (Spans main chart, RSI, Volume, and VO sub-charts) */}
              <line
                x1={padding.left + (hoveredIndex + 0.5) * (chartWidth / candles.length)}
                y1={mainChartTop}
                x2={padding.left + (hoveredIndex + 0.5) * (chartWidth / candles.length)}
                y2={
                  showVo
                    ? voTop + voHeight
                    : showVolume
                    ? volTop + volHeight
                    : showRsi
                    ? rsiTop + rsiHeight
                    : mainChartTop + mainChartHeight
                }
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {/* Horizontal Crosshair Line on main chart */}
              <line
                x1={padding.left}
                y1={getY(candles[hoveredIndex].close)}
                x2={width - padding.right}
                y2={getY(candles[hoveredIndex].close)}
                stroke="#64748b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {/* Main Price badge on axis */}
              <rect
                x={width - padding.right + 2}
                y={getY(candles[hoveredIndex].close) - 8}
                width={58}
                height={16}
                fill="#2563eb"
                rx="2"
              />
              <text
                x={width - padding.right + 6}
                y={getY(candles[hoveredIndex].close) + 4}
                fill="#ffffff"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {formatPrice(candles[hoveredIndex].close)}
              </text>

              {/* RSI Sub-Chart Crosshair Price Badge */}
              {showRsi && indicators?.rsi14?.[hoveredIndex] !== null && indicators?.rsi14?.[hoveredIndex] !== undefined && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getRsiY(indicators.rsi14[hoveredIndex] as number)}
                    x2={width - padding.right}
                    y2={getRsiY(indicators.rsi14[hoveredIndex] as number)}
                    stroke="#a855f7"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                    opacity="0.7"
                  />
                  <rect
                    x={width - padding.right + 2}
                    y={getRsiY(indicators.rsi14[hoveredIndex] as number) - 7}
                    width={42}
                    height={14}
                    fill="#9333ea"
                    rx="2"
                  />
                  <text
                    x={width - padding.right + 6}
                    y={getRsiY(indicators.rsi14[hoveredIndex] as number) + 3}
                    fill="#ffffff"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {(indicators.rsi14[hoveredIndex] as number).toFixed(1)}
                  </text>
                </g>
              )}

              {/* Volume Sub-Chart Crosshair Badge */}
              {showVolume && candles[hoveredIndex]?.volume !== undefined && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getVolY(candles[hoveredIndex].volume)}
                    x2={width - padding.right}
                    y2={getVolY(candles[hoveredIndex].volume)}
                    stroke="#10b981"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                    opacity="0.7"
                  />
                  <rect
                    x={width - padding.right + 2}
                    y={getVolY(candles[hoveredIndex].volume) - 7}
                    width={56}
                    height={14}
                    fill="#059669"
                    rx="2"
                  />
                  <text
                    x={width - padding.right + 5}
                    y={getVolY(candles[hoveredIndex].volume) + 3}
                    fill="#ffffff"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {formatVolumeValue(candles[hoveredIndex].volume)}
                  </text>
                </g>
              )}

              {/* Volume Oscillator Crosshair Badge */}
              {showVo && voSeries[hoveredIndex]?.oscillator !== null && voSeries[hoveredIndex]?.oscillator !== undefined && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getVoY(voSeries[hoveredIndex].oscillator as number)}
                    x2={width - padding.right}
                    y2={getVoY(voSeries[hoveredIndex].oscillator as number)}
                    stroke="#0ea5e9"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                    opacity="0.7"
                  />
                  <rect
                    x={width - padding.right + 2}
                    y={getVoY(voSeries[hoveredIndex].oscillator as number) - 7}
                    width={50}
                    height={14}
                    fill={(voSeries[hoveredIndex].oscillator as number) >= 0 ? '#059669' : '#e11d48'}
                    rx="2"
                  />
                  <text
                    x={width - padding.right + 4}
                    y={getVoY(voSeries[hoveredIndex].oscillator as number) + 3}
                    fill="#ffffff"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {((voSeries[hoveredIndex].oscillator as number) >= 0 ? '+' : '') +
                      (voSeries[hoveredIndex].oscillator as number).toFixed(1) + '%'}
                  </text>
                </g>
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
