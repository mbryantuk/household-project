import React from 'react';
import {
  Card,
  Typography,
  Box,
  IconButton,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  Stack,
} from '@mui/joy';
import { MoreHoriz } from '@mui/icons-material';

/**
 * Modern "Glass" Widget for Dashboard
 */
export default function DashboardWidget({
  title,
  icon: Icon,
  children,
  color = 'primary',
  action,
  sx = {},
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        bgcolor: 'background.surface', // Fallback
        backdropFilter: 'blur(12px)',
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.background.surface} 40%, ${theme.palette.background.level1} 100%)`,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'sm',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 'md',
          borderColor: `${color}.300`,
        },
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {Icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.vars.palette[color][400]} 0%, ${theme.vars.palette[color][600]} 100%)`,
                color: '#fff',
                boxShadow: (theme) => `0 4px 10px ${theme.vars.palette[color].softBg}`,
              }}
            >
              <Icon sx={{ fontSize: '1.2rem' }} />
            </Box>
          )}
          <Typography level="title-sm" fontWeight="bold" sx={{ opacity: 0.9 }}>
            {title}
          </Typography>
        </Stack>

        {action}
      </Box>

      <Box sx={{ flexGrow: 1 }}>{children}</Box>
    </Card>
  );
}
