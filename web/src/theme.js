import { createTheme } from '@mui/material/styles';

export const COLORWAYS = {
  default: { primary: "#00695c", secondary: "#4db6ac" },
  ocean:   { primary: "#1565c0", secondary: "#64b5f6" },
  forest:  { primary: "#2e7d32", secondary: "#a5d6a7" },
  volcano: { primary: "#c62828", secondary: "#ef9a9a" },
  sun:     { primary: "#f9a825", secondary: "#fff59d" },
  royal:   { primary: "#6a1b9a", secondary: "#ce93d8" },
  dark:    { primary: "#37474f", secondary: "#90a4ae" },
};

export const getTotemTheme = (colorway = 'default', mode = 'light') => {
  const colors = COLORWAYS[colorway] || COLORWAYS.default;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary,
        contrastText: '#fff',
      },
      secondary: {
        main: colors.secondary,
      },
      background: {
        default: mode === 'dark' ? '#121212' : '#f8f9fa',
        paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.primary,
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? '#1e1e1e' : '#fff',
            borderRight: `1px solid ${mode === 'dark' ? '#333' : '#e0e0e0'}`,
          },
        },
      },
    },
  });
};