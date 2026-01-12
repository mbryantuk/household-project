import { useState } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, GlobalStyles
} from '@mui/joy';
import { 
  Settings, Home as HomeIcon, ChevronLeft, Menu, Event, 
  Groups, Pets, HomeWork, DirectionsCar, 
  KeyboardArrowUp, KeyboardArrowDown, Add
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import Drawer from '@mui/joy/Drawer';

const drawerWidth = 260;

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
    if (!open) toggleDrawer();
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
            pl: 5,
            minHeight: 36,
            borderRadius: 'sm',
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
          {!open ? <Menu /> : <ChevronLeft />}
        </IconButton>
      </Box>
      
      <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px' }}>
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

        {renderParent('people', 'People', <Groups />, people, 'people')}
        {renderParent('pets', 'Pets', <Pets />, pets, 'pets')}
        
        {renderParent('house', 'House', <HomeWork />, household ? [household] : [], 'house', household?.avatar || '🏠')}

        {renderParent('vehicles', 'Vehicles', <DirectionsCar />, vehicles, 'vehicles', '🚗')}

        <Box sx={{ flexGrow: 1 }} />
        
        <Divider sx={{ my: 2 }} />

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
      <Sheet
        sx={{
          display: { xs: 'none', md: 'flex' },
          borderRight: '1px solid',
          borderColor: 'divider',
          width: open ? drawerWidth : 72,
          transition: 'width 0.2s',
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: 'background.body'
        }}
      >
        {drawerContent}
      </Sheet>

      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
         <Drawer open={open} onClose={toggleDrawer} size="sm">
            {drawerContent}
         </Drawer>
      </Box>
    </>
  );
}