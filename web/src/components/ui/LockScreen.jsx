import React from 'react';
import { Box, Typography, Button, Avatar, Sheet } from '@mui/joy';
import { Fingerprint, Lock } from '@mui/icons-material';
import { useAppLock } from '../../context/AppLockContext';
import { useAuth } from '../../context/AuthContext';
import { getEmojiColor } from '../../utils/colors';

/**
 * BIOMETRIC LOCK SCREEN
 * Item 229: Protect app when resumed/backgrounded
 */
export default function LockScreen() {
  const { unlockApp } = useAppLock();
  const { user, logout } = useAuth();

  return (
    <Sheet
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.body',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: 400, px: 2 }}>
        <Avatar
          size="lg"
          sx={{
            width: 80,
            height: 80,
            mx: 'auto',
            mb: 3,
            bgcolor: getEmojiColor(user?.avatar || '👤'),
            fontSize: '2rem',
          }}
        >
          {user?.avatar || user?.firstName?.[0]}
        </Avatar>

        <Typography level="h2" mb={1}>
          App Locked
        </Typography>
        <Typography level="body-md" color="neutral" mb={4}>
          Verify your identity to resume your session.
        </Typography>

        <Button
          size="lg"
          variant="solid"
          color="primary"
          startDecorator={<Fingerprint />}
          onClick={unlockApp}
          fullWidth
          sx={{ mb: 2 }}
        >
          Unlock with Biometrics
        </Button>

        <Button variant="plain" color="neutral" onClick={logout} startDecorator={<Lock />}>
          Switch Account / Log Out
        </Button>
      </Box>
    </Sheet>
  );
}
