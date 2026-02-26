import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/joy';
import { ContentCopy, Check } from '@mui/icons-material';

/**
 * Reusable Copy to Clipboard component with feedback.
 */
export default function CopyToClipboard({ value, size = 'sm', variant = 'plain' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'} variant="solid" size="sm">
      <IconButton
        size={size}
        variant={variant}
        color={copied ? 'success' : 'neutral'}
        onClick={handleCopy}
        sx={{
          '--IconButton-size': size === 'sm' ? '28px' : '32px',
          opacity: copied ? 1 : 0.5,
          '&:hover': { opacity: 1 },
          transition: 'all 0.2s',
        }}
      >
        {copied ? <Check sx={{ fontSize: '1rem' }} /> : <ContentCopy sx={{ fontSize: '1rem' }} />}
      </IconButton>
    </Tooltip>
  );
}
