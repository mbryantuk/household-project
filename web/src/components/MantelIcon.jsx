import { SvgIcon } from '@mui/joy';

export default function MantelIcon({ sx, ...props }) {
  // Structure uses text.primary to adapt to Light/Dark modes automatically
  // Hearth uses warning.solidBg to represent the amber/copper warmth
  return (
    <SvgIcon viewBox="0 0 24 24" sx={sx} {...props}>
       <rect x="2" y="5" width="20" height="4" rx="1" fill="currentColor" />
       <rect x="4" y="9" width="4" height="11" rx="0.5" fill="currentColor" />
       <rect x="16" y="9" width="4" height="11" rx="0.5" fill="currentColor" />
       <path d="M12 14 C10 14 9 16 9 18 H15 C15 16 14 14 12 14 Z" fill="var(--joy-palette-warning-solidBg, #D97706)" />
    </SvgIcon>
  );
}