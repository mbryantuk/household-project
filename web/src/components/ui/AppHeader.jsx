import React from 'react';
import { Box, Typography } from '@mui/joy';

/**
 * Standard Page Header component as defined in Branding.md
 *
 * @param {string} title - The main heading (h2)
 * @param {string} description - The sub-heading description (body-md)
 * @param {object} sx - Additional styles for the container
 */
export default function AppHeader({ title, description, endDecorator, sx = {}, ...props }) {
  return (
    <Box
      sx={{
        mb: 4,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        ...sx,
      }}
      {...props}
    >
      <Box>
        <Typography
          level="h2"
          sx={{
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography level="body-md" color="neutral">
            {description}
          </Typography>
        )}
      </Box>
      {endDecorator && <Box sx={{ flexShrink: 0 }}>{endDecorator}</Box>}
    </Box>
  );
}
