import { extendTheme } from '@mui/joy/styles';

export const THEMES = {
  // --- LIGHT THEMES ---
  totem: { name: 'Mantel', mode: 'light', primary: '#374151', bg: '#F9FAFB', surface: '#FFF', selection: '#E5E7EB', text: '#111827' },
  mantel_warm: { name: 'Mantel Warm', mode: 'light', primary: '#D97706', bg: '#FFFBEB', surface: '#FFF', selection: '#FEF3C7', text: '#78350F' },
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
  rose: { name: 'Rose Garden', mode: 'light', primary: '#e11d48', bg: '#fff1f2', surface: '#fff', selection: '#ffe4e6', text: '#4c0519' },
  citrus: { name: 'Citrus Grove', mode: 'light', primary: '#f59e0b', bg: '#fffbeb', surface: '#fff', selection: '#fef3c7', text: '#78350f' },
  sky: { name: 'Morning Sky', mode: 'light', primary: '#0ea5e9', bg: '#f0f9ff', surface: '#fff', selection: '#e0f2fe', text: '#0c4a6e' },
  matcha: { name: 'Matcha Latte', mode: 'light', primary: '#65a30d', bg: '#f7fee7', surface: '#fff', selection: '#ecfccb', text: '#365314' },
  peach: { name: 'Peach Sorbet', mode: 'light', primary: '#fb923c', bg: '#fff7ed', surface: '#fff', selection: '#ffedd5', text: '#7c2d12' },
  lilac: { name: 'Lilac Mist', mode: 'light', primary: '#a855f7', bg: '#f5f3ff', surface: '#fff', selection: '#f3e8ff', text: '#581c87' },
  coral: { name: 'Coral Reef', mode: 'light', primary: '#f43f5e', bg: '#fff1f2', surface: '#fff', selection: '#ffe4e6', text: '#881337' },
  pistachio: { name: 'Pistachio', mode: 'light', primary: '#10b981', bg: '#ecfdf5', surface: '#fff', selection: '#d1fae5', text: '#064e3b' },
  creamsicle: { name: 'Creamsicle', mode: 'light', primary: '#f97316', bg: '#fff7ed', surface: '#fff', selection: '#ffedd5', text: '#7c2d12' },
  azure: { name: 'Azure Coast', mode: 'light', primary: '#2563eb', bg: '#eff6ff', surface: '#fff', selection: '#dbeafe', text: '#1e3a8a' },
  sunflower: { name: 'Sunflower', mode: 'light', primary: '#eab308', bg: '#fefce8', surface: '#fff', selection: '#fef9c3', text: '#713f12' },
  raindrop: { name: 'Raindrop', mode: 'light', primary: '#60a5fa', bg: '#f0f9ff', surface: '#fff', selection: '#dbeafe', text: '#1e3a8a' },
  grape: { name: 'Grape Soda', mode: 'light', primary: '#9333ea', bg: '#faf5ff', surface: '#fff', selection: '#f3e8ff', text: '#581c87' },
  tangerine: { name: 'Tangerine', mode: 'light', primary: '#fb923c', bg: '#fff7ed', surface: '#fff', selection: '#ffedd5', text: '#7c2d12' },
  sand: { name: 'Desert Sand', mode: 'light', primary: '#a16207', bg: '#fefce8', surface: '#fffcf0', selection: '#fef3c7', text: '#451a03' },
  rose_quartz: { name: 'Rose Quartz', mode: 'light', primary: '#f472b6', bg: '#fdf2f8', surface: '#fff', selection: '#fce7f3', text: '#831843' },
  teal: { name: 'Teal Lagoon', mode: 'light', primary: '#0d9488', bg: '#f0fdfa', surface: '#fff', selection: '#ccfbf1', text: '#134e4a' },
  sage: { name: 'Sage Green', mode: 'light', primary: '#15803d', bg: '#f0fdf4', surface: '#fff', selection: '#dcfce7', text: '#14532d' },
  orchid: { name: 'Wild Orchid', mode: 'light', primary: '#d946ef', bg: '#fdf4ff', surface: '#fff', selection: '#fae8ff', text: '#701a75' },
  indigo_mist: { name: 'Indigo Mist', mode: 'light', primary: '#6366f1', bg: '#f5f3ff', surface: '#fff', selection: '#e0e7ff', text: '#312e81' },
  periwinkle: { name: 'Periwinkle', mode: 'light', primary: '#818cf8', bg: '#f5f3ff', surface: '#fff', selection: '#e0e7ff', text: '#312e81' },
  banana: { name: 'Banana Split', mode: 'light', primary: '#facc15', bg: '#fefce8', surface: '#fff', selection: '#fef9c3', text: '#713f12' },
  blueberry: { name: 'Blueberry', mode: 'light', primary: '#3b82f6', bg: '#eff6ff', surface: '#fff', selection: '#dbeafe', text: '#1e3a8a' },
  grass: { name: 'Fresh Grass', mode: 'light', primary: '#4ade80', bg: '#f0fdf4', surface: '#fff', selection: '#dcfce7', text: '#14532d' },
  coral_pink: { name: 'Coral Pink', mode: 'light', primary: '#fb7185', bg: '#fff1f2', surface: '#fff', selection: '#ffe4e6', text: '#881337' },
  amber_glow: { name: 'Amber Glow', mode: 'light', primary: '#f59e0b', bg: '#fffbeb', surface: '#fff', selection: '#fef3c7', text: '#78350f' },
  seafoam: { name: 'Seafoam', mode: 'light', primary: '#2dd4bf', bg: '#f0fdfa', surface: '#fff', selection: '#ccfbf1', text: '#134e4a' },
  marigold: { name: 'Marigold', mode: 'light', primary: '#fbbf24', bg: '#fffbeb', surface: '#fff', selection: '#fef3c7', text: '#78350f' },
  plum: { name: 'Royal Plum', mode: 'light', primary: '#a21caf', bg: '#fdf4ff', surface: '#fff', selection: '#fae8ff', text: '#701a75' },
  clay: { name: 'Terracotta', mode: 'light', primary: '#c2410c', bg: '#fff7ed', surface: '#fff', selection: '#ffedd5', text: '#7c2d12' },
  pine: { name: 'Mountain Pine', mode: 'light', primary: '#166534', bg: '#f0fdf4', surface: '#fff', selection: '#dcfce7', text: '#14532d' },
  crimson: { name: 'Crimson', mode: 'light', primary: '#dc2626', bg: '#fef2f2', surface: '#fff', selection: '#fee2e2', text: '#7f1d1d' },
  ocean_deep_light: { name: 'Deep Ocean (L)', mode: 'light', primary: '#0369a1', bg: '#f0f9ff', surface: '#fff', selection: '#e0f2fe', text: '#0c4a6e' },
  forest_edge_light: { name: 'Forest Edge (L)', mode: 'light', primary: '#15803d', bg: '#f0fdf4', surface: '#fff', selection: '#dcfce7', text: '#14532d' },
  midnight_sky_light: { name: 'Midnight Sky (L)', mode: 'light', primary: '#1d4ed8', bg: '#eff6ff', surface: '#fff', selection: '#dbeafe', text: '#1e3a8a' },

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
  blueprint: { name: 'Blueprint', mode: 'dark', primary: '#3b82f6', bg: '#172554', surface: '#1e3a8a', selection: '#1e40af', text: '#dbeafe' },
  toxic: { name: 'Toxic Waste', mode: 'dark', primary: '#bef264', bg: '#022c22', surface: '#064e3b', selection: '#14532d', text: '#dcfce7' },
  nebula: { name: 'Nebula', mode: 'dark', primary: '#f472b6', bg: '#1e1b4b', surface: '#312e81', selection: '#4338ca', text: '#fdf2f8' },
  abyss: { name: 'Ocean Depths', mode: 'dark', primary: '#06b6d4', bg: '#083344', surface: '#164e63', selection: '#155e75', text: '#ecfeff' },
  volcano: { name: 'Volcanic Ash', mode: 'dark', primary: '#ef4444', bg: '#1c1917', surface: '#292524', selection: '#44403c', text: '#fef2f2' },
  nordic: { name: 'Nordic Night', mode: 'dark', primary: '#88c0d0', bg: '#2e3440', surface: '#3b4252', selection: '#434c5e', text: '#eceff4' },
  amethyst: { name: 'Amethyst Dream', mode: 'dark', primary: '#c084fc', bg: '#1e1b4b', surface: '#312e81', selection: '#4338ca', text: '#f5f3ff' },
  carbon: { name: 'Carbon Fiber', mode: 'dark', primary: '#94a3b8', bg: '#000000', surface: '#171717', selection: '#262626', text: '#f8fafc' },
  emerald_night: { name: 'Deep Emerald', mode: 'dark', primary: '#10b981', bg: '#022c22', surface: '#064e3b', selection: '#065f46', text: '#ecfdf5' },
  wine: { name: 'Ruby Wine', mode: 'dark', primary: '#be123c', bg: '#4c0519', surface: '#881337', selection: '#9f1239', text: '#fff1f2' },
  shadow: { name: 'Shadow Realm', mode: 'dark', primary: '#475569', bg: '#020617', surface: '#0f172a', selection: '#1e293b', text: '#f8fafc' },
  highcontrast: { name: 'High Contrast', mode: 'dark', primary: '#ffff00', bg: '#000000', surface: '#000000', selection: '#333300', text: '#ffffff' },
  void: { name: 'The Void', mode: 'dark', primary: '#ffffff', bg: '#000000', surface: '#000000', selection: '#111111', text: '#ffffff' },
  pulsar: { name: 'Pulsar', mode: 'dark', primary: '#fb7185', bg: '#020617', surface: '#0f172a', selection: '#1e293b', text: '#f8fafc' },
  quasar: { name: 'Quasar', mode: 'dark', primary: '#34d399', bg: '#064e3b', surface: '#022c22', selection: '#065f46', text: '#ecfdf5' },
  singularity: { name: 'Singularity', mode: 'dark', primary: '#818cf8', bg: '#000000', surface: '#0a0a0a', selection: '#1a1a1a', text: '#e5e5e5' },
  event_horizon: { name: 'Event Horizon', mode: 'dark', primary: '#f87171', bg: '#000000', surface: '#0a0a0a', selection: '#1a1a1a', text: '#e5e5e5' },
  dark_matter: { name: 'Dark Matter', mode: 'dark', primary: '#a78bfa', bg: '#020617', surface: '#0f172a', selection: '#1e293b', text: '#f8fafc' },
  antimatter: { name: 'Antimatter', mode: 'dark', primary: '#2dd4bf', bg: '#000000', surface: '#0a0a0a', selection: '#1a1a1a', text: '#e5e5e5' },
  flare: { name: 'Solar Flare', mode: 'dark', primary: '#fb923c', bg: '#431407', surface: '#7c2d12', selection: '#9a3412', text: '#fff7ed' },
  lunar: { name: 'Lunar Surface', mode: 'dark', primary: '#94a3b8', bg: '#0f172a', surface: '#1e293b', selection: '#334155', text: '#f1f5f9' },
  eclipse: { name: 'Eclipse', mode: 'dark', primary: '#fbbf24', bg: '#000000', surface: '#1a1a1a', selection: '#333333', text: '#fbbf24' },
  comet: { name: 'Comet Tail', mode: 'dark', primary: '#38bdf8', bg: '#0c4a6e', surface: '#082f49', selection: '#075985', text: '#f0f9ff' },
  asteroid: { name: 'Asteroid Belt', mode: 'dark', primary: '#71717a', bg: '#18181b', surface: '#27272a', selection: '#3f3f46', text: '#f4f4f5' },
  supernova: { name: 'Supernova', mode: 'dark', primary: '#f43f5e', bg: '#4c0519', surface: '#000000', selection: '#881337', text: '#ffffff' },
  deep_sea: { name: 'Deep Sea', mode: 'dark', primary: '#0ea5e9', bg: '#082f49', surface: '#0c4a6e', selection: '#075985', text: '#f0f9ff' },
  night_owl: { name: 'Night Owl', mode: 'dark', primary: '#82aaff', bg: '#011627', surface: '#011e36', selection: '#1d3b53', text: '#d6deeb' },
  bat_cave: { name: 'Bat Cave', mode: 'dark', primary: '#facc15', bg: '#000000', surface: '#1a1a1a', selection: '#333333', text: '#ffffff' },
  graphite: { name: 'Graphite', mode: 'dark', primary: '#94a3b8', bg: '#18181b', surface: '#27272a', selection: '#3f3f46', text: '#f4f4f5' },
  onyx: { name: 'Onyx', mode: 'dark', primary: '#ffffff', bg: '#09090b', surface: '#18181b', selection: '#27272a', text: '#ffffff' },
  coal: { name: 'Coal Mine', mode: 'dark', primary: '#fb923c', bg: '#0c0a09', surface: '#1c1917', selection: '#292524', text: '#fafaf9' },
  ink: { name: 'Deep Ink', mode: 'dark', primary: '#6366f1', bg: '#030712', surface: '#111827', selection: '#1f2937', text: '#f9fafb' },
  stealth: { name: 'Stealth Mode', mode: 'dark', primary: '#4ade80', bg: '#050505', surface: '#111111', selection: '#222222', text: '#ffffff' },
  dracula: { name: 'Dracula', mode: 'dark', primary: '#ff79c6', bg: '#282a36', surface: '#44475a', selection: '#6272a4', text: '#f8f8f2' },
  monokai: { name: 'Monokai', mode: 'dark', primary: '#a6e22e', bg: '#272822', surface: '#3e3d32', selection: '#75715e', text: '#f8f8f2' },
  oceanic: { name: 'Oceanic Next', mode: 'dark', primary: '#6699cc', bg: '#1b2b34', surface: '#343d46', selection: '#4f5b66', text: '#d8dee9' },
  nord: { name: 'Nord Deep', mode: 'dark', primary: '#88c0d0', bg: '#2e3440', surface: '#3b4252', selection: '#434c5e', text: '#eceff4' },

  // --- SIGNATURE THEMES ---
  platinum: { name: 'Mantel Platinum', mode: 'light', primary: '#18181b', bg: '#fbfcfd', surface: '#FFF', selection: '#f4f4f5', text: '#09090b', isPremium: true },
  obsidian_premium: { name: 'Mantel Obsidian', mode: 'dark', primary: '#f4f4f5', bg: '#09090b', surface: '#18181b', selection: '#27272a', text: '#fafafa', isPremium: true },

  // --- SPECIAL THEMES ---
  custom: { name: 'Custom Theme', mode: 'light', primary: '#374151', bg: '#F9FAFB', surface: '#FFF', selection: '#E5E7EB', text: '#111827', isCustom: true }
};

export const getEmojiColor = (emoji, isDark = true) => {
  if (!emoji) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  let hash = 0;
  const str = String(emoji);
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, ${isDark ? 50 : 70}%, ${isDark ? 25 : 90}%)`;
};

export const getMantelTheme = (themeId = 'totem', customConfig = null) => {
  let spec = THEMES[themeId] || THEMES.totem;
  
  // Handle Custom Theme Injection
  if (themeId === 'custom') {
      spec = {
          ...THEMES.custom,
          ...(customConfig || {}),
          name: 'Custom Theme'
      };
  }

  const isDark = spec.mode === 'dark';
  const isPremium = spec.isPremium === true;
  const primaryColor = spec.primary || '#374151';

  return extendTheme({
    fontFamily: {
        body: '"DM Sans", var(--joy-fontFamily-fallback)',
        display: isPremium ? '"DM Serif Display", serif' : '"DM Sans", var(--joy-fontFamily-fallback)',
    },
    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
    },
    shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    colorSchemes: {
      [spec.mode]: {
        palette: {
          background: {
            body: spec.bg || (isDark ? '#0f172a' : '#F9FAFB'),
            surface: spec.surface || (isDark ? '#1e293b' : '#FFF'),
            level1: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            level2: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            level3: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.09)',
          },
          text: {
            primary: spec.text || (isDark ? '#f1f5f9' : '#111827'),
            secondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          },
          primary: {
            solidBg: primaryColor,
            solidHoverBg: isPremium ? (isDark ? '#ffffff' : '#000000') : primaryColor,
            plainColor: primaryColor,
            outlinedColor: primaryColor,
            outlinedBorder: primaryColor,
            softBg: isDark ? 'rgba(255,255,255,0.1)' : `${primaryColor}15`,
          },
          neutral: {
            outlinedBorder: spec.selection || (isDark ? '#334155' : '#E5E7EB'),
            plainColor: spec.text || (isDark ? '#f1f5f9' : '#111827'),
          },
          divider: spec.selection || (isDark ? '#334155' : '#E5E7EB'),
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
               fontWeight: isPremium ? 400 : 700,
               letterSpacing: isPremium ? '-0.02em' : 'normal',
             }),
             ...(ownerState.level === 'h1' && {
                fontFamily: 'var(--joy-fontFamily-display)',
                fontWeight: isPremium ? 400 : 800,
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
            '&:hover': {
                boxShadow: 'var(--joy-shadow-md)',
            }
          },
        },
      },
      JoyButton: {
        styleOverrides: {
            root: ({ ownerState }) => ({
                borderRadius: 'var(--joy-radius-md)',
                fontWeight: 600,
                ...(ownerState.variant === 'solid' && isPremium && {
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                })
            })
        }
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
      JoyTab: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            ...(ownerState.selected && {
              color: isDark ? '#fff' : 'var(--joy-palette-primary-plainColor)',
              backgroundColor: ownerState.variant === 'solid' ? 'var(--joy-palette-primary-solidBg)' : 'transparent',
              fontWeight: 'bold',
            }),
          }),
        },
      },
    },
  });
};

export const getThemeSpec = (themeId = 'totem', customConfig = null) => {
  let spec = THEMES[themeId] || THEMES.totem;
  if (themeId === 'custom' && customConfig) {
      spec = { ...spec, ...customConfig };
  }
  return {
    spec,
    isDark: spec.mode === 'dark'
  };
};