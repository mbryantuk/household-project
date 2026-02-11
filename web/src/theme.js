import { extendTheme } from '@mui/joy/styles';

/**
 * 50 PREMIUM SIGNATURE THEMES
 * Each theme defines a primary color identity.
 * System mode automatically handles Light/Dark derivation.
 */
export const THEMES = {
  totem: { name: 'Mantel Classic', primary: '#374151' },
  platinum: { name: 'Platinum Mono', primary: '#18181b' },
  obsidian: { name: 'Obsidian Ink', primary: '#f4f4f5' },
  midnight: { name: 'Midnight Neon', primary: '#38bdf8' },
  forest: { name: 'Forest Deep', primary: '#22c55e' },
  ocean: { name: 'Oceanic Blue', primary: '#0284c7' },
  sunset: { name: 'Sunset Amber', primary: '#ea580c' },
  lavender: { name: 'Lavender Mist', primary: '#8b5cf6' },
  mint: { name: 'Mint Fresh', primary: '#0d9488' },
  sakura: { name: 'Sakura Pink', primary: '#db2777' },
  honey: { name: 'Honey Gold', primary: '#b45309' },
  lemonade: { name: 'Lemonade Lime', primary: '#84cc16' },
  candy: { name: 'Cotton Candy', primary: '#f472b6' },
  arctic: { name: 'Arctic Cyan', primary: '#06b6d4' },
  autumn: { name: 'Autumn Ochre', primary: '#c2410c' },
  emerald: { name: 'Emerald Isle', primary: '#059669' },
  berry: { name: 'Wild Berry', primary: '#9d174d' },
  rose: { name: 'Rose Petal', primary: '#e11d48' },
  citrus: { name: 'Citrus Zest', primary: '#f59e0b' },
  sky: { name: 'Morning Sky', primary: '#0ea5e9' },
  matcha: { name: 'Matcha Tea', primary: '#65a30d' },
  peach: { name: 'Peach Sorbet', primary: '#fb923c' },
  lilac: { name: 'Lilac Soft', primary: '#a855f7' },
  coral: { name: 'Coral Reef', primary: '#f43f5e' },
  pistachio: { name: 'Pistachio', primary: '#10b981' },
  azure: { name: 'Azure Blue', primary: '#2563eb' },
  sunflower: { name: 'Sunflower', primary: '#eab308' },
  grape: { name: 'Grape Soda', primary: '#9333ea' },
  tangerine: { name: 'Tangerine', primary: '#fb923c' },
  sand: { name: 'Desert Sand', primary: '#a16207' },
  teal: { name: 'Teal Lagoon', primary: '#0d9488' },
  sage: { name: 'Sage Green', primary: '#15803d' },
  orchid: { name: 'Orchid Bloom', primary: '#d946ef' },
  periwinkle: { name: 'Periwinkle', primary: '#818cf8' },
  blueberry: { name: 'Blueberry', primary: '#3b82f6' },
  grass: { name: 'Fresh Grass', primary: '#4ade80' },
  seafoam: { name: 'Seafoam', primary: '#2dd4bf' },
  marigold: { name: 'Marigold', primary: '#fbbf24' },
  plum: { name: 'Royal Plum', primary: '#a21caf' },
  clay: { name: 'Terracotta', primary: '#c2410c' },
  pine: { name: 'Mountain Pine', primary: '#166534' },
  crimson: { name: 'Crimson Red', primary: '#dc2626' },
  slate: { name: 'Slate Steel', primary: '#475569' },
  graphite: { name: 'Graphite', primary: '#27272a' },
  nordic: { name: 'Nordic Snow', primary: '#5e81ac' },
  espresso: { name: 'Espresso', primary: '#44403c' },
  ink: { name: 'Deep Ink', primary: '#1f2937' },
  cobalt: { name: 'Cobalt Shield', primary: '#1e40af' },
  amethyst: { name: 'Amethyst', primary: '#7c3aed' },
  ruby: { name: 'Ruby Gem', primary: '#9f1239' },
  
  // Special Theme: Custom
  custom: { name: 'Custom Identity', primary: '#374151', isCustom: true }
};

export const getEmojiColor = (emoji, isDark = true) => {
  if (!emoji) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  let hash = 0;
  const str = String(emoji);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, ${isDark ? 50 : 70}%, ${isDark ? 25 : 90}%)`;
};

const deriveSpec = (primary, mode) => {
    const isDark = mode === 'dark';
    if (isDark) {
        return {
            mode: 'dark',
            primary,
            bg: '#0a0a0a',
            surface: '#121212',
            selection: '#1e1e1e',
            text: '#f4f4f5'
        };
    }
    return {
        mode: 'light',
        primary,
        bg: '#f9fafb',
        surface: '#ffffff',
        selection: '#f3f4f6',
        text: '#111827'
    };
};

export const getMantelTheme = (themeId = 'totem', customConfig = null) => {
  let base = THEMES[themeId] || THEMES.totem;
  if (themeId === 'custom' && customConfig) {
      base = { ...base, ...customConfig };
  }

  const primaryColor = base.primary || '#374151';

  return extendTheme({
    fontFamily: {
        body: '"DM Sans", var(--joy-fontFamily-fallback)',
        display: '"DM Serif Display", serif',
    },
    radius: { sm: '4px', md: '8px', lg: '12px', xl: '16px' },
    colorSchemes: {
      light: {
        palette: {
          background: {
            body: '#f9fafb',
            surface: '#ffffff',
            level1: 'rgba(0,0,0,0.03)',
            level2: 'rgba(0,0,0,0.06)',
            level3: 'rgba(0,0,0,0.09)',
          },
          text: {
            primary: '#111827',
            secondary: 'rgba(0,0,0,0.6)',
          },
          primary: {
            solidBg: primaryColor,
            solidHoverBg: '#000000',
            plainColor: primaryColor,
            outlinedColor: primaryColor,
            outlinedBorder: primaryColor,
            softBg: `${primaryColor}15`,
          },
          neutral: {
            outlinedBorder: '#f3f4f6',
            plainColor: '#111827',
          },
          divider: '#f3f4f6',
        },
      },
      dark: {
        palette: {
          background: {
            body: '#0a0a0a',
            surface: '#121212',
            level1: 'rgba(255,255,255,0.05)',
            level2: 'rgba(255,255,255,0.1)',
            level3: 'rgba(255,255,255,0.15)',
          },
          text: {
            primary: '#f4f4f5',
            secondary: 'rgba(255,255,255,0.7)',
          },
          primary: {
            solidBg: primaryColor,
            solidHoverBg: '#ffffff',
            plainColor: primaryColor,
            outlinedColor: primaryColor,
            outlinedBorder: primaryColor,
            softBg: 'rgba(255,255,255,0.1)',
          },
          neutral: {
            outlinedBorder: '#1e1e1e',
            plainColor: '#f4f4f5',
          },
          divider: '#1e1e1e',
        },
      },
    },
    components: {
      JoyTypography: {
        styleOverrides: {
          root: ({ ownerState }) => ({
             ...(ownerState.level === 'h2' && {
               fontFamily: 'var(--joy-fontFamily-display)',
               fontSize: '1.75rem',
               fontWeight: 400,
               letterSpacing: '-0.02em',
             }),
             ...(ownerState.level === 'h1' && {
                fontFamily: 'var(--joy-fontFamily-display)',
                fontWeight: 400,
             }),
          }),
        },
      },
      JoyCard: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--joy-palette-background-surface)',
            borderColor: 'var(--joy-palette-divider)',
            boxShadow: 'var(--joy-shadow-sm)',
            borderRadius: 'var(--joy-radius-md)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': { boxShadow: 'var(--joy-shadow-md)' }
          },
        },
      },
      JoySheet: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            ...(ownerState.variant === 'outlined' && {
                borderColor: 'var(--joy-palette-divider)',
                borderRadius: 'var(--joy-radius-md)',
            }),
          }),
        },
      },
    },
  });
};

export const getThemeSpec = (themeId = 'totem', customConfig = null) => {
  let base = THEMES[themeId] || THEMES.totem;
  if (themeId === 'custom' && customConfig) {
      base = { ...base, ...customConfig };
  }
  return {
    primary: base.primary,
    spec: deriveSpec(base.primary, 'light')
  };
};