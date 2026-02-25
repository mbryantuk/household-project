import React from 'react';
import { Box, Typography, Avatar, Card, Stack, Chip, useColorScheme } from '@mui/joy';
import { getEmojiColor } from '../../utils/colors';

/**
 * ModuleHeader
 * Stylized header for feature modules, matching the Hero style.
 * Uses dynamic emoji coloring (Item 19).
 */
export default function ModuleHeader({
  title,
  description,
  emoji = '📄',
  action,
  chips = [],
  titleTestId,
}) {
  const { mode, systemMode } = useColorScheme();
  const isDark = (mode === 'system' ? systemMode : mode) === 'dark';

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 4,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 3,
        p: 3,
        alignItems: 'center',
        borderRadius: 'lg',
        boxShadow: 'sm',
        background: isDark
          ? 'linear-gradient(135deg, var(--joy-palette-background-surface) 0%, var(--joy-palette-background-level1) 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, var(--joy-palette-background-level1) 100%)',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Avatar
          size="lg"
          variant="soft"
          sx={{
            width: 80,
            height: 80,
            fontSize: '3rem',
            bgcolor: getEmojiColor(emoji, isDark),
            boxShadow: 'md',
            border: '2px solid',
            borderColor: 'background.surface',
          }}
        >
          {emoji}
        </Avatar>
      </Box>

      <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
        <Typography level="h2" component="h1" data-testid={titleTestId}>
          {title}
        </Typography>
        {description && (
          <Typography level="body-md" color="neutral" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
        {chips.length > 0 && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}
          >
            {chips.map((chip, idx) => (
              <Chip
                key={idx}
                size="sm"
                variant={chip.variant || 'soft'}
                color={chip.color || 'primary'}
              >
                {chip.label}
              </Chip>
            ))}
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexShrink: 0,
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'center', sm: 'flex-end' },
        }}
      >
        {action}
      </Box>
    </Card>
  );
}
