import { extendTheme } from '@mui/joy/styles';

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

export const getEmojiColor = (emoji, isDark = true) => {
  if (!emoji) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  let hash = 0;
  const str = String(emoji);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const saturation = isDark ? 50 : 70;
  const lightness = isDark ? 25 : 90;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Joy UI Theme Generator
export const getTotemTheme = (useDracula = true) => {
  const lightSpec = useDracula ? ALUCARD : STANDARD_LIGHT;
  const darkSpec = useDracula ? DRACULA : STANDARD_DARK;

  return extendTheme({
    colorSchemes: {
      light: {
        palette: {
          background: {
            body: lightSpec.background,
            surface: lightSpec.paper || lightSpec.backgroundLight || "#fff",
            level1: lightSpec.backgroundLighter || "#f5f5f5",
          },
          text: {
            primary: lightSpec.foreground,
            secondary: lightSpec.comment || "rgba(0,0,0,0.6)",
          },
          primary: {
            solidBg: lightSpec.primary || lightSpec.purple || lightSpec.red,
            solidHoverBg: lightSpec.secondary || lightSpec.pink,
            plainColor: lightSpec.primary || lightSpec.purple,
          },
          neutral: {
            outlinedBorder: lightSpec.selection || lightSpec.divider,
          },
          divider: lightSpec.selection || lightSpec.divider,
        },
      },
      dark: {
        palette: {
          background: {
            body: darkSpec.background,
            surface: darkSpec.paper || darkSpec.backgroundLight || "#1e1e1e",
            level1: darkSpec.backgroundLighter || "#212121",
          },
          text: {
            primary: darkSpec.foreground,
            secondary: darkSpec.comment || "rgba(255,255,255,0.7)",
          },
          primary: {
            solidBg: darkSpec.primary || darkSpec.purple,
            solidHoverBg: darkSpec.secondary || darkSpec.pink,
            plainColor: darkSpec.primary || darkSpec.purple,
          },
          neutral: {
            outlinedBorder: darkSpec.selection || darkSpec.divider,
          },
          divider: darkSpec.selection || darkSpec.divider,
        },
      },
    },
  });
};

export const getThemeSpec = (mode = 'light', useDracula = true) => {
    let effectiveMode = mode;
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveMode = prefersDark ? 'dark' : 'light';
    }
    const isDark = effectiveMode === 'dark';
    return {
        spec: useDracula ? (isDark ? DRACULA : ALUCARD) : (isDark ? STANDARD_DARK : STANDARD_LIGHT),
        isDark
    };
};
