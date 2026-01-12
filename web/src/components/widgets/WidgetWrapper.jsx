import { Card, CardContent, Typography, Box, Stack } from '@mui/joy';

export default function WidgetWrapper({ title, icon, color = 'primary', children }) {
  return (
    <Card variant="outlined" sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '6px solid',
      borderColor: `${color}.500`, // Joy colors are objects, need explicit shade or var
      boxShadow: 'sm',
      p: 0,
      overflow: 'hidden'
    }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          {icon && <Box sx={{ color: `${color}.500`, display: 'flex' }}>{icon}</Box>}
          <Typography level="title-lg">{title}</Typography>
        </Stack>
        <Box sx={{ flexGrow: 1 }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}