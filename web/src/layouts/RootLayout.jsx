import { Outlet } from 'react-router-dom';
import { Box } from '@mui/joy';

export default function RootLayout({ context }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.body' }}>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet context={context} />
      </Box>
    </Box>
  );
}