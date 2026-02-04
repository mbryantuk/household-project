import React from 'react';
import { Box, Typography } from '@mui/joy';

/**
 * Standard Page Header component as defined in Branding.md
 * 
 * @param {string} title - The main heading (h2)
 * @param {string} description - The sub-heading description (body-md)
 * @param {object} sx - Additional styles for the container
 */
export default function AppHeader({ title, description, sx = {}, ...props }) {
  return (
    <Box sx={{ mb: 4, ...sx }} {...props}>
      <Typography 
        level="h2" 
        sx={{ 
          fontWeight: 'lg', 
          mb: 0.5, 
          fontSize: '1.5rem' 
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
  );
}
