import { SvgIcon } from '@mui/joy';

export default function AppIcon({ sx, ...props }) {
  const primary = `var(--joy-palette-primary-solidBg)`;

  return (
    <SvgIcon viewBox="0 0 24 24" sx={sx} {...props}>
       {/* Monolithic Stone Shape */}
       <path 
         d="M12 3L20 7V17L12 21L4 17V7L12 3Z" 
         fill="none" 
         stroke={primary} 
         strokeWidth="2.5" 
         strokeLinejoin="round" 
       />
       {/* Inner Spark / Energy */}
       <path 
         d="M12 8L14 11L12 14L10 11L12 8Z" 
         fill={primary} 
       />
       <path 
         d="M12 15L12 18" 
         stroke={primary} 
         strokeWidth="1.5" 
         strokeLinecap="round" 
       />
    </SvgIcon>
  );
}