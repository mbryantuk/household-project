import { extendTheme } from '@mui/joy';
import { hexToHsl } from './utils/colors';

/**
 * 50 PREMIUM SIGNATURE THEMES
 */
export const THEMES = {
  hearth: { name: 'Classic', primary: '#374151' },
  platinum: { name: 'Platinum', primary: '#18181b' },
  obsidian: { name: 'Obsidian', primary: '#f4f4f5' },
  midnight: { name: 'Midnight', primary: '#38bdf8' },
  forest: { name: 'Forest', primary: '#22c55e' },
  ocean: { name: 'Ocean', primary: '#0284c7' },
  sunset: { name: 'Sunset', primary: '#ea580c' },
  space: { name: 'Space', primary: '#6366f1' },
  jungle: { name: 'Jungle', primary: '#eab308' },
  mint: { name: 'Mint', primary: '#0d9488' },
  sakura: { name: 'Sakura', primary: '#db2777' },
  lavender: { name: 'Lavender', primary: '#8b5cf6' },
  honey: { name: 'Honey', primary: '#b45309' },
  lemonade: { name: 'Lemonade', primary: '#84cc16' },
  candy: { name: 'Candy', primary: '#f472b6' },
  arctic: { name: 'Arctic', primary: '#06b6d4' },
  autumn: { name: 'Autumn', primary: '#c2410c' },
  cotton: { name: 'Cotton', primary: '#38bdf8' },
  emerald: { name: 'Emerald', primary: '#059669' },
  berry: { name: 'Berry', primary: '#9d174d' },
  rose: { name: 'Rose', primary: '#e11d48' },
  citrus: { name: 'Citrus', primary: '#f59e0b' },
  sky: { name: 'Sky', primary: '#0ea5e9' },
  matcha: { name: 'Matcha', primary: '#65a30d' },
  peach: { name: 'Peach', primary: '#fb923c' },
  lilac: { name: 'Lilac', primary: '#a855f7' },
  coral: { name: 'Coral', primary: '#f43f5e' },
  pistachio: { name: 'Pistachio', primary: '#10b981' },
  azure: { name: 'Azure', primary: '#2563eb' },
  sunflower: { name: 'Sunflower', primary: '#eab308' },
  grape: { name: 'Grape', primary: '#9333ea' },
  tangerine: { name: 'Tangerine', primary: '#fb923c' },
  sand: { name: 'Sand', primary: '#a16207' },
  teal: { name: 'Teal', primary: '#0d9488' },
  sage: { name: 'Sage', primary: '#15803d' },
  orchid: { name: 'Orchid', primary: '#d946ef' },
  periwinkle: { name: 'Periwinkle', primary: '#818cf8' },
  blueberry: { name: 'Blueberry', primary: '#3b82f6' },
  grass: { name: 'Grass', primary: '#4ade80' },
  seafoam: { name: 'Seafoam', primary: '#2dd4bf' },
  marigold: { name: 'Marigold', primary: '#fbbf24' },
  plum: { name: 'Plum', primary: '#a21caf' },
  clay: { name: 'Clay', primary: '#c2410c' },
  pine: { name: 'Pine', primary: '#166534' },
  crimson: { name: 'Crimson', primary: '#dc2626' },
  slate: { name: 'Slate', primary: '#475569' },
  graphite: { name: 'Graphite', primary: '#27272a' },
  nordic: { name: 'Nordic', primary: '#5e81ac' },
  espresso: { name: 'Espresso', primary: '#44403c' },
  ink: { name: 'Ink', primary: '#1f2937' },
  custom: { name: 'Custom Theme', primary: '#374151', isCustom: true },
};

/**
 * Dynamic Emoji Color Generator
 */
export const getEmojiColor = (emoji, isDark = true) => {
  if (!emoji) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  let hash = 0;
  const str = String(emoji);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, ${isDark ? 50 : 70}%, ${isDark ? 25 : 90}%)`;
};

export const getAppTheme = (themeId = 'hearth', customConfig = null) => {
  let base = THEMES[themeId] || THEMES.hearth;
  if (themeId === 'custom' && customConfig) base = { ...base, ...customConfig };

  const primaryColor = base.primary || '#374151';
  const { h, s } = hexToHsl(primaryColor);

  return extendTheme({
    fontFamily: { body: '"DM Sans", sans-serif', display: '"DM Serif Display", serif' },
    radius: { xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '16px' },
    colorSchemes: {
      light: {
        palette: {
          background: {
            body: `hsl(${h}, ${Math.min(s, 30)}%, 96%)`,
            surface: '#ffffff',
            level1: `hsl(${h}, ${Math.min(s, 25)}%, 93%)`,
            level2: `hsl(${h}, ${Math.min(s, 20)}%, 90%)`,
          },
          primary: {
            500: primaryColor,
            solidBg: primaryColor,
            solidHoverBg: `hsl(${h}, ${s}%, ${Math.max(0, 40)}%)`,
            softBg: `${primaryColor}15`,
          },
        },
      },
      dark: {
        palette: {
          background: {
            body: `hsl(${h}, ${Math.min(s, 10)}%, 4%)`,
            surface: `hsl(${h}, ${Math.min(s, 8)}%, 7%)`,
            level1: `hsl(${h}, ${Math.min(s, 8)}%, 10%)`,
          },
          primary: {
            500: primaryColor,
            solidBg: primaryColor,
            solidHoverBg: `hsl(${h}, ${s}%, ${Math.min(100, 60)}%)`,
            softBg: 'rgba(255,255,255,0.1)',
          },
        },
      },
    },
    components: {
      JoyCard: {
        styleOverrides: {
          root: {
            boxShadow: 'var(--joy-shadow-sm)',
            '&:hover': { boxShadow: 'var(--joy-shadow-md)', transform: 'translateY(-2px)' },
          },
        },
      },
    },
  });
};

export const getThemeSpec = (themeId = 'hearth', customConfig = null, mode = 'light') => {
  let base = THEMES[themeId] || THEMES.hearth;
  if (themeId === 'custom' && customConfig) base = { ...base, ...customConfig };
  const primaryColor = base.primary;
  const isDark = mode === 'dark';

  return {
    primary: primaryColor,
    spec: {
      mode,
      primary: primaryColor,
      bg: isDark ? '#050505' : '#f9fafb',
      surface: isDark ? '#0a0a0a' : '#ffffff',
      selection: isDark ? '#1a1a1a' : '#f3f4f6',
      text: isDark ? '#f4f4f5' : '#111827',
    },
  };
};
