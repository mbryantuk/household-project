import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar, Box, Tooltip } from '@mui/material';
import { 
  Logout, SwapHoriz, Menu as MenuIcon, 
  DarkMode, LightMode, SettingsBrightness, GetApp 
} from '@mui/icons-material';
import { useState } from 'react';
import TotemIcon from './TotemIcon';

export default function TopBar({ 
  user, currentHousehold, households, onSwitchHousehold, 
  onLogout, toggleSidebar, currentMode, 
  onModeChange, canInstall, onInstall 
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [modeAnchor, setModeAnchor] = useState(null);
  const activeColorway = currentHousehold?.theme || 'default';

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        
        {/* LEFT SECTION: Family Name & Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {currentHousehold && (
            <IconButton color="inherit" onClick={toggleSidebar} edge="start" sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ 
            bgcolor: 'white', 
            borderRadius: '50%', 
            p: 0.5, 
            mr: 1.5, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: 2
          }}>
            <TotemIcon colorway={activeColorway} sx={{ fontSize: 24 }} />
          </Box>

          <Typography variant="h6" noWrap sx={{ fontWeight: 'bold', letterSpacing: 1.5, color: 'white' }}>
            {/* 🏠 Hide "Totem", show Family Name */}
            {currentHousehold ? currentHousehold.name.toUpperCase() : 'TOTEM'}
          </Typography>
        </Box>

        {/* RIGHT SECTION: Actions & Switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          
          {/* PWA Install */}
          {canInstall && (
            <Tooltip title="Install App">
              <IconButton color="inherit" onClick={onInstall}><GetApp /></IconButton>
            </Tooltip>
          )}

          {/* Theme Mode Toggle */}
          <IconButton color="inherit" onClick={(e) => setModeAnchor(e.currentTarget)}>
            {currentMode === 'dark' ? <DarkMode /> : currentMode === 'light' ? <LightMode /> : <SettingsBrightness />}
          </IconButton>
          <Menu anchorEl={modeAnchor} open={Boolean(modeAnchor)} onClose={() => setModeAnchor(null)}>
            <MenuItem onClick={() => { onModeChange('light'); setModeAnchor(null); }}>Light</MenuItem>
            <MenuItem onClick={() => { onModeChange('dark'); setModeAnchor(null); }}>Dark</MenuItem>
            <MenuItem onClick={() => { onModeChange('system'); setModeAnchor(null); }}>System</MenuItem>
          </Menu>

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