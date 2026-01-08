import { Outlet } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import TopBar from '../components/TopBar';

export default function RootLayout({ 
  user, 
  currentHousehold, 
  households, 
  onSwitchHousehold, 
  onLogout, 
  toggleSidebar, 
  currentMode, 
  onModeChange, 
  installPrompt, 
  onInstall 
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar 
        user={user} 
        currentHousehold={currentHousehold} 
        households={households} 
        onSwitchHousehold={onSwitchHousehold} 
        onLogout={onLogout} 
        toggleSidebar={toggleSidebar}
        currentMode={currentMode} 
        onModeChange={onModeChange}
        canInstall={!!installPrompt} 
        onInstall={onInstall}
      />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
