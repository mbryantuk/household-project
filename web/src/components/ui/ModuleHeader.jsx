import React from 'react';
import { Box, Typography, Avatar } from '@mui/joy';
import { getEmojiColor } from '../../theme';

export default function ModuleHeader({ 
  title, 
  description, 
  emoji = '📄', 
  isDark, 
  action 
}) {
  return (
    <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
                size="lg" 
                variant="soft" 
                sx={{ 
                    width: 64, height: 64, fontSize: '2.5rem',
                    bgcolor: getEmojiColor(emoji, isDark)
                }}
            >
                {emoji}
            </Avatar>
            <Box>
                <Typography level="h2">{title}</Typography>
                {description && <Typography level="body-sm" color="neutral">{description}</Typography>}
            </Box>
        </Box>
        <Box sx={{ flexShrink: 0 }}>
            {action}
        </Box>
    </Box>
  );
}
