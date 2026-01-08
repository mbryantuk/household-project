import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem, Avatar, Box, Tooltip, Popover, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Grid, Divider } from '@mui/material';
import { 
  Logout, SwapHoriz, Menu as MenuIcon, 
  DarkMode, LightMode, SettingsBrightness, GetApp, AdminPanelSettings,
  CalendarMonth, Calculate, Person, Password, Email, AddReaction
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TotemIcon from './TotemIcon';
import FloatingCalendar from './FloatingCalendar';
import FloatingCalculator from './FloatingCalculator';

const EMOJI_CATEGORIES = [
  { label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '🤨', '🧐'] },
  { label: 'Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'] },
  { label: 'House & Travel', emojis: ['🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🎡', '🎢', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '✈️', '🛫', '🛬', '💺', '🚁', '🚟', '🚠', '🚡', '🚀', '🛸', '🛰️', '🪐', '🌠', '🌌', '🌍', '🌎', '🌏', '🌐', '🗺️', '🗾', '🧭'] },
  { label: 'Food & Drink', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', 'バター', '🥞', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥣', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🧂', '🍩', '🍪', '🌰', '🥜', '🥤', '🧃', '🥛', '☕', '🍵', '🧉', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍶'] }
];

export default function TopBar({
  user, currentHousehold, households, onSwitchHousehold,
  onLogout, toggleSidebar, canInstall, onInstall,
  dates, api, onDateAdded, onUpdateProfile
}) {
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
      alert("Failed to update profile");
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
          
          {/* Calculator Toggle */}
          <Tooltip title="Calculator">
            <IconButton color="inherit" onClick={() => setShowCalc(!showCalc)}>
              <Calculate />
            </IconButton>
          </Tooltip>
          {showCalc && <FloatingCalculator onClose={() => setShowCalc(false)} />}

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
                  currentUser={user}
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
          <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
              <Tooltip title="User Settings">
                <IconButton onClick={(e) => setUserAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                  <Avatar sx={{ 
                    width: 36, 
                    height: 36, 
                    bgcolor: 'white', 
                    color: 'primary.main', 
                    fontWeight: 'bold',
                    fontSize: user?.avatar ? '1.4rem' : '1rem'
                  }}>
                    {user?.avatar ? user.avatar : (user?.username ? user.username[0].toUpperCase() : 'U')}
                  </Avatar>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={userAnchorEl}
                open={Boolean(userAnchorEl)}
                onClose={() => setUserAnchorEl(null)}
                PaperProps={{ sx: { mt: 1, minWidth: 180 } }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{user?.username}</Typography>
                  <Typography variant="caption" color="text.secondary">{user?.email || 'No email set'}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { setUserAnchorEl(null); setProfileOpen(true); }}>
                  <Person sx={{ mr: 1.5, fontSize: 20 }} /> My Profile
                </MenuItem>
                <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
                  <Logout sx={{ mr: 1.5, fontSize: 20 }} /> Logout
                </MenuItem>
              </Menu>
          </Box>
        </Box>

      </Toolbar>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleProfileSubmit}>
          <DialogTitle>My Profile</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
               <Box 
                 sx={{ 
                   width: 80, height: 80, 
                   borderRadius: '50%', 
                   bgcolor: 'background.default', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   border: '2px solid', borderColor: 'primary.main',
                   boxShadow: 2,
                   cursor: 'pointer',
                   fontSize: '2.5rem',
                   mb: 1
                 }}
                 onClick={() => setEmojiPickerOpen(true)}
               >
                 {user?.avatar || <Person sx={{ fontSize: 40 }} />}
               </Box>
               <Button size="small" startIcon={<AddReaction />} onClick={() => setEmojiPickerOpen(true)}>
                 Change Avatar
               </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                  fullWidth name="username" label="Username" 
                  defaultValue={user?.username} required 
                  InputProps={{ startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth name="email" label="Email Address" 
                  defaultValue={user?.email} 
                  InputProps={{ startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth name="password" label="New Password" type="password" 
                  placeholder="Leave blank to keep current"
                  InputProps={{ startAdornment: <Password sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProfileOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Emoji Picker for Profile */}
      <Dialog open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Choose Avatar Emoji</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            {EMOJI_CATEGORIES.map((cat) => (
              <Box key={cat.label} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {cat.label}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 1 }}>
                  {cat.emojis.map((emoji) => (
                    <IconButton 
                      key={emoji} 
                      onClick={() => {
                        onUpdateProfile({ avatar: emoji });
                        setEmojiPickerOpen(null);
                      }}
                      sx={{ fontSize: '1.5rem', '&:hover': { bgcolor: 'action.selected' } }}
                    >
                      {emoji}
                    </IconButton>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmojiPickerOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
}