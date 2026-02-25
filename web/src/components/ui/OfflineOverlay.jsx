import React from 'react';
import { Box, Typography, Sheet, Button, Stack } from '@mui/joy';
import { WifiOff, Refresh } from '@mui/icons-material';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Item 177: Network Disconnect UI
 * Theme-aware overlay that appears when the browser loses connectivity.
 */
export default function OfflineOverlay() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        bgcolor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Sheet
        variant="outlined"
        sx={{
          maxWidth: 400,
          width: '100%',
          p: 4,
          borderRadius: 'lg',
          textAlign: 'center',
          boxShadow: 'xl',
        }}
      >
        <WifiOff sx={{ fontSize: '4rem', color: 'danger.solidBg', mb: 2 }} />
        <Typography level="h3" mb={1}>
          Connection Lost
        </Typography>
        <Typography level="body-md" color="neutral" mb={3}>
          You are currently offline. Some features may be unavailable until your connection is restored.
        </Typography>
        <Stack spacing={1}>
          <Button
            variant="solid"
            color="primary"
            startDecorator={<Refresh />}
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </Button>
        </Stack>
      </Sheet>
    </Box>
  );
}
