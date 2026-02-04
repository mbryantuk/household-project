import React from 'react';
import { Avatar } from '@mui/joy';
import { getEmojiColor } from '../../theme';

/**
 * Standard Avatar component with dynamic theme-aware background colors.
 * 
 * @param {string} emoji - The emoji or character to display
 * @param {boolean} isDark - Whether the current theme is dark mode
 * @param {string} size - MUI Joy size (sm, md, lg, xl)
 */
export default function AppAvatar({ emoji, isDark, size = 'md', sx = {}, ...props }) {
  const char = emoji || '?';
  const bgColor = getEmojiColor(char, isDark);
  
  return (
    <Avatar
      size={size}
      sx={{
        bgcolor: bgColor,
        fontSize: size === 'lg' ? '1.5rem' : (size === 'xl' ? '2rem' : 'inherit'),
        ...sx
      }}
      {...props}
    >
      {char}
    </Avatar>
  );
}
