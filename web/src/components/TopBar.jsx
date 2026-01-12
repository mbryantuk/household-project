import { useState } from 'react';
import { 
  Sheet, IconButton, Typography, Avatar, Tooltip, Menu, MenuItem, Box, Divider, 
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions,
  FormControl, FormLabel, Input, Button, Grid
} from '@mui/joy';
import { 
  Logout, Menu as MenuIcon, Calculate, CalendarMonth, GetApp, Person 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import TotemIcon from './TotemIcon';
import FloatingCalendar from './FloatingCalendar';
import FloatingCalculator from './FloatingCalculator';
import EmojiPicker from './EmojiPicker';
import { getEmojiColor } from '../theme';

export default function TopBar({
  user, currentHousehold, households, onSwitchHousehold,
  onLogout, toggleSidebar, canInstall, onInstall,
  dates, api, onDateAdded, onUpdateProfile, currentMode
}) {
  const isDark = currentMode === 'dark';
  const [anchorEl, setAnchorEl] = useState(null); // Menu anchor (Joy uses Menu components differently?) Joy Menu anchors to element
  // Joy Menu controls: open + anchorEl
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const navigate = useNavigate();

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      username: formData.get('username'),
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
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
    <Sheet
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        py: 1.5,
        position: 'sticky', // or fixed
        top: 0,
        zIndex: 1100,
        boxShadow: 'sm',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.surface'
      }}
    >
        {/* LEFT SECTION */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {currentHousehold && (
            <IconButton variant="plain" color="neutral" onClick={toggleSidebar} size="sm">
              <MenuIcon />
            </IconButton>
          )}
          
          <Box 
            sx={{ 
              display: 'flex', alignItems: 'center', gap: 1.5, 
              cursor: 'pointer' 
            }}
            onClick={() => navigate('/')}
          >
             <Box 
                sx={{ 
                  bgcolor: currentHousehold?.avatar && !currentHousehold.avatar.startsWith('data:image') 
                    ? getEmojiColor(currentHousehold.avatar, isDark) 
                    : 'background.level1', 
                  borderRadius: '50%', p: 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, fontSize: '1.4rem',
                  overflow: 'hidden', border: '1px solid', borderColor: 'divider'
                }}
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
              <Typography level="h4" sx={{ display: { xs: 'none', sm: 'block' }, letterSpacing: '1px', textTransform: 'uppercase' }}>
                {currentHousehold ? currentHousehold.name : 'TOTEM'}
              </Typography>
          </Box>
        </Box>

        {/* RIGHT SECTION */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Calculator" variant="soft">
            <IconButton variant="plain" onClick={() => setShowCalc(!showCalc)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <Calculate />
            </IconButton>
          </Tooltip>

          <Tooltip title="Calendar" variant="soft">
            <IconButton variant="plain" onClick={() => setShowCalendar(true)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              <CalendarMonth />
            </IconButton>
          </Tooltip>

          {canInstall && (
            <Tooltip title="Install App" variant="soft">
              <IconButton variant="plain" onClick={onInstall}>
                <GetApp />
              </IconButton>
            </Tooltip>
          )}

          <Divider orientation="vertical" sx={{ height: 24, mx: 1, display: { xs: 'none', sm: 'block' } }} />

          {/* User Account */}
          <IconButton 
            onClick={(e) => { setUserMenuAnchor(e.currentTarget); setUserMenuOpen(true); }}
            variant="plain"
            sx={{ p: 0, borderRadius: '50%' }}
          >
            <Avatar 
              size="sm"
              sx={{ 
                bgcolor: user?.avatar ? getEmojiColor(user.avatar, isDark) : 'primary.solidBg',
              }}
            >
              {user?.avatar || user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={userMenuAnchor}
            open={userMenuOpen}
            onClose={() => setUserMenuOpen(false)}
            placement="bottom-end"
            size="sm"
          >
            <Box sx={{ px: 2, py: 1 }}>
                <Typography level="title-sm">{user?.username}</Typography>
                <Typography level="body-xs" color="neutral">{user?.role}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setProfileOpen(true); setUserMenuOpen(false); }}>
                <Person /> Edit Profile
            </MenuItem>
            <MenuItem onClick={onLogout} color="danger">
                <Logout /> Logout
            </MenuItem>
          </Menu>
        </Box>

        {/* Calendar Modal (using Modal for simplicity or could be Popover if Joy had one) */}
        {/* Joy doesn't have Popover yet (v5), usually people use Menu or Popper. Let's use Modal for big calendar */}
        <Modal open={showCalendar} onClose={() => setShowCalendar(false)}>
            <ModalDialog layout="center" sx={{ minWidth: 400, minHeight: 500, p: 0, overflow: 'hidden' }}>
                <FloatingCalendar dates={dates} api={api} onDateAdded={onDateAdded} onClose={() => setShowCalendar(false)} />
            </ModalDialog>
        </Modal>

        {showCalc && <FloatingCalculator onClose={() => setShowCalc(false)} />}

        {/* Profile Dialog */}
        <Modal open={profileOpen} onClose={() => setProfileOpen(false)}>
          <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogContent>
              <form onSubmit={handleProfileSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                       <Box 
                        sx={{ 
                          width: 80, height: 80, borderRadius: '50%', 
                          bgcolor: getEmojiColor(user?.avatar || '👤', isDark),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '2.5rem', cursor: 'pointer', border: '3px solid', borderColor: 'primary.solidBg'
                        }}
                        onClick={() => setEmojiPickerOpen(true)}
                       >
                        {user?.avatar || '👤'}
                       </Box>
                    </Box>

                    <FormControl required>
                        <FormLabel>Username</FormLabel>
                        <Input name="username" defaultValue={user?.username} />
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel>First Name</FormLabel>
                            <Input name="first_name" defaultValue={user?.first_name} />
                        </FormControl>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel>Last Name</FormLabel>
                            <Input name="last_name" defaultValue={user?.last_name} />
                        </FormControl>
                    </Box>

                    <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input name="email" defaultValue={user?.email} />
                    </FormControl>

                    <FormControl>
                        <FormLabel>New Password</FormLabel>
                        <Input name="password" type="password" placeholder="Leave blank to keep current" />
                    </FormControl>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <Button variant="plain" color="neutral" onClick={() => setProfileOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </Box>
                  </Box>
              </form>
            </DialogContent>
          </ModalDialog>
        </Modal>

        <EmojiPicker 
          open={emojiPickerOpen} 
          onClose={() => setEmojiPickerOpen(false)} 
          onEmojiSelect={(emoji) => {
            onUpdateProfile({ avatar: emoji });
            setEmojiPickerOpen(false);
          }} 
          title="Select Avatar Emoji"
        />

    </Sheet>
  );
}