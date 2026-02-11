import { extendTheme } from '@mui/joy/styles';

export const THEMES = {
  // --- SIGNATURE THEMES ---
  platinum: { name: 'Mantel Platinum', mode: 'light', primary: '#18181b', bg: '#fbfcfd', surface: '#FFF', selection: '#f4f4f5', text: '#09090b', isPremium: true },
  obsidian: { name: 'Mantel Obsidian', mode: 'dark', primary: '#f4f4f5', bg: '#09090b', surface: '#18181b', selection: '#27272a', text: '#fafafa', isPremium: true },
  midnight_signature: { name: 'Mantel Midnight', mode: 'dark', primary: '#38bdf8', bg: '#0f172a', surface: '#1e293b', selection: '#334155', text: '#f1f5f9', isPremium: true },
  forest_signature: { name: 'Mantel Forest', mode: 'dark', primary: '#22c55e', bg: '#052e16', surface: '#064e3b', selection: '#14532d', text: '#dcfce7', isPremium: true },
  
  // Promoted Signature Themes
  totem: { name: 'Mantel Classic', mode: 'light', primary: '#374151', bg: '#F9FAFB', surface: '#FFF', selection: '#E5E7EB', text: '#111827', isPremium: true },
  ocean: { name: 'Mantel Ocean', mode: 'light', primary: '#0284c7', bg: '#f0f9ff', surface: '#fff', selection: '#e0f2fe', text: '#0c4a6e', isPremium: true },
  sunset: { name: 'Mantel Sunset', mode: 'light', primary: '#ea580c', bg: '#fff7ed', surface: '#fff', selection: '#ffedd5', text: '#7c2d12', isPremium: true },
  space: { name: 'Mantel Space', mode: 'dark', primary: '#6366f1', bg: '#020617', surface: '#0f172a', selection: '#1e293b', text: '#e0e7ff', isPremium: true },
  jungle: { name: 'Mantel Jungle', mode: 'dark', primary: '#eab308', bg: '#022c22', surface: '#064e3b', selection: '#065f46', text: '#ecfdf5', isPremium: true },
  
  // Special Theme: Custom
  custom: { name: 'Custom Theme', mode: 'light', primary: '#374151', bg: '#F9FAFB', surface: '#FFF', selection: '#E5E7EB', text: '#111827', isCustom: true, isPremium: true }
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
            secondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
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