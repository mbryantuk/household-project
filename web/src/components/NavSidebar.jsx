import { useState } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography
} from '@mui/joy';
import { 
  Settings, Home as HomeIcon, ChevronLeft, Menu, Event, 
  Groups, Pets, HomeWork, DirectionsCar, 
  KeyboardArrowUp, KeyboardArrowDown, Add
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import Drawer from '@mui/joy/Drawer'; // Use Joy Drawer if available, otherwise fallback to standard

const drawerWidth = 240;

export default function NavSidebar({ open, toggleDrawer, members = [], vehicles = [], isDark, household }) {
  const location = useLocation();

  const [openSub, setOpenSub] = useState({
    people: location.pathname.includes('/people'),
    pets: location.pathname.includes('/pets'),
    vehicles: location.pathname.includes('/vehicles'),
    house: location.pathname.includes('/house')
  });

  const handleToggle = (key) => {
    setOpenSub(prev => ({ ...prev, [key]: !prev[key] }));
    if (!open) toggleDrawer(); // Auto-open if collapsed
  };

  const people = members.filter(m => m.type !== 'pet');
  const pets = members.filter(m => m.type === 'pet');

  const renderSubItem = (label, to, icon, emoji = null) => (
    <ListItem key={to}>
      <ListItemButton
        component={NavLink}
        to={to}
        selected={location.pathname === to}
        sx={{
            pl: 4,
            '&.active': {
                variant: 'soft',
                color: 'primary.main',
                bgcolor: 'background.level1'
            }
        }}
      >
        <ListItemDecorator>
          {emoji ? (
            <Avatar size="sm" sx={{ '--Avatar-size': '24px', fontSize: '1rem', bgcolor: getEmojiColor(emoji, isDark) }}>
              {emoji}
            </Avatar>
          ) : icon}
        </ListItemDecorator>
        <ListItemContent>
            <Typography level="body-sm">{label}</Typography>
        </ListItemContent>
      </ListItemButton>
    </ListItem>
  );

  const renderParent = (id, label, icon, items, pathPrefix, defaultEmoji = null) => {
    const isOpen = openSub[id];
    // For collapsed state (desktop closed), we only show the parent icon
    if (!open) {
        return (
            <ListItem>
                <ListItemButton onClick={() => toggleDrawer()}>
                    <ListItemDecorator>{icon}</ListItemDecorator>
                </ListItemButton>
            </ListItem>
        );
    }

    return (
      <ListItem nested sx={{ my: 0.5 }}>
        <ListItemButton onClick={() => handleToggle(id)}>
            <ListItemDecorator>{icon}</ListItemDecorator>
            <ListItemContent><Typography level="title-sm">{label}</Typography></ListItemContent>
            {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        </ListItemButton>
        {isOpen && (
            <List>
                {items.map(item => renderSubItem(item.name || `${item.make} ${item.model}`, `${pathPrefix}/${item.id}`, null, item.emoji || defaultEmoji))}
                {id !== 'house' && renderSubItem('Add New', `${pathPrefix}/new`, <Add fontSize="small" />)}
            </List>
        )}
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, justifyContent: open ? 'flex-end' : 'center' }}>
        <IconButton onClick={toggleDrawer} variant="plain" color="neutral">
          {!open ? <Menu /> : <ChevronLeft />}
        </IconButton>
      </Box>
      <Divider />
      <List size="sm" sx={{ flexGrow: 1, overflow: 'auto' }}>
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

        <Divider sx={{ my: 1 }} />

        {renderParent('people', 'People', <Groups />, people, 'people')}
        {renderParent('pets', 'Pets', <Pets />, pets, 'pets')}
        
        {renderParent('house', 'House', <HomeWork />, household ? [household] : [], 'house', household?.avatar || '🏠')}

        {renderParent('vehicles', 'Vehicles', <DirectionsCar />, vehicles, 'vehicles', '🚗')}

        <Divider sx={{ my: 1 }} />

        <ListItem>
            <ListItemButton component={NavLink} to="settings" selected={location.pathname.includes('settings')}>
                <ListItemDecorator><Settings /></ListItemDecorator>
                {open && <ListItemContent>Settings</ListItemContent>}
            </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer (Temporary) - Only rendered if screen is small, logically handled by parent usually but here we simulate responsive behavior if needed */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
         <Drawer open={open} onClose={toggleDrawer} size="sm">
            {drawerContent}
         </Drawer>
      </Box>

      {/* Desktop Drawer (Permanent/Persistent-like via Sheet) */}
      <Sheet
        sx={{
          display: { xs: 'none', md: 'flex' },
          borderRight: '1px solid',
          borderColor: 'divider',
          width: open ? drawerWidth : 64,
          transition: 'width 0.2s',
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          flexDirection: 'column',
          zIndex: 100, // Below TopBar if fixed, but here TopBar sits next to it usually in new layouts
        }}
      >
        {drawerContent}
      </Sheet>
    </>
  );
}
