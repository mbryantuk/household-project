import { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Box, IconButton, Drawer, Typography, Sheet } from '@mui/joy';
import { Menu as MenuIcon } from '@mui/icons-material';
import NavSidebar from '../components/NavSidebar';
import UtilityBar from '../components/UtilityBar';

export default function HouseholdLayout({ 
  households, 
  onSelectHousehold,
  api,
  onUpdateHousehold,
  members,
  fetchHhMembers,
  user,
  isDark,
  showNotification,
  confirmAction,
  
  dates,
  onDateAdded,
  onUpdateProfile,
  onLogout,
  onSwitchHousehold, 
  currentMode,
  onModeChange,
  installPrompt,
  onInstall,
  useDracula,
  onDraculaChange
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [activeHousehold, setActiveHousehold] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get(`/households/${id}/vehicles`);
      setVehicles(res.data || []);
    } catch (err) {
      console.error("Failed to fetch vehicles for sidebar", err);
    }
  }, [api, id]);

  useEffect(() => {
    const targetHousehold = (households || []).find(h => h && h.id === parseInt(id));
    
    if (targetHousehold) {
      onSelectHousehold(targetHousehold);
      setActiveHousehold(targetHousehold);
      fetchVehicles();
    } else if (households && households.length > 0) {
      navigate('/');
    }
  }, [id, households, onSelectHousehold, navigate, fetchVehicles]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: { xs: 'column', md: 'row' } }}>
      
      {/* Mobile Header */}
      <Sheet
        sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
          zIndex: 1100
        }}
      >
        <IconButton variant="outlined" color="neutral" size="sm" onClick={() => setDrawerOpen(true)}>
          <MenuIcon />
        </IconButton>
        <Typography level="title-md" sx={{ fontWeight: 'bold' }}>TOTEM</Typography>
        <Box sx={{ width: 32 }} /> {/* Placeholder for balance */}
      </Sheet>

      {/* Desktop Sidebar */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, height: '100%' }}>
        <NavSidebar 
            members={members} 
            vehicles={vehicles}
            isDark={isDark}
            household={activeHousehold}
            user={user}
            onLogout={onLogout}
            onUpdateProfile={onUpdateProfile}
            onModeChange={onModeChange}
            onInstall={onInstall}
            canInstall={!!installPrompt}
            useDracula={useDracula}
            onDraculaChange={onDraculaChange}
        />
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { md: 'none' } }}
      >
        <Box sx={{ height: '100%', width: '100%' }}>
            <NavSidebar 
                members={members} 
                vehicles={vehicles}
                isDark={isDark}
                household={activeHousehold}
                user={user}
                onLogout={() => { onLogout(); setDrawerOpen(false); }}
                onUpdateProfile={onUpdateProfile}
                onModeChange={onModeChange}
                onInstall={onInstall}
                canInstall={!!installPrompt}
                useDracula={useDracula}
                onDraculaChange={onDraculaChange}
                isMobile
                onClose={() => setDrawerOpen(false)}
            />
        </Box>
      </Drawer>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, height: '100%' }}>
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, pt: { xs: 2, md: 1 }, overflowY: 'auto' }}>
            <Outlet context={{ 
                api, 
                id, 
                onUpdateHousehold,
                members, 
                fetchHhMembers, 
                fetchVehicles,
                user, 
                isDark,
                showNotification,
                confirmAction,
                onUpdateProfile
            }} />
        </Box>

        {/* Persistent Bottom Utility Bar - Desktop Only */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <UtilityBar 
                user={user}
                api={api}
                dates={dates}
                onDateAdded={onDateAdded}
                onUpdateProfile={onUpdateProfile}
                isDark={isDark}
                canInstall={!!installPrompt}
                onInstall={onInstall}
            />
        </Box>
      </Box>
    </Box>
  );
}