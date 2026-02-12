import { Card, CardContent, Typography, Box, Stack } from '@mui/joy';

export default function WidgetWrapper({ title, icon, color = 'primary', children }) {
  return (
    <Card variant="outlined" sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '6px solid',
      borderColor: (theme) => {
          if (!theme.vars || !theme.vars.palette) return color;
          const paletteColor = theme.vars.palette[color];
          if (!paletteColor) return color;
          return paletteColor[500] || paletteColor.solidBg || color;
      }, 
      boxShadow: 'sm',
      p: 0,
      overflow: 'hidden'
    }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexShrink: 0 }}>
          {icon && (
            <Box sx={{ 
              color: (theme) => {
                  if (!theme.vars || !theme.vars.palette) return color;
                  const paletteColor = theme.vars.palette[color];
                  if (!paletteColor) return color;
                  return paletteColor[500] || paletteColor.solidBg || color;
              }, 
              display: 'flex' 
            }}>
              {icon}
            </Box>
          )}
          <Typography level="title-lg">{title}</Typography>
        </Stack>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}
