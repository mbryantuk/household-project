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
};

const STANDARD_DARK = {
  background: "#121212",
  paper: "#1e1e1e",
  primary: "#4db6ac",
  secondary: "#00695c",
  foreground: "#ffffff",
};

export const getTotemTheme = (mode = 'light', useDracula = true) => {
  let effectiveMode = mode;
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    effectiveMode = prefersDark ? 'dark' : 'light';
  }

  const isDark = effectiveMode === 'dark';
  
  if (useDracula) {
    const spec = isDark ? DRACULA : ALUCARD;
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: { main: spec.purple, contrastText: isDark ? spec.foreground : '#fff' },
        secondary: { main: spec.pink },
        background: { default: spec.background, paper: isDark ? spec.backgroundLight : "#FFFFFF" },
        text: { primary: spec.foreground, secondary: spec.comment },
        divider: spec.selection,
      },
      components: {
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: isDark ? DRACULA.backgroundDark : ALUCARD.red,
              backgroundImage: 'none',
              color: '#fff',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundColor: spec.backgroundLighter,
              borderRight: `1px solid ${spec.selection}`,
            },
          },
        },
      },
    });
  } else {
    const spec = isDark ? STANDARD_DARK : STANDARD_LIGHT;
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: { main: spec.primary },
        secondary: { main: spec.secondary },
        background: { default: spec.background, paper: spec.paper },
        text: { primary: spec.foreground },
      },
      components: {
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: spec.primary,
              backgroundImage: 'none',
            },
          },
        },
      },
    });
  }
};