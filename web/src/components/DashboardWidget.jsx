import React from 'react';
import { Card, Typography, Box, Stack, Skeleton } from '@mui/joy';
import { DragIndicator } from '@mui/icons-material';

/**
 * Modern "Glass" Widget for Dashboard
 */
export default function DashboardWidget({
  title,
  icon: Icon,
  children,
  color = 'primary',
  action,
  loading = false,
  sx = {},
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        backdropFilter: 'blur(12px)',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.background.surface} 40%, ${theme.palette.background.level1} 100%)`,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'sm',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          boxShadow: 'md',
          borderColor: `${color}.300`,
        },
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          className="widget-drag-handle"
          sx={{ cursor: 'grab', flexGrow: 1 }}
        >
          <DragIndicator sx={{ color: 'neutral.400', fontSize: '1.2rem', mr: -0.5 }} />
          {Icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: `linear-gradient(135deg, var(--joy-palette-${color}-400) 0%, var(--joy-palette-${color}-600) 100%)`,
                color: '#fff',
                boxShadow: `0 4px 10px var(--joy-palette-${color}-softBg)`,
              }}
            >
              <Icon sx={{ fontSize: '1rem' }} />
            </Box>
          )}
          <Typography level="title-sm" fontWeight="bold" sx={{ opacity: 0.9 }}>
            {title}
          </Typography>
        </Stack>

        {action}
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Skeleton loading={loading}>{children}</Skeleton>
      </Box>
    </Card>
  );
}
