import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/joy';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAppLock } from '../../context/AppLockContext';

/**
 * SENSITIVE FIELD COMPONENT
 * Item 234: Mask values until clicked/verified
 */
export default function SensitiveField({ value, maskChar = '•' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyIdentity, isLockEnabled } = useAppLock();

  if (!value)
    return (
      <Typography level="body-sm" color="neutral">
        -
      </Typography>
    );

  const handleToggle = async () => {
    if (isVisible) {
      setIsVisible(false);
      return;
    }

    // Item 234: If app lock is enabled, require secondary verification to reveal
    if (isLockEnabled) {
      setIsVerifying(true);
      const success = await verifyIdentity();
      setIsVerifying(false);
      if (success) setIsVisible(true);
    } else {
      setIsVisible(true);
    }
  };

  const masked = maskChar.repeat(value.length > 8 ? 8 : value.length);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        level="body-sm"
        sx={{
          fontFamily: isVisible ? 'monospace' : 'inherit',
          letterSpacing: isVisible ? '0.05em' : '0.2em',
        }}
      >
        {isVisible ? value : masked}
      </Typography>
      <Tooltip title={isVisible ? 'Hide' : 'Reveal (requires verification)'} variant="soft">
        <IconButton
          size="sm"
          variant="plain"
          color={isVisible ? 'primary' : 'neutral'}
          onClick={handleToggle}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <CircularProgress size="sm" thickness={2} />
          ) : isVisible ? (
            <VisibilityOff />
          ) : (
            <Visibility />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
