import { useEffect, useState, useMemo, useRef } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, IconButton, Drawer, Typography, Sheet, Stack, Badge, Avatar } from '@mui/joy';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import MoreIcon from '@mui/icons-material/MoreHoriz';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import RestaurantMenu from '@mui/icons-material/RestaurantMenu';
import Logout from '@mui/icons-material/Logout';
import AccountBalance from '@mui/icons-material/AccountBalance';
import SettingsIcon from '@mui/icons-material/Settings';
import NoteAlt from '@mui/icons-material/NoteAlt';
import Calculate from '@mui/icons-material/Calculate';
import Payments from '@mui/icons-material/Payments';
import CleaningServices from '@mui/icons-material/CleaningServices';
import ShoppingBag from '@mui/icons-material/ShoppingBag';
import { useTranslation } from 'react-i18next';

import NotificationsDrawer from '../components/NotificationsDrawer';
import NavSidebar from '../components/NavSidebar';
import UtilityBar from '../components/UtilityBar';
import ScrollToTop from '../components/ui/ScrollToTop';
import { getEmojiColor } from '../utils/colors';
import { APP_NAME } from '../constants';

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
        '&:hover': {
          bgcolor: 'primary.softBg',
          transform: 'translateY(-2px)',
        },
        '&:active': {
          transform: 'scale(0.95)',
        },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: 'background.surface',
          boxShadow: 'sm',
          color: 'primary.plainColor',
        }}
      >
        {icon}
      </Box>
      <Typography
        level="body-xs"
        sx={{
          fontWeight: 'md',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}
      >
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

  onUpdateProfile,
  onLogout,
  installPrompt,
  onInstall,
  household,
}) {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const ROUTE_META = useMemo(
    () => ({
      dashboard: { title: t('nav.dashboard') },
      people: { title: t('nav.people') },
      pets: { title: 'Pets' },
      house: { title: 'House' },
      vehicles: { title: 'Vehicles' },
      finance: { title: t('nav.finance') },
      shopping: { title: t('nav.groceries') },
      meals: { title: 'Meal Planner' },
      settings: { title: t('nav.settings') },
      profile: { title: 'Profile' },
      calendar: { title: 'Calendar' },
    }),
    [t]
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('main');

  const [notifications, setNotifications] = useState({ urgent: [], upcoming: [], info: [] });

  useEffect(() => {
    if (!api || !household?.id) return;

    const fetchNotifications = async () => {
      try {
        const res = await api.get(`/households/${household.id}/notifications`);
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to poll notifications', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [api, household?.id]);

  const totalNotifications =
    (notifications.urgent?.length || 0) + (notifications.upcoming?.length || 0);
  const badgeCount = totalNotifications > 0 ? totalNotifications : null;

  const scrollRef = useRef(null);

  useEffect(() => {
    const targetId = parseInt(id);
    const targetHousehold = (households || []).find((h) => h && h.id === targetId);
    const effectiveHousehold =
      targetHousehold || (household && household.id === targetId ? household : null);

    if (effectiveHousehold) {
      if (!household || household.id !== effectiveHousehold.id) {
        onSelectHousehold(effectiveHousehold);
      }
    } else if (households && households.length > 0) {
      navigate('/');
    }
  }, [id, households, onSelectHousehold, navigate, household]);

  const isTabActive = (path) => location.pathname.includes(path);

  const pageTitle = useMemo(() => {
    const path = location.pathname || '';
    const parts = path.split('/');
    const section = parts[3];
    return ROUTE_META[section]?.title || household?.name || APP_NAME.toUpperCase();
  }, [location.pathname, household, ROUTE_META]);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100dvh',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'background.body',
      }}
    >
      <NavSidebar
        installPrompt={installPrompt}
        onInstall={onInstall}
        onOpenNotifications={() => setNotificationOpen(true)}
        notificationCount={badgeCount}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          minWidth: 0,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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
            boxShadow: 'sm',
          }}
        >
          <IconButton variant="plain" onClick={() => navigate(-1)} size="sm">
            <ChevronLeft />
          </IconButton>

          <Typography
            level="title-md"
            onClick={() => navigate('dashboard')}
            sx={{
              fontWeight: 'bold',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {pageTitle}
          </Typography>

          <IconButton variant="plain" onClick={() => setNotificationOpen(true)} size="sm">
            <Badge color="danger" size="sm" invisible={!badgeCount}>
              <Box component="span" sx={{ fontSize: '1.2rem' }}>
                🔔
              </Box>
            </Badge>
          </IconButton>
        </Sheet>

        <Box
          component="main"
          id="main-content"
          ref={scrollRef}
          sx={{
            flexGrow: 1,
            minHeight: 0,
            p: { xs: 2, md: 3 },
            pb: { xs: 10, md: 3 },
            overflowY: 'auto',
          }}
        >
          <Outlet
            context={{
              api,
              id,
              onUpdateHousehold,
              members,
              vehicles,
              fetchHhMembers,
              fetchVehicles,
              user,
              isDark,
              showNotification,
              confirmAction,
              onUpdateProfile,
              household: household,
            }}
          />
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <UtilityBar />
        </Box>

        <ScrollToTop scrollRef={scrollRef} />

        <Sheet
          component="nav"
          aria-label="Mobile Navigation"
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
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <Stack
            alignItems="center"
            spacing={0.5}
            onClick={() => navigate('dashboard')}
            sx={{
              flex: 1,
              cursor: 'pointer',
            }}
          >
            <HomeIcon
              sx={{
                color: isTabActive('dashboard') ? 'primary.plainColor' : 'neutral.plainColor',
              }}
            />
            <Typography
              level="body-xs"
              sx={{
                color: isTabActive('dashboard') ? 'primary.plainColor' : 'neutral.plainColor',
                fontWeight: isTabActive('dashboard') ? 'bold' : 'normal',
              }}
            >
              Home
            </Typography>
          </Stack>

          <Stack
            alignItems="center"
            spacing={0.5}
            onClick={() => {
              setActiveMenu('switch');
              setDrawerOpen(true);
            }}
            sx={{ flex: 1, cursor: 'pointer' }}
          >
            <SwapHoriz sx={{ color: 'neutral.plainColor' }} />
            <Typography level="body-xs" color="neutral">
              Switch
            </Typography>
          </Stack>

          <Stack
            alignItems="center"
            spacing={0.5}
            onClick={() => {
              setActiveMenu('main');
              setDrawerOpen(true);
            }}
            sx={{ flex: 1, cursor: 'pointer' }}
          >
            <MoreIcon sx={{ color: drawerOpen ? 'primary.plainColor' : 'neutral.plainColor' }} />
            <Typography
              level="body-xs"
              sx={{
                color: drawerOpen ? 'primary.plainColor' : 'neutral.plainColor',
                fontWeight: drawerOpen ? 'bold' : 'normal',
              }}
            >
              Menu
            </Typography>
          </Stack>
        </Sheet>
      </Box>

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
            },
          },
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
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              bgcolor: 'neutral.softBg',
              mx: 'auto',
              mb: 2,
            }}
          />

          <Typography level="title-lg" sx={{ mb: 1 }}>
            Navigation
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {activeMenu === 'main' ? (
              <>
                <MenuTile
                  icon={<HomeIcon />}
                  label="House"
                  to="house"
                  onClick={() => setDrawerOpen(false)}
                />
                <MenuTile
                  icon={<AccountBalance />}
                  label="Finance"
                  to="finance"
                  onClick={() => setDrawerOpen(false)}
                />
                <MenuTile
                  icon={<EventIcon />}
                  label="Calendar"
                  to="calendar"
                  onClick={() => setDrawerOpen(false)}
                />
                <MenuTile
                  icon={<RestaurantMenu />}
                  label="Meals"
                  to="meals"
                  onClick={() => setDrawerOpen(false)}
                />
                <MenuTile
                  icon={<CleaningServices />}
                  label="Chores"
                  to="chores"
                  onClick={() => setDrawerOpen(false)}
                />
                <MenuTile
                  icon={<ShoppingBag />}
                  label="Groceries"
                  to="shopping"
                  onClick={() => setDrawerOpen(false)}
                />
              </>
            ) : (
              households.map((hh) => (
                <MenuTile
                  key={hh.id}
                  icon={
                    <Avatar
                      size="sm"
                      sx={{
                        bgcolor: getEmojiColor(hh.avatar || '🏠', isDark),
                        fontSize: '1.2rem',
                      }}
                    >
                      {hh.avatar || '🏠'}
                    </Avatar>
                  }
                  label={hh.name}
                  onClick={async () => {
                    await onSelectHousehold(hh);
                    navigate(`/household/${hh.id}/dashboard`);
                    setDrawerOpen(false);
                    setActiveMenu('main');
                  }}
                  sx={{
                    bgcolor: hh.id === household?.id ? 'primary.softBg' : 'background.level1',
                  }}
                />
              ))
            )}
            {activeMenu === 'switch' && (
              <MenuTile icon={<ChevronLeft />} label="Back" onClick={() => setActiveMenu('main')} />
            )}
          </Box>

          {activeMenu === 'main' && (
            <>
              <Typography level="title-lg" sx={{ mt: 2, mb: 1 }}>
                Tools
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                <MenuTile
                  icon={<NoteAlt />}
                  label="Notes"
                  to="tools/notes"
                  onClick={() => setDrawerOpen(false)}
                />
                <MenuTile
                  icon={<Calculate />}
                  label="Calc"
                  to="tools/calculator"
                  onClick={() => setDrawerOpen(false)}
                />
                <MenuTile
                  icon={<AccountBalance />}
                  label="Finance"
                  to="tools/finance"
                  onClick={() => setDrawerOpen(false)}
                />
                <MenuTile
                  icon={<Payments />}
                  label="Tax"
                  to="tools/tax"
                  onClick={() => setDrawerOpen(false)}
                />
              </Box>

              <Typography level="title-lg" sx={{ mt: 2, mb: 1 }}>
                Admin
              </Typography>
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
                    confirmAction('Log Out', 'Are you sure you want to log out?', onLogout);
                  }}
                  sx={{ bgcolor: 'danger.softBg', color: 'danger.plainColor' }}
                />
              </Box>
            </>
          )}
        </Sheet>
      </Drawer>
      <NotificationsDrawer open={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </Box>
  );
}
