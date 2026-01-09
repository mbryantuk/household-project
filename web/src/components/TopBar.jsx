import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar, Box, Tooltip, Popover, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Grid, Divider, ListItemIcon } from '@mui/material';
import { 
  Logout, SwapHoriz, Menu as MenuIcon, 
  DarkMode, LightMode, SettingsBrightness, GetApp, AdminPanelSettings,
  CalendarMonth, Calculate, Person, Password, Email, AddReaction
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import TotemIcon from './TotemIcon';
import FloatingCalendar from './FloatingCalendar';
import FloatingCalculator from './FloatingCalculator';
import EmojiPicker from './EmojiPicker';
import { getEmojiColor } from '../theme';

export default function TopBar({
  user, currentHousehold, households, onSwitchHousehold,
  onLogout, toggleSidebar, canInstall, onInstall,
  dates, api, onDateAdded, onUpdateProfile
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [anchorEl, setAnchorEl] = useState(null);
  const [userAnchorEl, setUserAnchorEl] = useState(null);
  const [calAnchor, setCalAnchor] = useState(null);
  const [showCalc, setShowCalc] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const navigate = useNavigate();

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      username: formData.get('username'),
      email: formData.get('email'),
      avatar: user.avatar
    };
    const password = formData.get('password');
    if (password) updates.password = password;

    try {
      await onUpdateProfile(updates);
      setProfileOpen(false);
    } catch (err) {
      console.error("Failed to update profile");
    }
  };

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
          
          <Box 
            sx={{ 
              bgcolor: currentHousehold?.avatar && !currentHousehold.avatar.startsWith('data:image') 
                ? getEmojiColor(currentHousehold.avatar, isDark) 
                : 'white', 
              borderRadius: '50%', p: 0.5, mr: 1.5, display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              boxShadow: 2, cursor: 'pointer',
              width: 36, height: 36, fontSize: '1.4rem',
              overflow: 'hidden', flexShrink: 0
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
            {currentHousehold ? currentHousehold.name.toUpperCase() : 'TOTEM'}
          </Typography>
        </Box>

        {/* RIGHT SECTION: Actions & Switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          
          <Tooltip title="Calculator">
            <IconButton color="inherit" onClick={() => setShowCalc(!showCalc)}>
              <Calculate />
            </IconButton>
          </Tooltip>

          <Tooltip title="Calendar">
            <IconButton color="inherit" onClick={(e) => setCalAnchor(e.currentTarget)}>
              <CalendarMonth />
            </IconButton>
          </Tooltip>

          {canInstall && (
            <Tooltip title="Install App">
              <IconButton color="inherit" onClick={onInstall}>
                <GetApp />
              </IconButton>
            </Tooltip>
          )}

          <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />

          {/* User Account */}
          <Tooltip title="Account Settings">
            <IconButton 
              onClick={(e) => setUserAnchorEl(e.currentTarget)}
              sx={{ p: 0, ml: 1, border: '2px solid rgba(255,255,255,0.5)' }}
            >
              <Avatar 
                sx={{ 
                  width: 32, height: 32, 
                  bgcolor: user?.avatar ? getEmojiColor(user.avatar, isDark) : 'secondary.main',
                  fontSize: '1.1rem'
                }}
              >
                {user?.avatar || user?.username?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* --- DROPDOWNS --- */}

        {/* User Menu */}
        <Menu
          anchorEl={userAnchorEl}
          open={Boolean(userAnchorEl)}
          onClose={() => setUserAnchorEl(null)}
          PaperProps={{ sx: { width: 200, mt: 1.5, borderRadius: 2 } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" noWrap>{user?.username}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap sx={{ textTransform: 'capitalize' }}>
              {user?.role}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setProfileOpen(true); setUserAnchorEl(null); }}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            Edit Profile
          </MenuItem>
          <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

        {/* Calendar Popover */}
        <Popover
          open={Boolean(calAnchor)}
          anchorEl={calAnchor}
          onClose={() => setCalAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { mt: 1.5, borderRadius: 3, width: 400, height: 500, overflow: 'hidden' } }}
        >
          <FloatingCalendar dates={dates} api={api} onDateAdded={onDateAdded} />
        </Popover>

        {/* Calculator */}
        {showCalc && <FloatingCalculator onClose={() => setShowCalc(false)} />}

        {/* Profile Dialog */}
        <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} fullWidth maxWidth="xs">
          <form onSubmit={handleProfileSubmit}>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                   <Box 
                    sx={{ 
                      width: 80, height: 80, borderRadius: '50%', 
                      bgcolor: getEmojiColor(user?.avatar || '👤', isDark),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2.5rem', cursor: 'pointer', border: '3px solid', borderColor: 'primary.main'
                    }}
                    onClick={() => setEmojiPickerOpen(true)}
                   >
                    {user?.avatar || '👤'}
                   </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField name="username" label="Username" defaultValue={user?.username} fullWidth required />
                </Grid>
                <Grid item xs={12}>
                  <TextField name="email" label="Email Address" defaultValue={user?.email} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField name="password" label="New Password" type="password" fullWidth placeholder="Leave blank to keep current" />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setProfileOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained">Save Changes</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Emoji Picker for Avatar */}
        <EmojiPicker 
          open={emojiPickerOpen} 
          onClose={() => setEmojiPickerOpen(false)} 
          onEmojiSelect={(emoji) => {
            onUpdateProfile({ avatar: emoji });
            setEmojiPickerOpen(false);
          }} 
          title="Select Avatar Emoji"
        />

      </Toolbar>
    </AppBar>
  );
}
