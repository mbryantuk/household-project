import { SvgIcon } from '@mui/joy';

export default function MantelIcon({ sx, ...props }) {
  // Actually, Joy provides CSS variables for these:
  const primary = `var(--joy-palette-primary-solidBg)`;
  const secondary = `var(--joy-palette-secondary-solidBg)`;

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