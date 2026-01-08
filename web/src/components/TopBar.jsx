import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar, Box, Tooltip, Popover } from '@mui/material';
import { 
  Logout, SwapHoriz, Menu as MenuIcon, 
  DarkMode, LightMode, SettingsBrightness, GetApp, AdminPanelSettings,
  CalendarMonth
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TotemIcon from './TotemIcon';
import FloatingCalendar from './FloatingCalendar';

export default function TopBar({
  user, currentHousehold, households, onSwitchHousehold,
  onLogout, toggleSidebar, canInstall, onInstall,
  dates, api, onDateAdded
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [calAnchor, setCalAnchor] = useState(null);
  const navigate = useNavigate();

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>      <Toolbar sx={{ justifyContent: 'space-between' }}>
        
        {/* LEFT SECTION: Family Name & Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {currentHousehold && (
            <IconButton color="inherit" onClick={toggleSidebar} edge="start" sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          
          <Box 
            sx={{ 
              bgcolor: 'white', 
              borderRadius: '50%', 
              p: 0.5, 
              mr: 1.5, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: 2,
              cursor: 'pointer',
              width: 36,
              height: 36,
              fontSize: '1.4rem',
              overflow: 'hidden'
            }}
            onClick={() => navigate('/')}
          >
            {currentHousehold?.avatar ? (
              currentHousehold.avatar.startsWith('data:image') ? (
                <Avatar src={currentHousehold.avatar} sx={{ width: '100%', height: '100%' }} />
              ) : (
                currentHousehold.avatar
              )
            ) : (
              <TotemIcon sx={{ fontSize: 24 }} />
            )}
          </Box>

          <Typography variant="h6" noWrap sx={{ fontWeight: 'bold', letterSpacing: 1.5, color: 'white' }}>
            {/* 🏠 Hide "Totem", show Family Name */}
            {currentHousehold ? currentHousehold.name.toUpperCase() : 'TOTEM'}
          </Typography>
        </Box>

        {/* RIGHT SECTION: Actions & Switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          
          {/* Calendar Toggle */}
          {currentHousehold && (
            <>
              <Tooltip title="Household Calendar">
                <IconButton color="inherit" onClick={(e) => setCalAnchor(e.currentTarget)}>
                  <CalendarMonth />
                </IconButton>
              </Tooltip>
              <Popover
                open={Boolean(calAnchor)}
                anchorEl={calAnchor}
                onClose={() => setCalAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{ mt: 1.5 }}
              >
                <FloatingCalendar 
                  dates={dates} 
                  api={api} 
                  householdId={currentHousehold.id} 
                  onDateAdded={() => {
                    if (onDateAdded) onDateAdded();
                    // We don't close the popover so they can see it added or add more
                  }} 
                />
              </Popover>
            </>
          )}

          {/* Global Admin Access Link - SYSADMIN ONLY */}
          {user?.role === 'sysadmin' && (
            <Tooltip title="Platform Administration">
               <IconButton color="inherit" onClick={() => navigate('/access')}>
                 <AdminPanelSettings />
               </IconButton>
            </Tooltip>
          )}

          {/* PWA Install */}
          {canInstall && (
            <Tooltip title="Install App">
              <IconButton color="inherit" onClick={onInstall}><GetApp /></IconButton>
            </Tooltip>
          )}

          {/* 🔄 THE NEW SWITCH ICON (Replaces Home Icon) */}
          {households.length > 0 && (
            <Tooltip title="Switch Household">
              <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <SwapHoriz />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Household Switcher Menu */}
          <Menu 
            anchorEl={anchorEl} 
            open={Boolean(anchorEl)} 
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { mt: 1.5, minWidth: 200 } }}
          >
             <Typography variant="overline" sx={{ px: 2, fontWeight: 'bold', color: 'text.secondary' }}>
                Your Households
             </Typography>
            {households.map(hh => (
              <MenuItem 
                key={hh.id} 
                selected={hh.id === currentHousehold?.id}
                onClick={() => { onSwitchHousehold(hh); setAnchorEl(null); }}
              >
                <TotemIcon colorway={hh.theme} sx={{ fontSize: 20, mr: 2 }} />
                {hh.name}
              </MenuItem>
            ))}
          </Menu>

          {/* User Profile & Logout */}
          <Box sx={{ ml: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: 'white', 
                color: 'primary.main', 
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}>
                {user?.username ? user.username[0].toUpperCase() : 'U'}
              </Avatar>
              <IconButton color="inherit" onClick={onLogout} size="small" title="Logout">
                <Logout fontSize="small" />
              </IconButton>
          </Box>
        </Box>

      </Toolbar>
    </AppBar>
  );
}