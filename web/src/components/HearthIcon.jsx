import { SvgIcon } from '@mui/joy';

export default function HearthIcon({ sx, ...props }) {
  const primary = `var(--joy-palette-primary-solidBg)`;
  const secondary = `var(--joy-palette-primary-softBg)`;

  return (
    <SvgIcon viewBox="0 0 24 24" sx={sx} {...props}>
       {/* Stylized Hearth/Fireplace */}
       <path d="M4 21V6C4 4.89543 4.89086 4 6 4H18C19.1046 4 20 4.89543 20 6V21" fill="none" stroke={primary} strokeWidth="2" />
       <path d="M2 21H22" stroke={primary} strokeWidth="2" strokeLinecap="round" />
       <path d="M8 21C8 18.7909 9.79086 17 12 17C14.2091 17 16 18.7909 16 21" fill={secondary} stroke={primary} strokeWidth="2" />
       <path d="M12 14L10 11H14L12 14Z" fill={primary} />
       <circle cx="12" cy="9" r="1" fill={primary} />
    </SvgIcon>
  );
}
