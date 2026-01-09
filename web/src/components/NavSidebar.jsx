import { useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Toolbar, Divider, IconButton, styled, useTheme, useMediaQuery, Box,
  Collapse, Avatar
} from '@mui/material';
import { 
  Settings, Home as HomeIcon, ChevronLeft, Menu, Event, 
  Groups, Pets, HomeWork, DirectionsCar, 
  ExpandLess, ExpandMore, Add
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { getEmojiColor } from '../theme';

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

export default function NavSidebar({ open, toggleDrawer, members = [], vehicles = [], isDark }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();

  const [openSub, setOpenSub] = useState({
    people: location.pathname.includes('/people'),
    pets: location.pathname.includes('/pets'),
    vehicles: location.pathname.includes('/vehicles')
  });

  const handleToggle = (key) => {
    setOpenSub(prev => ({ ...prev, [key]: !prev[key] }));
    if (!open && !isMobile) toggleDrawer();
  };

  const people = members.filter(m => m.type !== 'pet');
  const pets = members.filter(m => m.type === 'pet');

  const renderSubItem = (label, to, icon, emoji = null) => (
    <ListItem key={to} disablePadding sx={{ display: 'block' }}>
      <ListItemButton
        component={NavLink}
        to={to}
        onClick={isMobile ? toggleDrawer : undefined}
        sx={{
          minHeight: 40,
          pl: 4,
          '&.active': {
            bgcolor: 'action.selected',
            borderRight: '3px solid',
            borderColor: 'primary.main'
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 0, mr: 2, justifyContent: 'center' }}>
          {emoji ? (
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', bgcolor: getEmojiColor(emoji, isDark) }}>
              {emoji}
            </Avatar>
          ) : icon}
        </ListItemIcon>
        <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2' }} />
      </ListItemButton>
    </ListItem>
  );

  const renderParent = (id, label, icon, children, items, pathPrefix) => {
    const isOpen = openSub[id];
    return (
      <Box key={id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => handleToggle(id)}
            sx={{
              minHeight: 48,
              justifyContent: open || isMobile ? 'initial' : 'center',
              px: 2.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open || isMobile ? 3 : 'auto', justifyContent: 'center' }}>
              {icon}
            </ListItemIcon>
            <ListItemText primary={label} sx={{ opacity: open || isMobile ? 1 : 0 }} />
            {(open || isMobile) && (isOpen ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        <Collapse in={isOpen && (open || isMobile)} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {items.map(item => renderSubItem(item.name || `${item.make} ${item.model}`, `${pathPrefix}/${item.id}`, null, item.emoji || (id === 'vehicles' ? '🚗' : null)))}
            {renderSubItem('Add New', `${pathPrefix}/new`, <Add fontSize="small" />)}
          </List>
        </Collapse>
      </Box>
    );
  };

  const drawerContent = (
    <>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-end' : 'center', px: [1] }}>
        <IconButton onClick={toggleDrawer}>
          {!isMobile && !open ? <Menu /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            component={NavLink}
            to="dashboard"
            sx={{ minHeight: 48, px: 2.5, justifyContent: open || isMobile ? 'initial' : 'center' }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open || isMobile ? 3 : 'auto', justifyContent: 'center' }}><HomeIcon /></ListItemIcon>
            <ListItemText primary="Home" sx={{ opacity: open || isMobile ? 1 : 0 }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            component={NavLink}
            to="calendar"
            sx={{ minHeight: 48, px: 2.5, justifyContent: open || isMobile ? 'initial' : 'center' }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open || isMobile ? 3 : 'auto', justifyContent: 'center' }}><Event /></ListItemIcon>
            <ListItemText primary="Calendar" sx={{ opacity: open || isMobile ? 1 : 0 }} />
          </ListItemButton>
        </ListItem>

        <Divider sx={{ my: 1 }} />

        {renderParent('people', 'People', <Groups />, null, people, 'people')}
        {renderParent('pets', 'Pets', <Pets />, null, pets, 'pets')}
        
        {/* NO DIVIDER AS REQUESTED */}

        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            component={NavLink}
            to="house"
            sx={{ minHeight: 48, px: 2.5, justifyContent: open || isMobile ? 'initial' : 'center' }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open || isMobile ? 3 : 'auto', justifyContent: 'center' }}><HomeWork /></ListItemIcon>
            <ListItemText primary="House" sx={{ opacity: open || isMobile ? 1 : 0 }} />
          </ListItemButton>
        </ListItem>

        {renderParent('vehicles', 'Vehicles', <DirectionsCar />, null, vehicles, 'vehicles')}

        <Divider sx={{ my: 1 }} />

        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            component={NavLink}
            to="settings"
            sx={{ minHeight: 48, px: 2.5, justifyContent: open || isMobile ? 'initial' : 'center' }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open || isMobile ? 3 : 'auto', justifyContent: 'center' }}><Settings /></ListItemIcon>
            <ListItemText primary="Settings" sx={{ opacity: open || isMobile ? 1 : 0 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={toggleDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <StyledDrawer variant="permanent" open={open}>
          {drawerContent}
        </StyledDrawer>
      )}
    </>
  );
}
