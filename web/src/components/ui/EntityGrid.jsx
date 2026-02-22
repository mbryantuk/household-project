import React from 'react';
import { Box, Typography, IconButton, Stack, Card, AspectRatio } from '@mui/joy';
import { Add } from '@mui/icons-material';

/**
 * EntityGrid - A "Nintendo Switch" style selection grid.
 *
 * @param {Object} props
 * @param {Array<{title: string, items: Array, onAdd: function, addLabel: string}>} props.sections
 * @param {Function} props.renderItem - Function to render individual item content (icon + label)
 * @param {Function} props.onSelect - Function(item) called on click
 */
export default function EntityGrid({ sections, renderItem, onSelect }) {
  return (
    <Box sx={{ pb: 10 }}>
      {sections.map((section, index) => (
        <Box key={index} sx={{ mb: 4 }}>
          {/* Section Header */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography
              level="h4"
              sx={{
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '0.85rem',
                color: 'neutral.500',
                fontWeight: 'lg',
              }}
            >
              {section.title}
            </Typography>
          </Box>

          {/* Horizontal Scroll Area */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              overflowX: 'auto',
              pb: 2, // Space for scrollbar
              mx: { xs: -2, md: 0 },
              px: { xs: 2, md: 0 }, // Bleed to edge on mobile, contained on desktop
              scrollSnapType: 'x proximity',
              '&::-webkit-scrollbar': { height: '8px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                background: 'var(--joy-palette-neutral-outlinedBorder)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': { background: 'var(--joy-palette-neutral-500)' },
            }}
          >
            {/* Render Items */}
            {section.items.map((item) => (
              <Box
                key={item.id || item.tempId}
                sx={{
                  minWidth: { xs: 140, sm: 160 },
                  width: { xs: 140, sm: 160 },
                  scrollSnapAlign: 'start',
                }}
              >
                <Card
                  variant="outlined"
                  orientation="vertical"
                  sx={{
                    p: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid',
                    borderColor: 'neutral.outlinedBorder',
                    overflow: 'hidden',
                    height: '100%',
                    '&:hover': {
                      borderColor: 'primary.outlinedHoverBorder',
                      bgcolor: 'background.level1',
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    },
                  }}
                  onClick={() => onSelect(item)}
                >
                  <AspectRatio ratio="1" sx={{ width: '100%' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        p: 2,
                      }}
                    >
                      {renderItem(item)}
                    </Box>
                  </AspectRatio>
                </Card>
              </Box>
            ))}

            {/* Add Button Card */}
            {section.onAdd && (
              <Box
                sx={{
                  minWidth: { xs: 140, sm: 160 },
                  width: { xs: 140, sm: 160 },
                  scrollSnapAlign: 'start',
                }}
              >
                <Card
                  variant="dashed"
                  orientation="vertical"
                  sx={{
                    p: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    bgcolor: 'transparent',
                    height: '100%',
                    '&:hover': {
                      bgcolor: 'background.level1',
                      borderColor: 'primary.500',
                    },
                  }}
                  onClick={section.onAdd}
                >
                  <AspectRatio ratio="1" sx={{ width: '100%' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                      }}
                    >
                      <IconButton
                        size="lg"
                        variant="solid"
                        color="primary"
                        sx={{ borderRadius: '50%' }}
                      >
                        <Add />
                      </IconButton>
                      <Typography level="title-sm" color="primary">
                        {section.addLabel || 'Add New'}
                      </Typography>
                    </Box>
                  </AspectRatio>
                </Card>
              </Box>
            )}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
