import { createTheme } from '@mui/material/styles';

// Official Dracula Classic (Dark)
const DRACULA = {
  background: "#282A36",
  backgroundDark: "#21222C",
  backgroundDarker: "#191A21",
  backgroundLight: "#343746",
  backgroundLighter: "#424450",
  selection: "#44475A",
  foreground: "#F8F8F2",
  comment: "#6272A4",
  cyan: "#8BE9FD",
  green: "#50FA7B",
  orange: "#FFB86C",
  pink: "#FF79C6",
  purple: "#BD93F9",
  red: "#FF5555",
  yellow: "#F1FA8C",
};

// Official Alucard Classic (Light)
const ALUCARD = {
  background: "#FFFBEB",
  backgroundDark: "#CECCC0",
  backgroundDarker: "#BCBAB3",
  backgroundLight: "#DEDCCF",
  backgroundLighter: "#ECE9DF",
  selection: "#CFCFDE",
  foreground: "#1F1F1F",
  comment: "#6C664B",
  cyan: "#036A96",
  green: "#14710A",
  orange: "#A34D14",
  pink: "#A3144D",
  purple: "#644AC9",
  red: "#CB3A2A",
  yellow: "#846E15",
};

// Standard Themes
const STANDARD_LIGHT = {
  background: "#f8f9fa",
  paper: "#ffffff",
  primary: "#00695c",
  secondary: "#4db6ac",
  foreground: "#212121",
  divider: "rgba(0,0,0,0.12)"
};

const STANDARD_DARK = {
  background: "#121212",
  paper: "#1e1e1e",
  primary: "#4db6ac",
  secondary: "#00695c",
  foreground: "#ffffff",
  divider: "rgba(255,255,255,0.12)"
};

/**
 * Generates a consistent background color for a given emoji/string.
 * Uses a simple hash to pick a hue and returns an HSL color.
 */
export const getEmojiColor = (emoji, isDark = true) => {
  if (!emoji) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  let hash = 0;
  const str = String(emoji);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  // For dark mode, use lower lightness; for light mode, use higher.
  // Increase saturation for more vibrant backgrounds.
  const saturation = isDark ? 50 : 70;
  const lightness = isDark ? 25 : 90;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const getTotemTheme = (mode = 'light', useDracula = true) => {
  let effectiveMode = mode;
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveMode = prefersDark ? 'dark' : 'light';
  }

  const isDark = effectiveMode === 'dark';
  const spec = useDracula ? (isDark ? DRACULA : ALUCARD) : (isDark ? STANDARD_DARK : STANDARD_LIGHT);
  
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: spec.primary || spec.purple, contrastText: isDark ? (spec.foreground || '#fff') : '#fff' },
      secondary: { main: spec.secondary || spec.pink },
      background: { default: spec.background, paper: isDark ? (spec.backgroundLight || spec.paper) : (spec.paper || "#FFFFFF") },
      text: { primary: spec.foreground, secondary: spec.comment || (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)') },
      divider: spec.selection || spec.divider,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '.rbc-calendar': {
            color: `${spec.foreground} !important`,
          },
          '.rbc-off-range-bg': {
            backgroundColor: isDark ? 'rgba(0,0,0,0.2) !important' : 'rgba(0,0,0,0.05) !important',
          },
          '.rbc-today': {
            backgroundColor: isDark ? 'rgba(189, 147, 249, 0.1) !important' : 'rgba(100, 74, 201, 0.08) !important',
            border: `1px solid ${spec.purple} !important`,
          },
          '.rbc-header': {
             borderBottom: `1px solid ${spec.selection || spec.divider} !important`,
             padding: '8px 0 !important',
             fontWeight: 'bold',
          },
          '.rbc-month-view, .rbc-time-view, .rbc-agenda-view': {
            border: `1px solid ${spec.selection || spec.divider} !important`,
            borderRadius: '8px',
            overflow: 'hidden'
          },
          '.rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row, .rbc-time-content > * + *': {
            borderLeft: `1px solid ${spec.selection || spec.divider} !important`,
            borderTop: `1px solid ${spec.selection || spec.divider} !important`,
          },
          '.rbc-toolbar button': {
            color: `${spec.foreground} !important`,
            border: `1px solid ${spec.selection || spec.divider} !important`,
          },
          '.rbc-toolbar button:hover, .rbc-toolbar button:active, .rbc-toolbar button.rbc-active': {
            backgroundColor: `${spec.selection || spec.divider} !important`,
            color: `${spec.foreground} !important`,
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: useDracula ? (isDark ? DRACULA.backgroundDark : ALUCARD.red) : spec.primary,
            backgroundImage: 'none',
            color: '#fff',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: useDracula ? spec.backgroundLighter : (isDark ? spec.paper : "#fff"),
            borderRight: `1px solid ${spec.selection || spec.divider}`,
          },
        },
      },
    },
  });
};
