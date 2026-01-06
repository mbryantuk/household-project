import { SvgIcon } from '@mui/material';

const THEMES = {
  default: { primary: "#00695c", secondary: "#4db6ac" }, // Teal
  ocean:   { primary: "#1565c0", secondary: "#64b5f6" }, // Blue
  forest:  { primary: "#2e7d32", secondary: "#a5d6a7" }, // Green
  volcano: { primary: "#c62828", secondary: "#ef9a9a" }, // Red
  sun:     { primary: "#f9a825", secondary: "#fff59d" }, // Gold
  royal:   { primary: "#6a1b9a", secondary: "#ce93d8" }, // Purple
  dark:    { primary: "#37474f", secondary: "#90a4ae" }, // Grey
};

export default function TotemIcon({ theme = 'default', sx, ...props }) {
  const colors = THEMES[theme] || THEMES.default;
  const { primary, secondary } = colors;

  return (
    <SvgIcon viewBox="0 0 24 24" sx={sx} {...props}>
       <rect x="5" y="2" width="14" height="6" rx="1" fill={secondary} />
       <path d="M5 2 L1 4 V7 L5 5 Z" fill={primary}/>
       <path d="M19 2 L23 4 V7 L19 5 Z" fill={primary}/>
       <circle cx="9" cy="5" r="1.5" fill={primary} />
       <circle cx="15" cy="5" r="1.5" fill={primary} />
       <rect x="3" y="9" width="18" height="7" rx="1.5" fill={primary} />
       <rect x="8" y="12" width="8" height="3" rx="0.5" fill={secondary} />
       <path d="M6 17 H18 V22 C18 23.1 17.1 24 16 24 H8 C6.9 24 6 23.1 6 22 V17 Z" fill={secondary} />
       <path d="M6 17 L18 17 L12 21 Z" fill={primary} opacity="0.3" />
    </SvgIcon>
  );
}