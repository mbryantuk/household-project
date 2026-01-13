import { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, IconButton, Drawer, Typography, Sheet, Stack } from '@mui/joy';
import { 
  Home as HomeIcon, 
  Event as EventIcon, 
  MoreHoriz as MoreIcon,
  Groups as PeopleIcon,
  Pets as PetsIcon,
  HomeWork as HouseIcon,
  DirectionsCar as VehicleIcon,
  Settings as SettingsIcon,
  Person as ProfileIcon,
  Download
} from '@mui/icons-material';
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
  const location = useLocation();
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

  const isTabActive = (path) => location.pathname.includes(path);

  return (
    <Box sx={{ 
        display: 'flex', 
        height: '100dvh', // Use dynamic viewport height for mobile
        overflow: 'hidden', 
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'background.body'
    }}>
      
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

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, height: '100%', position: 'relative' }}>
        
        {/* Mobile Header (Minimal) */}
        <Sheet
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            justifyContent: 'center',
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            zIndex: 100
          }}
        >
          <Typography level="title-md" sx={{ fontWeight: 'bold', letterSpacing: '1px' }}>TOTEM</Typography>
        </Sheet>

        <Box component="main" sx={{ 
            flexGrow: 1, 
            p: { xs: 2, md: 3 }, 
            pb: { xs: 10, md: 3 }, // Space for mobile bottom nav
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch' 
        }}>
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

        {/* Mobile Bottom Navigation (Android Style) */}
        <Sheet
            sx={{
                display: { xs: 'flex', md: 'none' },
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: 70,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.surface',
                px: 2,
                justifyContent: 'space-around',
                alignItems: 'center',
                zIndex: 1000,
                boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
            }}
        >
            <Stack alignItems="center" spacing={0.5} onClick={() => navigate('dashboard')} sx={{ cursor: 'pointer', color: isTabActive('dashboard') ? 'primary.plainColor' : 'neutral.plainColor' }}>
                <HomeIcon color={isTabActive('dashboard') ? 'primary' : 'inherit'} />
                <Typography level="body-xs" sx={{ color: 'inherit', fontWeight: isTabActive('dashboard') ? 'bold' : 'normal' }}>Home</Typography>
            </Stack>
            
            <Stack alignItems="center" spacing={0.5} onClick={() => navigate('calendar')} sx={{ cursor: 'pointer', color: isTabActive('calendar') ? 'primary.plainColor' : 'neutral.plainColor' }}>
                <EventIcon color={isTabActive('calendar') ? 'primary' : 'inherit'} />
                <Typography level="body-xs" sx={{ color: 'inherit', fontWeight: isTabActive('calendar') ? 'bold' : 'normal' }}>Calendar</Typography>
            </Stack>

            <Stack alignItems="center" spacing={0.5} onClick={() => setDrawerOpen(true)} sx={{ cursor: 'pointer', color: drawerOpen ? 'primary.plainColor' : 'neutral.plainColor' }}>
                <MoreIcon color={drawerOpen ? 'primary' : 'inherit'} />
                <Typography level="body-xs" sx={{ color: 'inherit', fontWeight: drawerOpen ? 'bold' : 'normal' }}>Menu</Typography>
            </Stack>
        </Sheet>
      </Box>

      {/* Mobile Draggable Menu Sheet */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
            content: {
                sx: {
                    bgcolor: 'transparent',
                    p: 0,
                    height: 'auto',
                    maxHeight: '80vh',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    boxShadow: 'none'
                }
            }
        }}
        sx={{ display: { md: 'none' } }}
      >
        <Sheet
            sx={{
                bgcolor: 'background.surface',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                p: 3,
                pt: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}
        >
            {/* Handle for "dragging" feel */}
            <Box sx={{ 
                width: 40, height: 4, borderRadius: 2, 
                bgcolor: 'neutral.300', mx: 'auto', mb: 2 
            }} />

            <Typography level="title-lg" sx={{ mb: 1 }}>Categories</Typography>
            
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: 2 
            }}>
                <MenuTile icon={<PeopleIcon />} label="People" to="people" onClick={() => setDrawerOpen(false)} />
                <MenuTile icon={<PetsIcon />} label="Pets" to="pets" onClick={() => setDrawerOpen(false)} />
                <MenuTile icon={<VehicleIcon />} label="Vehicles" to="vehicles" onClick={() => setDrawerOpen(false)} />
                <MenuTile icon={<HouseIcon />} label="House" to={`house/${activeHousehold?.id}`} onClick={() => setDrawerOpen(false)} />
                <MenuTile icon={<SettingsIcon />} label="Settings" to="settings" onClick={() => setDrawerOpen(false)} />
                <MenuTile icon={<ProfileIcon />} label="Profile" to="profile" onClick={() => setDrawerOpen(false)} />
                {!!installPrompt && (
                    <MenuTile 
                        icon={<Download />} 
                        label="Install App" 
                        to="#" 
                        onClick={() => { onInstall(); setDrawerOpen(false); }} 
                        sx={{ 
                            bgcolor: 'primary.solidBg', 
                            color: 'common.white', 
                            '&:hover': { bgcolor: 'primary.solidHoverBg' },
                            '&:active': { transform: 'scale(0.95)' },
                            boxShadow: 'md'
                        }}
                        iconColor="inherit"
                    />
                )}
            </Box>

            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ 
                            width: 32, height: 32, borderRadius: '50%', 
                            bgcolor: 'neutral.softBg', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center' 
                        }}>
                            <Typography level="body-xs">{user?.first_name?.[0]}</Typography>
                        </Box>
                        <Box>
                            <Typography level="title-sm">{user?.first_name} {user?.last_name}</Typography>
                            <Typography level="body-xs" color="neutral">{user?.email}</Typography>
                        </Box>
                    </Box>
                    <IconButton variant="plain" color="danger" size="sm" onClick={() => { onLogout(); setDrawerOpen(false); }}>
                        <MoreIcon sx={{ transform: 'rotate(90deg)' }} />
                    </IconButton>
                </Stack>
            </Box>
        </Sheet>
      </Drawer>
    </Box>
  );

  function MenuTile({ icon, label, to, onClick, sx = {}, iconColor }) {
      const isActive = location.pathname.includes(to);
      return (
          <Stack 
            alignItems="center" 
            spacing={1} 
            onClick={() => { navigate(to); onClick(); }}
            sx={{ 
                p: 2, 
                borderRadius: 'xl', 
                bgcolor: isActive ? 'primary.softBg' : 'background.level1',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:active': { transform: 'scale(0.95)', bgcolor: 'primary.softBg' },
                ...sx
            }}
          >
              <Box sx={{ color: iconColor || (isActive ? 'primary.solidBg' : 'neutral.plainColor') }}>
                {icon}
              </Box>
              <Typography level="body-sm" sx={{ fontWeight: isActive ? 'bold' : 'normal', color: iconColor || 'inherit' }}>{label}</Typography>
          </Stack>
      );
  }
}