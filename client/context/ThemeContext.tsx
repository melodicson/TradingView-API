import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ThemeConfig, ThemePreset, ThemePresetId, BgStyle, ChartGridContrast } from '../types';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Midnight Cyber',
    tagline: 'TradingView Classic',
    description: 'High-contrast midnight slate with electric blue accents and emerald/crimson candles.',
    config: {
      primaryColor: '#3b82f6',
      primaryHover: '#2563eb',
      bullishColor: '#22c55e',
      bearishColor: '#ef4444',
      bgStyle: 'midnight',
      chartGridContrast: 'normal',
    },
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg Terminal',
    tagline: 'Wall Street Classic',
    description: 'Vintage amber gold terminal look on charcoal graphite with warm phosphor tones.',
    config: {
      primaryColor: '#f59e0b',
      primaryHover: '#d97706',
      bullishColor: '#10b981',
      bearishColor: '#f43f5e',
      bgStyle: 'charcoal',
      chartGridContrast: 'normal',
    },
  },
  {
    id: 'tokyonight',
    name: 'Tokyo Night Neon',
    tagline: 'Cyberpunk Synthwave',
    description: 'Vivid ultraviolet primary highlights with electric cyan bull candles and hot magenta bears.',
    config: {
      primaryColor: '#8b5cf6',
      primaryHover: '#7c3aed',
      bullishColor: '#06b6d4',
      bearishColor: '#ec4899',
      bgStyle: 'navy',
      chartGridContrast: 'high',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Alpha Desk',
    tagline: 'London Institutional',
    description: 'Crisp botanical emerald tones with vibrant lime up-bars and deep crimson selloffs.',
    config: {
      primaryColor: '#10b981',
      primaryHover: '#059669',
      bullishColor: '#22c55e',
      bearishColor: '#e11d48',
      bgStyle: 'midnight',
      chartGridContrast: 'subtle',
    },
  },
  {
    id: 'obsidian',
    name: 'Pure Obsidian OLED',
    tagline: '100% True Black',
    description: 'Ultra-deep pitch black for OLED displays. Minimizes glare, power consumption, and fatigue.',
    config: {
      primaryColor: '#38bdf8',
      primaryHover: '#0284c7',
      bullishColor: '#34d399',
      bearishColor: '#fb7185',
      bgStyle: 'oled',
      chartGridContrast: 'subtle',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix Phosphor',
    tagline: 'Terminal Monolith',
    description: 'CRT phosphor green aesthetic with bright matrix candles and warning amber dips.',
    config: {
      primaryColor: '#22c55e',
      primaryHover: '#16a34a',
      bullishColor: '#4ade80',
      bearishColor: '#fb923c',
      bgStyle: 'charcoal',
      chartGridContrast: 'high',
    },
  },
  {
    id: 'cyan',
    name: 'Electric Cyan',
    tagline: 'Maritime High-Vis',
    description: 'Ultra high-visibility cyan with seafoam greens and neon scarlet indicators.',
    config: {
      primaryColor: '#06b6d4',
      primaryHover: '#0891b2',
      bullishColor: '#10b981',
      bearishColor: '#f43f5e',
      bgStyle: 'navy',
      chartGridContrast: 'normal',
    },
  },
];

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  preset: 'default',
  name: 'Midnight Cyber',
  primaryColor: '#3b82f6',
  primaryHover: '#2563eb',
  bullishColor: '#22c55e',
  bearishColor: '#ef4444',
  bgStyle: 'midnight',
  chartGridContrast: 'normal',
};

const STORAGE_KEY = 'tradingview_ui_theme_v2';

export interface ThemeContextValue {
  theme: ThemeConfig;
  presets: ThemePreset[];
  isCustomized: boolean;
  applyPreset: (presetId: ThemePresetId) => void;
  setPrimaryColor: (color: string) => void;
  setBullishColor: (color: string) => void;
  setBearishColor: (color: string) => void;
  setBgStyle: (bg: BgStyle) => void;
  setChartGridContrast: (contrast: ChartGridContrast) => void;
  resetTheme: () => void;
  getBgClass: () => string;
  getCardBgClass: () => string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleanHex.length >= 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(59, 130, 246, ${alpha})`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.primaryColor === 'string') {
          return { ...DEFAULT_THEME_CONFIG, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored theme:', e);
    }
    return DEFAULT_THEME_CONFIG;
  });

  // Check if current theme deviates from its preset
  const isCustomized = useMemo(() => {
    const presetObj = THEME_PRESETS.find((p) => p.id === theme.preset);
    if (!presetObj) return true;
    return (
      presetObj.config.primaryColor !== theme.primaryColor ||
      presetObj.config.bullishColor !== theme.bullishColor ||
      presetObj.config.bearishColor !== theme.bearishColor ||
      presetObj.config.bgStyle !== theme.bgStyle ||
      presetObj.config.chartGridContrast !== theme.chartGridContrast
    );
  }, [theme]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
      console.warn('Failed to save theme in localStorage:', e);
    }
  }, [theme]);

  // Sync CSS variables to document root for real-time reactive styling
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--tv-primary', theme.primaryColor);
    root.style.setProperty('--tv-primary-hover', theme.primaryHover);
    root.style.setProperty('--tv-bullish', theme.bullishColor);
    root.style.setProperty('--tv-bearish', theme.bearishColor);

    // Dynamic background variables
    let baseBg = '#020617'; // midnight
    let surfaceBg = '#0f172a';
    let borderColor = '#1e293b';

    if (theme.bgStyle === 'oled') {
      baseBg = '#000000';
      surfaceBg = '#09090b';
      borderColor = '#18181b';
    } else if (theme.bgStyle === 'navy') {
      baseBg = '#030712';
      surfaceBg = '#0b1329';
      borderColor = '#172554';
    } else if (theme.bgStyle === 'charcoal') {
      baseBg = '#101114';
      surfaceBg = '#191b22';
      borderColor = '#2a2c38';
    }

    root.style.setProperty('--tv-bg-base', baseBg);
    root.style.setProperty('--tv-bg-surface', surfaceBg);
    root.style.setProperty('--tv-border', borderColor);
    root.setAttribute('data-theme-bg', theme.bgStyle);
  }, [theme]);

  const applyPreset = useCallback((presetId: ThemePresetId) => {
    const found = THEME_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setThemeState({
        preset: found.id,
        name: found.name,
        primaryColor: found.config.primaryColor,
        primaryHover: found.config.primaryHover,
        bullishColor: found.config.bullishColor,
        bearishColor: found.config.bearishColor,
        bgStyle: found.config.bgStyle,
        chartGridContrast: found.config.chartGridContrast,
      });
    }
  }, []);

  const setPrimaryColor = useCallback((color: string) => {
    setThemeState((prev) => ({
      ...prev,
      primaryColor: color,
      primaryHover: color,
    }));
  }, []);

  const setBullishColor = useCallback((color: string) => {
    setThemeState((prev) => ({
      ...prev,
      bullishColor: color,
    }));
  }, []);

  const setBearishColor = useCallback((color: string) => {
    setThemeState((prev) => ({
      ...prev,
      bearishColor: color,
    }));
  }, []);

  const setBgStyle = useCallback((bg: BgStyle) => {
    setThemeState((prev) => ({
      ...prev,
      bgStyle: bg,
    }));
  }, []);

  const setChartGridContrast = useCallback((contrast: ChartGridContrast) => {
    setThemeState((prev) => ({
      ...prev,
      chartGridContrast: contrast,
    }));
  }, []);

  const resetTheme = useCallback(() => {
    setThemeState(DEFAULT_THEME_CONFIG);
  }, []);

  // Utility classes for backgrounds based on chosen bgStyle
  const getBgClass = useCallback(() => {
    switch (theme.bgStyle) {
      case 'oled':
        return 'bg-black text-slate-100';
      case 'navy':
        return 'bg-[#030712] text-slate-100';
      case 'charcoal':
        return 'bg-[#101114] text-slate-100';
      case 'midnight':
      default:
        return 'bg-slate-950 text-slate-100';
    }
  }, [theme.bgStyle]);

  const getCardBgClass = useCallback(() => {
    switch (theme.bgStyle) {
      case 'oled':
        return 'bg-[#09090b] border-zinc-900';
      case 'navy':
        return 'bg-[#0b1329] border-slate-800';
      case 'charcoal':
        return 'bg-[#191b22] border-[#2a2c38]';
      case 'midnight':
      default:
        return 'bg-slate-900 border-slate-800';
    }
  }, [theme.bgStyle]);

  const value = useMemo(
    () => ({
      theme,
      presets: THEME_PRESETS,
      isCustomized,
      applyPreset,
      setPrimaryColor,
      setBullishColor,
      setBearishColor,
      setBgStyle,
      setChartGridContrast,
      resetTheme,
      getBgClass,
      getCardBgClass,
    }),
    [
      theme,
      isCustomized,
      applyPreset,
      setPrimaryColor,
      setBullishColor,
      setBearishColor,
      setBgStyle,
      setChartGridContrast,
      resetTheme,
      getBgClass,
      getCardBgClass,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
