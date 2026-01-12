import { useState } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Menu, MenuItem, Modal, ModalDialog, DialogTitle, DialogContent, FormControl, FormLabel, Input, Button, DialogActions, Stack
} from '@mui/joy';
import { 
  Settings, Home as HomeIcon, ChevronLeft, Menu as MenuIcon, Event, 
  Groups, Pets, HomeWork, DirectionsCar, 
  KeyboardArrowUp, KeyboardArrowDown, Add, Logout, Edit
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import Drawer from '@mui/joy/Drawer';
import EmojiPicker from './EmojiPicker';

const drawerWidth = 260;

export default function NavSidebar({ open, toggleDrawer, members = [], vehicles = [], isDark, household, user, onLogout, onUpdateProfile }) {
  const location = useLocation();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [openSub, setOpenSub] = useState({
    people: location.pathname.includes('/people'),
    pets: location.pathname.includes('/pets'),
    vehicles: location.pathname.includes('/vehicles'),
    house: location.pathname.includes('/house')
  });

  const handleToggle = (key) => {
    setOpenSub(prev => ({ ...prev, [key]: !prev[key] }));
    if (!open) toggleDrawer();
  };

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
      if (onUpdateProfile) await onUpdateProfile(updates);
      setProfileOpen(false);
    } catch (err) {
      console.error("Failed to update profile");
    }
  };

  const renderSubItem = (label, to, icon, emoji = null) => (
    <ListItem key={to}>
      <ListItemButton
        component={NavLink}
        to={to}
        selected={location.pathname === to}
        sx={{
            pl: 5,
            minHeight: 36,
            borderRadius: 'md',
            fontSize: 'sm',
            color: 'neutral.500',
            '&.active': {
                variant: 'soft',
                color: 'primary.plainColor',
                bgcolor: 'background.level1',
                fontWeight: 'lg'
            },
            '&:hover': {
                bgcolor: 'background.level1'
            }
        }}
      >
        <ListItemDecorator sx={{ minWidth: 32 }}>
          {emoji ? (
            <Avatar size="sm" sx={{ '--Avatar-size': '20px', fontSize: '0.9rem', bgcolor: getEmojiColor(emoji, isDark) }}>
              {emoji}
            </Avatar>
          ) : icon}
        </ListItemDecorator>
        <ListItemContent>{label}</ListItemContent>
      </ListItemButton>
    </ListItem>
  );

  const renderParent = (id, label, icon, items, pathPrefix, defaultEmoji = null) => {
    const isOpen = openSub[id];
    if (!open) {
        return (
            <ListItem>
                <ListItemButton onClick={() => toggleDrawer()} sx={{ borderRadius: 'md', mb: 0.5 }}>
                    <ListItemDecorator>{icon}</ListItemDecorator>
                </ListItemButton>
            </ListItem>
        );
    }

    return (
      <ListItem nested sx={{ my: 0.5 }}>
        <ListItemButton 
            onClick={() => handleToggle(id)}
            sx={{ 
                borderRadius: 'md',
                fontWeight: isOpen ? 'lg' : 'md',
                color: isOpen ? 'text.primary' : 'neutral.600'
            }}
        >
            <ListItemDecorator>{icon}</ListItemDecorator>
            <ListItemContent><Typography level="title-sm">{label}</Typography></ListItemContent>
            {isOpen ? <KeyboardArrowUp sx={{ fontSize: 'md' }} /> : <KeyboardArrowDown sx={{ fontSize: 'md' }} />}
        </ListItemButton>
        {isOpen && (
            <List marker="none">
                {items.map(item => renderSubItem(item.name || `${item.make} ${item.model}`, `${pathPrefix}/${item.id}`, null, item.emoji || defaultEmoji))}
                {id !== 'house' && renderSubItem('Add New', `${pathPrefix}/new`, <Add fontSize="small" />)}
            </List>
        )}
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', mb: 2, minHeight: 40 }}>
        {open && <Typography level="title-lg" textColor="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 'sm', fontSize: 'xs' }}>Menu</Typography>}
        <IconButton onClick={toggleDrawer} variant="plain" color="neutral" size="sm">
          {!open ? <MenuIcon /> : <ChevronLeft />}
        </IconButton>
      </Box>
      
      <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', flexGrow: 1, overflow: 'auto' }}>
        <ListItem>
          <ListItemButton component={NavLink} to="dashboard" selected={location.pathname.includes('dashboard')}>
            <ListItemDecorator><HomeIcon /></ListItemDecorator>
            {open && <ListItemContent>Home</ListItemContent>}
          </ListItemButton>
        </ListItem>

        <ListItem>
          <ListItemButton component={NavLink} to="calendar" selected={location.pathname.includes('calendar')}>
            <ListItemDecorator><Event /></ListItemDecorator>
            {open && <ListItemContent>Calendar</ListItemContent>}
          </ListItemButton>
        </ListItem>

        <Divider sx={{ my: 2 }} />

        {renderParent('people', 'People', <Groups />, members.filter(m => m.type !== 'pet'), 'people')}
        {renderParent('pets', 'Pets', <Pets />, members.filter(m => m.type === 'pet'), 'pets')}
        
        {renderParent('house', 'House', <HomeWork />, household ? [household] : [], 'house', household?.avatar || '🏠')}

        {renderParent('vehicles', 'Vehicles', <DirectionsCar />, vehicles, 'vehicles', '🚗')}

        <Divider sx={{ my: 2 }} />

        <ListItem>
            <ListItemButton component={NavLink} to="settings" selected={location.pathname.includes('settings')}>
                <ListItemDecorator><Settings /></ListItemDecorator>
                {open && <ListItemContent>Settings</ListItemContent>}
            </ListItemButton>
        </ListItem>
      </List>

      <Divider sx={{ my: 2 }} />

      {/* USER PROFILE SECTION */}
      <Box 
        sx={{ 
            display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 48, cursor: 'pointer',
            borderRadius: 'sm',
            p: 1,
            justifyContent: open ? 'flex-start' : 'center',
            '&:hover': { bgcolor: 'background.level1' }
        }} 
        onClick={(e) => setUserMenuAnchor(e.currentTarget)}
      >
        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(user?.avatar || '?', isDark) }}>
            {user?.avatar || user?.username?.[0]?.toUpperCase()}
        </Avatar>
        {open && (
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography level="title-sm" noWrap>{user?.username}</Typography>
                <Typography level="body-xs" color="neutral" noWrap sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</Typography>
            </Box>
        )}
      </Box>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        placement="right-end"
        size="sm"
        sx={{ minWidth: 180, zIndex: 1300 }}
      >
        <MenuItem onClick={() => { setProfileOpen(true); setUserMenuAnchor(null); }}>
            <Edit /> Edit Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={onLogout} color="danger">
            <Logout /> Logout
        </MenuItem>
      </Menu>

      {/* Profile Dialog */}
        <Modal open={profileOpen} onClose={() => setProfileOpen(false)}>
          <ModalDialog sx={{ maxWidth: 500, width: '100%', zIndex: 1301 }}>
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

                    <DialogActions>
                        <Button variant="plain" color="neutral" onClick={() => setProfileOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogActions>
                  </Box>
              </form>
            </DialogContent>
          </ModalDialog>
        </Modal>

        <EmojiPicker 
          open={emojiPickerOpen} 
          onClose={() => setEmojiPickerOpen(false)} 
          onEmojiSelect={(emoji) => {
            if (onUpdateProfile) onUpdateProfile({ avatar: emoji });
            setEmojiPickerOpen(false);
          }} 
          title="Select Avatar Emoji"
        />
    </Box>
  );

  return (
    <>
      <Sheet
        sx={{
          display: { xs: 'none', md: 'flex' },
          borderRight: '1px solid',
          borderColor: 'divider',
          width: open ? drawerWidth : 72,
          transition: 'width 0.2s',
          flexShrink: 0,
          height: 'calc(100vh - var(--Header-height, 60px))',
          position: 'sticky',
          top: 'var(--Header-height, 60px)',
          zIndex: 100,
          bgcolor: 'background.body'
        }}
      >
        {drawerContent}
      </Sheet>

      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
         <Drawer open={open} onClose={toggleDrawer} size="sm" sx={{ zIndex: 1300 }}>
            {drawerContent}
         </Drawer>
      </Box>
    </>
  );
}
