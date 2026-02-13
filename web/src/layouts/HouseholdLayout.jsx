import { useEffect, useState, useMemo } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, IconButton, Drawer, Typography, Sheet, Stack, Badge, Avatar, Tooltip, Menu, MenuItem, ListItemDecorator, Divider } from '@mui/joy';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import MoreIcon from '@mui/icons-material/MoreHoriz';
import PeopleIcon from '@mui/icons-material/Groups';
import PetsIcon from '@mui/icons-material/Pets';
import AssetsIcon from '@mui/icons-material/Inventory2';
import VehicleIcon from '@mui/icons-material/DirectionsCar';
import SettingsIcon from '@mui/icons-material/Settings';
import ProfileIcon from '@mui/icons-material/Person';
import Download from '@mui/icons-material/Download';
import Calculate from '@mui/icons-material/Calculate';
import Payments from '@mui/icons-material/Payments';
import NoteAlt from '@mui/icons-material/NoteAlt';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import RestaurantMenu from '@mui/icons-material/RestaurantMenu';
import Logout from '@mui/icons-material/Logout';
import AccountBalance from '@mui/icons-material/AccountBalance';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Add from '@mui/icons-material/Add';
import AttachMoney from '@mui/icons-material/AttachMoney';
import CleaningServices from '@mui/icons-material/CleaningServices';

import NavSidebar from '../components/NavSidebar';
import UtilityBar from '../components/UtilityBar';
import { getEmojiColor } from '../theme';
import { HouseholdProvider } from '../contexts/HouseholdContext';
import { APP_NAME } from '../constants';

const ROUTE_META = {
  dashboard: { title: 'Dashboard' },
  people: { title: 'People' },
  pets: { title: 'Pets' },
  house: { title: 'House' },
  vehicles: { title: 'Vehicles' },
  finance: { title: 'Finance' },
  shopping: { title: 'Groceries' },
  meals: { title: 'Meal Planner' },
  settings: { title: 'Settings' },
  profile: { title: 'Profile' }
};

const MenuTile = ({ icon, label, to, onClick, sx = {} }) => {
  const navigate = useNavigate();
  return (
    <Box 
      onClick={() => {
        if (to) navigate(to);
        if (onClick) onClick();
      }}
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 1.5,
        borderRadius: 'xl',
        bgcolor: 'background.level1',
        gap: 1,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: 'primary.softBg',
          transform: 'translateY(-2px)'
        },
        '&:active': {
          transform: 'scale(0.95)'
        },
        ...sx
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: 44, 
        height: 44, 
        borderRadius: '12px',
        bgcolor: 'background.surface',
        boxShadow: 'sm',
        color: 'primary.plainColor'
      }}>
        {icon}
      </Box>
      <Typography level="body-xs" sx={{ fontWeight: 'md', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
        {label}
      </Typography>
    </Box>
  );
};

export default function HouseholdLayout({
  households = [],
  onSelectHousehold,
  api,
  onUpdateHousehold,
  members = [],
  fetchHhMembers,
  vehicles = [],
  fetchVehicles,
  user,
  isDark,
  showNotification,
  confirmAction,
  
  dates = [],
  onDateAdded,
  onUpdateProfile,
  onLogout,
  themeId,
  onThemeChange,
  mode,
  onModeChange,
  onPreviewTheme,
  installPrompt,
  onInstall,
  household
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('main');

  // New: Global Status Bar State
  const [statusBarData, setStatusBarData] = useState(null);

  useEffect(() => {
    const targetId = parseInt(id);
    const targetHousehold = (households || []).find(h => h && h.id === targetId);
    
    // Fallback: If not in list (e.g. just created), check if it matches the globally active household
    const effectiveHousehold = targetHousehold || (household && household.id === targetId ? household : null);
    
    if (effectiveHousehold) {
      // Guard: Only switch if the App's current household doesn't match the URL
      if (!household || household.id !== effectiveHousehold.id) {
          onSelectHousehold(effectiveHousehold);
      }
    } else if (households && households.length > 0) {
      // Only redirect if we have loaded households and the target isn't found/valid
      navigate('/');
    }
  }, [id, households, onSelectHousehold, navigate, household]);

  const isTabActive = (path) => location.pathname.includes(path);

  const pageTitle = useMemo(() => {
    const path = location.pathname || '';
    const parts = path.split('/');
    const section = parts[3];
    return ROUTE_META[section]?.title || household?.name || APP_NAME.toUpperCase();
  }, [location.pathname, household]);

  const contextValue = {
      household: household,
      members,
      vehicles,
      api,
      user,
      isDark,
      showNotification,
      confirmAction,
      onUpdateProfile,
      onUpdateHousehold,
      fetchHhMembers,
      fetchVehicles,
      themeId,
      onThemeChange,
      mode,
      onModeChange,
      onPreviewTheme,
      households,
      onSelectHousehold,
      onLogout,
      dates,
      onDateAdded,
      statusBarData,
      setStatusBarData
  };

  return (
    <HouseholdProvider value={contextValue}>
        <Box sx={{ 
            display: 'flex', 
            height: '100dvh', 
            flexDirection: { xs: 'column', md: 'row' },
            bgcolor: 'background.body',
            background: isDark 
                ? 'linear-gradient(135deg, #050505 0%, #111111 100%)' 
                : 'linear-gradient(135deg, #f9fafb 0%, #f0f2f5 100%)',
        }}>
        
        <NavSidebar installPrompt={installPrompt} onInstall={onInstall} />

        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, height: '100%', position: 'relative', overflow: 'hidden' }}>
            
            <Sheet
            sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'divider',
                bgcolor: isDark ? '#111111' : 'background.surface',
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
                minHeight: 0,
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
                    setStatusBarData,
                    household: household
                }} />
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <UtilityBar />
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
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'divider',
                    bgcolor: isDark ? '#111111' : 'background.surface',
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
                    alignItems="center" spacing={0.5} onClick={() => { setActiveMenu('switch'); setDrawerOpen(true); }}
                    sx={{ flex: 1, cursor: 'pointer', transition: 'transform 0.2s', '&:active': { transform: 'scale(0.95)' } }}
                >
                    <SwapHoriz sx={{ color: 'neutral.plainColor' }} />
                    <Typography level="body-xs" color="neutral">Switch</Typography>
                </Stack>

                <Stack 
                    alignItems="center" spacing={0.5} onClick={() => { setActiveMenu('main'); setDrawerOpen(true); }}
                    sx={{ flex: 1, cursor: 'pointer', transition: 'transform 0.2s', '&:active': { transform: 'scale(0.95)' } }}
                >
                    <MoreIcon sx={{ color: drawerOpen ? 'primary.plainColor' : 'neutral.plainColor' }} />
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
            <Sheet sx={{ bgcolor: isDark ? '#181818' : 'background.surface', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', p: 3, pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.2)' : 'neutral.300', mx: 'auto', mb: 2 }} />
                <Typography level="title-lg" sx={{ mb: 1 }}>Navigation</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                    {activeMenu === 'main' ? (
                        <>
                            <MenuTile icon={<HomeIcon />} label="Household" to="house" onClick={() => setDrawerOpen(false)} />
                            <MenuTile icon={<AccountBalance />} label="Finance" to="finance" onClick={() => setDrawerOpen(false)} />
                            <MenuTile icon={<RestaurantMenu />} label="Meals" to="meals" onClick={() => setDrawerOpen(false)} />
                            <MenuTile icon={<CleaningServices />} label="Chores" to="chores" onClick={() => setDrawerOpen(false)} />
                            <MenuTile icon={<Add />} label="Shop" to="shopping" onClick={() => setDrawerOpen(false)} />
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
                                onClick={async () => { await onSelectHousehold(hh); navigate(`/household/${hh.id}/dashboard`); setDrawerOpen(false); setActiveMenu('main'); }} 
                                sx={{ bgcolor: hh.id === household?.id ? 'primary.softBg' : 'background.level1' }}
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
                        </Box>

                        <Typography level="title-lg" sx={{ mt: 2, mb: 1 }}>Admin</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                            <MenuTile 
                                icon={<SettingsIcon />} 
                                label="Settings" 
                                to="settings" 
                                onClick={() => setDrawerOpen(false)} 
                            />
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
    </HouseholdProvider>
  );
}