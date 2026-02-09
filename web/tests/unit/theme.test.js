import { describe, it, expect } from 'vitest';
import { getMantelTheme, THEMES } from '../../src/theme';

describe('Theme System', () => {
  it('should return the default theme if an invalid ID is provided', () => {
    const theme = getMantelTheme('invalid-theme-id');
    // Default is totem (Mantel)
    expect(theme.colorSchemes.light.palette.primary.solidBg).toBe('#374151');
  });

  it('should return the correct color for a known theme (ocean)', () => {
    const theme = getMantelTheme('ocean');
    expect(theme.colorSchemes.light.palette.primary.solidBg).toBe('#0284c7');
  });

  it('should distinguish between pure_obsidian and signature obsidian', () => {
    const pure = THEMES.pure_obsidian;
    const signature = THEMES.obsidian;

    expect(pure).toBeDefined();
    expect(signature).toBeDefined();
    expect(pure.name).toContain('Pure');
    expect(signature.isPremium).toBe(true);
    expect(pure.bg).not.toBe(signature.bg);
  });

  it('should generate a custom theme correctly', () => {
    const customConfig = {
      mode: 'dark',
      primary: '#ff0000',
      bg: '#111111',
      surface: '#222222',
      selection: '#333333',
      text: '#eeeeee'
    };
    
    const theme = getMantelTheme('custom', customConfig);
    expect(theme.colorSchemes.dark.palette.primary.solidBg).toBe('#ff0000');
    expect(theme.colorSchemes.dark.palette.background.body).toBe('#111111');
  });
});
