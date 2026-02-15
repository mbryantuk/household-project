import { describe, it, expect } from 'vitest';
import { getAppTheme } from '../../src/theme';

describe('Theme System', () => {
  it('should return the default theme if an invalid ID is provided', () => {
    const theme = getAppTheme('invalid-theme-id');
    // Default is hearth (Classic) which is #374151
    expect(theme.colorSchemes.light.palette.primary.solidBg).toBe('#374151');
  });

  it('should return the correct color for a known theme (ocean)', () => {
    const theme = getAppTheme('ocean');
    expect(theme.colorSchemes.light.palette.primary.solidBg).toBe('#0284c7');
  });

  it('should generate a custom theme correctly', () => {
    const customConfig = {
      primary: '#ff0000',
    };
    
    const theme = getAppTheme('custom', customConfig);
    // getAppTheme uses the primary color from config
    expect(theme.colorSchemes.dark.palette.primary.solidBg).toBe('#ff0000');
  });
});