import React from 'react';
import { Box, Typography, Divider } from '@mui/joy';

/**
 * Shared Form Section
 * Used to group related form fields with a title and optional divider.
 *
 * @param {string} title - Section title
 * @param {string} icon - Optional icon/emoji
 * @param {boolean} showDivider - Whether to show a divider above the title (default: true for non-first sections)
 * @param {React.ReactNode} children - Form fields
 */
export default function FormSection({ title, icon, showDivider = true, children, sx = {} }) {
  return (
    <Box sx={{ mt: showDivider ? 3 : 0, ...sx }}>
      {showDivider && <Divider sx={{ mb: 2 }} />}
      {title && (
        <Typography
          level="title-sm"
          sx={{
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'primary.500',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'bold',
          }}
        >
          {icon && <span>{icon}</span>}
          {title}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
    </Box>
  );
}
