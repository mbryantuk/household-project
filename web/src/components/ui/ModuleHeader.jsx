import React from 'react';
import { Box, Typography, Avatar, Card, Stack, Chip } from '@mui/joy';

/**
 * ModuleHeader
 * Stylized header for feature modules, matching the Hero style of GenericObjectView.
 */
export default function ModuleHeader({ 
  title, 
  description, 
  emoji = '📄', 
  action,
  chips = [] 
}) {
  return (
    <Card 
      variant="solid" 
      sx={{ 
          mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: 'center',
          bgcolor: 'neutral.900',
          color: 'common.white',
          '[data-joy-color-scheme="light"] &': { 
              bgcolor: 'common.white', 
              color: 'text.primary', 
              border: '1px solid', 
              borderColor: 'neutral.200',
              boxShadow: 'sm'
          }
      }}
    >
        <Box sx={{ position: 'relative' }}>
            <Avatar 
                size="lg" 
                variant="soft" 
                sx={{ 
                    width: 80, height: 80, fontSize: '3rem',
                    bgcolor: 'background.surface',
                    boxShadow: 'md',
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder'
                }}
            >
                {emoji}
            </Avatar>
        </Box>
        <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography level="h2" sx={{ color: 'inherit' }}>{title}</Typography>
            {description && (
                <Typography level="body-md" sx={{ opacity: 0.8, color: 'inherit' }}>
                    {description}
                </Typography>
            )}
            {chips.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                    {chips.map((chip, idx) => (
                        <Chip 
                            key={idx} 
                            size="sm" 
                            variant={chip.variant || "outlined"} 
                            color={chip.color || "neutral"}
                            sx={chip.variant === 'solid' ? {} : { color: 'inherit', borderColor: 'rgba(255,255,255,0.3)' }}
                        >
                            {chip.label}
                        </Chip>
                    ))}
                </Stack>
            )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {action}
        </Box>
    </Card>
  );
}