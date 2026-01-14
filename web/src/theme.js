import { extendTheme } from '@mui/joy/styles';

export const THEMES = {
  // --- LIGHT THEMES ---
  totem: { name: 'Totem Classic', mode: 'light', primary: '#644AC9', bg: '#FFFBEB', surface: '#FFF', selection: '#CFCFDE', text: '#1F1F1F' },
  ocean: { name: 'Ocean Breeze', mode: 'light', primary: '#0284c7', bg: '#f0f9ff', surface: '#fff', selection: '#e0f2fe', text: '#0c4a6e' },
  sakura: { name: 'Sakura Blossom', mode: 'light', primary: '#db2777', bg: '#fff1f2', surface: '#fff', selection: '#ffe4e6', text: '#881337' },
  mint: { name: 'Mint Fresh', mode: 'light', primary: '#0d9488', bg: '#f0fdfa', surface: '#fff', selection: '#ccfbf1', text: '#134e4a' },
  sunset: { name: 'Sunset Glow', mode: 'light', primary: '#ea580c', bg: '#fff7ed', surface: '#fff', selection: '#ffedd5', text: '#7c2d12' },
  lavender: { name: 'Lavender Field', mode: 'light', primary: '#8b5cf6', bg: '#f5f3ff', surface: '#fff', selection: '#ede9fe', text: '#4c1d95' },
  honey: { name: 'Honey Bee', mode: 'light', primary: '#b45309', bg: '#fffbeb', surface: '#fff', selection: '#fef3c7', text: '#78350f' },
  lemonade: { name: 'Lemonade', mode: 'light', primary: '#84cc16', bg: '#fefce8', surface: '#fff', selection: '#fef9c3', text: '#365314' },
  candy: { name: 'Candy Land', mode: 'light', primary: '#f472b6', bg: '#fff1f2', surface: '#fff', selection: '#ffe4e6', text: '#831843' },
  arctic: { name: 'Arctic Ice', mode: 'light', primary: '#06b6d4', bg: '#f0f9ff', surface: '#fff', selection: '#e0f2fe', text: '#164e63' },
  autumn: { name: 'Autumn Leaves', mode: 'light', primary: '#c2410c', bg: '#fff7ed', surface: '#fff', selection: '#ffedd5', text: '#7c2d12' },
  cotton: { name: 'Cotton Candy', mode: 'light', primary: '#38bdf8', bg: '#fdf2f8', surface: '#fff', selection: '#fce7f3', text: '#0c4a6e' },
  paperback: { name: 'Paperback', mode: 'light', primary: '#78350f', bg: '#fef3c7', surface: '#fffcf0', selection: '#fde68a', text: '#451a03' },
  emerald: { name: 'Emerald Isle', mode: 'light', primary: '#059669', bg: '#ecfdf5', surface: '#fff', selection: '#d1fae5', text: '#064e3b' },
  berry: { name: 'Wild Berry', mode: 'light', primary: '#9d174d', bg: '#fdf2f8', surface: '#fff', selection: '#fce7f3', text: '#500724' },

  // --- DARK THEMES ---
  midnight: { name: 'Midnight City', mode: 'dark', primary: '#38bdf8', bg: '#0f172a', surface: '#1e293b', selection: '#334155', text: '#f1f5f9' },
  cyberpunk: { name: 'Cyberpunk 2077', mode: 'dark', primary: '#fdf001', bg: '#000000', surface: '#1a1a1a', selection: '#333333', text: '#fdf001' },
  neon: { name: 'Neon Dreams', mode: 'dark', primary: '#39ff14', bg: '#000000', surface: '#121212', selection: '#222222', text: '#ffffff' },
  forest: { name: 'Forest Whisper', mode: 'dark', primary: '#22c55e', bg: '#052e16', surface: '#064e3b', selection: '#14532d', text: '#dcfce7' },
  espresso: { name: 'Espresso Bar', mode: 'dark', primary: '#d97706', bg: '#1c1917', surface: '#292524', selection: '#44403c', text: '#fafaf9' },
  royal: { name: 'Royal Velvet', mode: 'dark', primary: '#a855f7', bg: '#2e1065', surface: '#4c1d95', selection: '#5b21b6', text: '#f5f3ff' },
  slate: { name: 'Slate Grey', mode: 'dark', primary: '#94a3b8', bg: '#020617', surface: '#0f172a', selection: '#1e293b', text: '#f8fafc' },
  retro: { name: 'Retro 80s', mode: 'dark', primary: '#ff00ff', bg: '#000814', surface: '#001d3d', selection: '#003566', text: '#00f5ff' },
  space: { name: 'Deep Space', mode: 'dark', primary: '#6366f1', bg: '#020617', surface: '#0f172a', selection: '#1e293b', text: '#e0e7ff' },
  jungle: { name: 'Jungle Safari', mode: 'dark', primary: '#eab308', bg: '#022c22', surface: '#064e3b', selection: '#065f46', text: '#ecfdf5' },
  obsidian: { name: 'Obsidian', mode: 'dark', primary: '#ffffff', bg: '#000000', surface: '#0a0a0a', selection: '#1a1a1a', text: '#e5e5e5' },
  galaxy: { name: 'Galaxy Quest', mode: 'dark', primary: '#8b5cf6', bg: '#1e1b4b', surface: '#312e81', selection: '#3730a3', text: '#eef2ff' },
  mars: { name: 'Mars Rover', mode: 'dark', primary: '#fb923c', bg: '#431407', surface: '#7c2d12', selection: '#9a3412', text: '#fff7ed' },
  vampire: { name: 'Vampire Night', mode: 'dark', primary: '#e11d48', bg: '#4c0519', surface: '#881337', selection: '#9f1239', text: '#fff1f2' },
  blueprint: { name: 'Architect Blueprint', mode: 'dark', primary: '#3b82f6', bg: '#172554', surface: '#1e3a8a', selection: '#1e40af', text: '#dbeafe' },
  highcontrast: { name: 'High Contrast', mode: 'dark', primary: '#ffff00', bg: '#000000', surface: '#000000', selection: '#333300', text: '#ffffff' },
};

export const getEmojiColor = (emoji, isDark = true) => {
  if (!emoji) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  let hash = 0;
  const str = String(emoji);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, ${isDark ? 50 : 70}%, ${isDark ? 25 : 90}%)`;
};

export const getTotemTheme = (themeId = 'totem') => {
  const spec = THEMES[themeId] || THEMES.totem;
  const isDark = spec.mode === 'dark';

  return extendTheme({
    colorSchemes: {
      [spec.mode]: {
        palette: {
          background: {
            body: spec.bg,
            surface: spec.surface,
            level1: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          },
          text: {
            primary: spec.text,
            secondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          },
          primary: {
            solidBg: spec.primary,
            solidHoverBg: spec.primary,
            plainColor: spec.primary,
            outlinedColor: spec.primary,
            outlinedBorder: spec.primary,
          },
          neutral: {
            outlinedBorder: spec.selection,
          },
          divider: spec.selection,
        },
      },
    },
    components: {
      JoyTypography: {
        styleOverrides: {
          root: ({ ownerState }) => ({
             ...(ownerState.level === 'h2' && {
               fontSize: '1.5rem',
               fontWeight: 700,
             }),
          }),
        },
      },
    },
  });
};

export const getThemeSpec = (themeId = 'totem') => {
  const spec = THEMES[themeId] || THEMES.totem;
  return {
    spec,
    isDark: spec.mode === 'dark'
  };
};