import React from 'react';
import { Box, Typography, Divider } from '@mui/joy';

/**
 * StatusBar component for tables/grids.
 * Shows Count and numeric SUM as mandated by GEMINI.md.
 */
export default function StatusBar({ count = 0, sum = null, sumLabel = "Total SUM", sx }) {
  if (count === 0 && !sum) return null;

  const formatCurrency = (val) => {
    return val.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        px: 2, 
        py: 1, 
        bgcolor: 'background.surface',
        borderTop: '1px solid',
        borderColor: 'divider',
        borderRadius: '0 0 8px 8px',
        ...sx 
      }}
    >
      <Typography level="body-xs" sx={{ fontWeight: 'bold' }}>
        COUNT: {count}
      </Typography>
      {sum !== null && (
        <>
          <Divider orientation="vertical" />
          <Typography level="body-xs" sx={{ fontWeight: 'bold' }}>
            {sumLabel}: {formatCurrency(sum)}
          </Typography>
        </>
      )}
    </Box>
  );
}
