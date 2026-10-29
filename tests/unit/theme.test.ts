import { describe, it, expect } from 'vitest';
import { THEME_PRESETS, DEFAULT_THEME_CONFIG, hexToRgba } from '../../client/context/ThemeContext';

describe('Theme System & Presets', () => {
  it('defines all required core presets', () => {
    const presetIds = THEME_PRESETS.map((p) => p.id);
    expect(presetIds).toContain('default');
    expect(presetIds).toContain('bloomberg');
    expect(presetIds).toContain('tokyonight');
    expect(presetIds).toContain('emerald');
    expect(presetIds).toContain('obsidian');
    expect(presetIds).toContain('matrix');
    expect(presetIds).toContain('cyan');
  });

  it('each preset has valid hex colors and background properties', () => {
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

    THEME_PRESETS.forEach((preset) => {
      expect(preset.name).toBeTruthy();
      expect(preset.config.primaryColor).toMatch(hexRegex);
      expect(preset.config.bullishColor).toMatch(hexRegex);
      expect(preset.config.bearishColor).toMatch(hexRegex);
      expect(['midnight', 'oled', 'navy', 'charcoal']).toContain(preset.config.bgStyle);
      expect(['subtle', 'normal', 'high']).toContain(preset.config.chartGridContrast);
    });
  });

  it('default theme matches Midnight Cyber configuration', () => {
    expect(DEFAULT_THEME_CONFIG.preset).toBe('default');
    expect(DEFAULT_THEME_CONFIG.primaryColor).toBe('#3b82f6');
    expect(DEFAULT_THEME_CONFIG.bullishColor).toBe('#22c55e');
    expect(DEFAULT_THEME_CONFIG.bearishColor).toBe('#ef4444');
    expect(DEFAULT_THEME_CONFIG.bgStyle).toBe('midnight');
  });

  it('hexToRgba converts 6-digit hex into rgba string with alpha', () => {
    const rgba = hexToRgba('#22c55e', 0.5);
    expect(rgba).toBe('rgba(34, 197, 94, 0.5)');
  });

  it('hexToRgba converts 3-digit hex into rgba string with alpha', () => {
    const rgba = hexToRgba('#f00', 0.8);
    expect(rgba).toBe('rgba(255, 0, 0, 0.8)');
  });
});
