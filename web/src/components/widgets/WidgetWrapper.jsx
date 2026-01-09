import { Card, CardContent, Typography, Box, Stack } from '@mui/material';

export default function WidgetWrapper({ title, icon, color = 'primary', children }) {
  return (
    <Card variant="outlined" sx={{ 
      borderRadius: 3, 
      borderLeft: '6px solid', 
      borderColor: `${color}.main`, 
      bgcolor: 'background.paper',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          {icon && <Box sx={{ color: `${color}.main`, display: 'flex' }}>{icon}</Box>}
          <Typography variant="h6" fontWeight="bold">{title}</Typography>
        </Stack>
        <Box sx={{ flexGrow: 1 }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}
