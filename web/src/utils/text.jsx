import React from 'react';
import { Typography, Box } from '@mui/joy';

/**
 * TextHighlighter
 * Wraps matching text in bold/highlighted span.
 */
export const TextHighlighter = ({ text, query }) => {
  if (!query || !text) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Box component="span" key={i} sx={{ fontWeight: 'bold', color: 'primary.solidBg' }}>
            {part}
          </Box>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};
