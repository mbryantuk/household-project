import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/joy';
import { Slide } from '@mui/material';
import { WifiOff } from '@mui/icons-material';

/**
 * NetworkStatusBanner
 * A non-intrusive top-bar banner when the user loses connection.
 */
export default function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Slide in={isOffline} direction="down">
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 11000, // Above everything
          bgcolor: 'danger.solidBg',
          color: 'danger.contrastText',
          py: 1,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          boxShadow: 'md',
        }}
      >
        <WifiOff sx={{ fontSize: '1.2rem' }} />
        <Typography level="body-sm" sx={{ color: 'inherit', fontWeight: 'bold' }}>
          Network Connection Lost. Working in Offline Mode.
        </Typography>
      </Box>
    </Slide>
  );
}
