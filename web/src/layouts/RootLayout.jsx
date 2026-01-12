import { Outlet } from 'react-router-dom';
import { Box } from '@mui/joy';

export default function RootLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.body' }}>
      {/* TopBar removed. NavSidebar in HouseholdLayout handles navigation. */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
