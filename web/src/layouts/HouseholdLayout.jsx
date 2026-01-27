import { useEffect, useState, useCallback, useMemo } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, IconButton, Drawer, Typography, Sheet, Stack, Badge, Avatar } from '@mui/joy';
import { 
  Home as HomeIcon, 
  Event as EventIcon, 
  MoreHoriz as MoreIcon,
  Groups as PeopleIcon,
  Pets as PetsIcon,
  Inventory2 as AssetsIcon,
  DirectionsCar as VehicleIcon,
  Settings as SettingsIcon,
  Person as ProfileIcon,
  Download,
  Calculate, Payments, NoteAlt, SwapHoriz, ChevronLeft,
  RestaurantMenu, Logout, AccountBalance, CalendarMonth
} from '@mui/icons-material';
import NavSidebar from '../components/NavSidebar';
import UtilityBar from '../components/UtilityBar';
import { getEmojiColor } from '../theme';

export default function HouseholdLayout({ 
  households = [], 
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
  themeId,
  onThemeChange,
  installPrompt,
  onInstall
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [vehicles, setVehicles] = useState([]);
  const [activeHousehold, setActiveHousehold] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('main');
  
  // New: Global Status Bar State
  const [statusBarData, setStatusBarData] = useState(null);

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

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    const parts = path.split('/');
    const section = parts[3];

    switch(section) {
        case 'dashboard': return 'Dashboard';
        case 'calendar': return 'Calendar';
        case 'people': return 'People';
        case 'pets': return 'Pets';
        case 'house': return 'Asset Registry';
        case 'vehicles': return 'Vehicles';
        case 'finance': return 'Finance';
        case 'meals': return 'Meal Planner';
        case 'settings': return 'Settings';
        case 'profile': return 'Profile';
        default: return activeHousehold?.name || 'TOTEM';
    }
  }, [location.pathname, activeHousehold]);

  return (
    <Box sx={{ 
        display: 'flex', 
        height: '100dvh', 
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'background.body'
    }}>
      
      <NavSidebar 
          members={members} 
          vehicles={vehicles}
          households={households}
          isDark={isDark}
          household={activeHousehold}
          user={user}
          onLogout={onLogout}
          onUpdateProfile={onUpdateProfile}
          onThemeChange={onThemeChange}
          themeId={themeId}
          onInstall={onInstall}
          canInstall={!!installPrompt}
          confirmAction={confirmAction}
          api={api}
          showNotification={showNotification}
          onUpdateHousehold={onUpdateHousehold}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, height: '100%', position: 'relative' }}>
        
        <Sheet
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            zIndex: 100,
            boxShadow: 'sm'
          }}
        >
          <IconButton variant="plain" onClick={() => navigate(-1)} size="sm">
            <ChevronLeft />
          </IconButton>

          <Typography 
            level="title-md" 
            onClick={() => navigate('dashboard')}
            sx={{ 
                fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase',
                cursor: 'pointer' 
            }}
          >
            {pageTitle}
          </Typography>

          <Box sx={{ width: 32 }} />
        </Sheet>

        <Box component="main" sx={{ 
            flexGrow: 1, 
            p: { xs: 2, md: 3 }, 
            pb: { xs: 10, md: 3 }, 
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
                onUpdateProfile,
                setStatusBarData, // Passed to children like BudgetView
                household: activeHousehold
            }} />
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <UtilityBar 
                user={user}
                api={api}
                dates={dates}
                onDateAdded={onDateAdded}
                onUpdateProfile={onUpdateProfile}
                isDark={isDark}
                onLogout={onLogout}
                households={households}
                onSelectHousehold={onSelectHousehold}
                canInstall={!!installPrompt}
                onInstall={onInstall}
                confirmAction={confirmAction}
                activeHouseholdId={id}
                statusBarData={statusBarData} // Passed summary data
            />
        </Box>

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
                px: 1,
                justifyContent: 'space-around',
                alignItems: 'center',
                zIndex: 1000,
                boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
            }}
        >
            <Stack 
                alignItems="center" spacing={0.5} onClick={() => navigate('dashboard')} 
                sx={{ flex: 1, cursor: 'pointer', transition: 'transform 0.2s', '&:active': { transform: 'scale(0.95)' } }}
            >
                <HomeIcon sx={{ color: isTabActive('dashboard') ? 'primary.plainColor' : 'neutral.plainColor' }} />
                <Typography level="body-xs" sx={{ color: isTabActive('dashboard') ? 'primary.plainColor' : 'neutral.plainColor', fontWeight: isTabActive('dashboard') ? 'bold' : 'normal' }}>Home</Typography>
            </Stack>
            
            <Stack 
                alignItems="center" spacing={0.5} onClick={() => navigate('calendar')} 
                sx={{ flex: 1, cursor: 'pointer', transition: 'transform 0.2s', '&:active': { transform: 'scale(0.95)' } }}
            >
                <EventIcon sx={{ color: isTabActive('calendar') ? 'primary.plainColor' : 'neutral.plainColor' }} />
                <Typography level="body-xs" sx={{ color: isTabActive('calendar') ? 'primary.plainColor' : 'neutral.plainColor', fontWeight: isTabActive('calendar') ? 'bold' : 'normal' }}>Calendar</Typography>
            </Stack>

            <Stack 
                alignItems="center" spacing={0.5} onClick={() => setDrawerOpen(true)} 
                sx={{ flex: 1, cursor: 'pointer', transition: 'transform 0.2s', '&:active': { transform: 'scale(0.95)' } }}
            >
                <Badge 
                    color="danger" variant="solid" size="sm" invisible={!installPrompt}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ badge: { sx: { top: 0, right: -4 } } }}
                >
                    <MoreIcon sx={{ color: drawerOpen ? 'primary.plainColor' : 'neutral.plainColor' }} />
                </Badge>
                <Typography level="body-xs" sx={{ color: drawerOpen ? 'primary.plainColor' : 'neutral.plainColor', fontWeight: drawerOpen ? 'bold' : 'normal' }}>Menu</Typography>
            </Stack>
        </Sheet>
      </Box>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ content: { sx: { bgcolor: 'transparent', p: 0, height: 'auto', maxHeight: '80vh', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', boxShadow: 'none' } } }}
        sx={{ display: { md: 'none' } }}
      >
        <Sheet sx={{ bgcolor: 'background.surface', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', p: 3, pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'neutral.300', mx: 'auto', mb: 2 }} />
            <Typography level="title-lg" sx={{ mb: 1 }}>Categories</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {activeMenu === 'main' ? (
                    <>
                        <MenuTile icon={<PeopleIcon />} label="People" to="people" onClick={() => setDrawerOpen(false)} />
                        <MenuTile icon={<RestaurantMenu />} label="Meals" to="meals" onClick={() => setDrawerOpen(false)} />
                        <MenuTile icon={<AssetsIcon />} label="Assets" to="house/1" onClick={() => setDrawerOpen(false)} />
                        <MenuTile icon={<AccountBalance />} label="Finance" to="finance" onClick={() => setDrawerOpen(false)} />
                    </>
                ) : (
                    households.map(hh => (
                        <MenuTile 
                            key={hh.id}
                            icon={
                                <Avatar 
                                    size="sm" 
                                    sx={{ bgcolor: getEmojiColor(hh.avatar || '🏠', isDark), fontSize: '1.2rem' }}
                                >
                                    {hh.avatar || '🏠'}
                                </Avatar>
                            } 
                            label={hh.name} 
                            onClick={() => { onSelectHousehold(hh); navigate(`/household/${hh.id}`); setDrawerOpen(false); setActiveMenu('main'); }} 
                            sx={{ bgcolor: hh.id === activeHousehold?.id ? 'primary.softBg' : 'background.level1' }}
                        />
                    ))
                )}
                {activeMenu === 'switch' && <MenuTile icon={<ChevronLeft />} label="Back" onClick={() => setActiveMenu('main')} />}
            </Box>

            {activeMenu === 'main' && (
                <>
                    <Typography level="title-lg" sx={{ mt: 2, mb: 1 }}>Tools</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                        <MenuTile icon={<NoteAlt />} label="Notes" to="tools/notes" onClick={() => setDrawerOpen(false)} />
                        <MenuTile icon={<Calculate />} label="Calc" to="tools/calculator" onClick={() => setDrawerOpen(false)} />
                        
                        <MenuTile icon={<AccountBalance />} label="Finance" to="tools/finance" onClick={() => setDrawerOpen(false)} />
                        <MenuTile icon={<Payments />} label="Tax" to="tools/tax" onClick={() => setDrawerOpen(false)} />
                        <MenuTile icon={<CalendarMonth />} label="Cal" to="tools/calendar" onClick={() => setDrawerOpen(false)} />
                    </Box>

                    <Typography level="title-lg" sx={{ mt: 2, mb: 1 }}>Admin</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                        {installPrompt && (
                            <MenuTile 
                                icon={<Download />} 
                                label="Install" 
                                onClick={() => { onInstall(); setDrawerOpen(false); }} 
                                sx={{ bgcolor: 'success.softBg', color: 'success.plainColor' }}
                            />
                        )}
                        <MenuTile icon={<SettingsIcon />} label="Settings" to="settings" onClick={() => setDrawerOpen(false)} />
                        <MenuTile icon={<ProfileIcon />} label="Profile" to="profile" onClick={() => setDrawerOpen(false)} />
                        {households.length > 1 && (
                            <MenuTile icon={<SwapHoriz />} label="Switch" onClick={() => setActiveMenu('switch')} />
                        )}
                        <MenuTile 
                            icon={<Logout />} 
                            label="Logout" 
                            onClick={() => { 
                                setDrawerOpen(false);
                                confirmAction("Log Out", "Are you sure you want to log out?", onLogout);
                            }} 
                            sx={{ bgcolor: 'danger.softBg', color: 'danger.plainColor' }} 
                        />
                    </Box>
                </>
            )}
        </Sheet>
      </Drawer>
    </Box>
  );

  function MenuTile({ icon, label, to, onClick, sx = {} }) {
      const isActive = to && location.pathname.includes(to);
      return (
          <Stack 
            alignItems="center" spacing={1} onClick={() => { if (to) navigate(to); onClick(); }}
            sx={{ p: 2, borderRadius: 'xl', bgcolor: isActive ? 'primary.softBg' : 'background.level1', cursor: 'pointer', transition: 'all 0.2s', '&:active': { transform: 'scale(0.95)', bgcolor: 'primary.softBg' }, ...sx }}
          >
              <Box sx={{ color: isActive ? 'primary.solidBg' : 'neutral.plainColor' }}>{icon}</Box>
              <Typography level="body-sm" sx={{ fontWeight: isActive ? 'bold' : 'normal' }}>{label}</Typography>
          </Stack>
      );
  }
}
