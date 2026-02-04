import { Card, CardContent, Typography, Box, Stack } from '@mui/joy';

export default function WidgetWrapper({ title, icon, color = 'primary', children }) {
  return (
    <Card variant="outlined" sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '6px solid',
      borderColor: (theme) => theme.vars.palette[color]?.[500] || theme.vars.palette[color]?.main || color, 
      boxShadow: 'sm',
      p: 0,
      overflow: 'hidden'
    }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexShrink: 0 }}>
          {icon && (
            <Box sx={{ 
              color: (theme) => theme.vars.palette[color]?.[500] || theme.vars.palette[color]?.main || color, 
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
