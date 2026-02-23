import { Avatar, useColorScheme } from '@mui/joy';
import { getEmojiColor } from '../../theme';

/**
 * Standardized Emoji Avatar
 * Dynamically generates a theme-aware background based on the emoji character.
 */
export default function EmojiAvatar({ emoji, size = 'md', sx = {}, ...props }) {
  const { mode, systemMode } = useColorScheme();
  const isDark = (mode === 'system' ? systemMode : mode) === 'dark';

  const backgroundColor = getEmojiColor(emoji, isDark);

  return (
    <Avatar
      variant="soft"
      size={size}
      sx={{
        backgroundColor,
        fontSize: size === 'sm' ? '1rem' : size === 'lg' ? '2rem' : '1.5rem',
        borderRadius: 'sm',
        ...sx,
      }}
      {...props}
    >
      {emoji}
    </Avatar>
  );
}
