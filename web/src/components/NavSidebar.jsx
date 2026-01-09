import { useState } from 'react';
import { 
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Toolbar, Divider, IconButton, styled, useTheme, useMediaQuery, Box,
  Collapse
} from '@mui/material';
import { 
  Settings, Home as HomeIcon, ChevronLeft, Menu, Event, 
  Groups, Pets, HomeWork, DirectionsCar, Inventory, 
  ElectricBolt, WaterDrop, AccountBalance, DeleteSweep,
  ExpandLess, ExpandMore, History, Receipt, Shield, Engineering, Policy
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';

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

export default function NavSidebar({ open, toggleDrawer }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  
  const [houseOpen, setHouseOpen] = useState(false);
  const [vehiclesOpen, setVehiclesOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: <HomeIcon /> },
    { id: 'calendar', label: 'Calendar', icon: <Event /> },
    { type: 'divider' },
    { id: 'people', label: 'People', icon: <Groups /> },
    { id: 'pets', label: 'Pets', icon: <Pets /> },
    { type: 'divider' },
    { 
      id: 'house-parent', 
      label: 'House', 
      icon: <HomeWork />,
      children: [
        { id: 'house', label: 'General Info', icon: <HomeWork /> },
        { id: 'energy', label: 'Energy', icon: <ElectricBolt /> },
        { id: 'water', label: 'Water', icon: <WaterDrop /> },
        { id: 'waste', label: 'Waste Collection', icon: <DeleteSweep /> },
        { id: 'assets', label: 'Appliance Register', icon: <Inventory /> },
        { id: 'council', label: 'Council Tax', icon: <AccountBalance /> },
      ]
    },
    { 
      id: 'vehicles-parent', 
      label: 'Vehicles', 
      icon: <DirectionsCar />,
      children: [
        { id: 'vehicles', label: 'Fleet Overview', icon: <DirectionsCar /> },
        { id: 'vehicles/history', label: 'Service History', icon: <History /> },
        { id: 'vehicles/finance', label: 'Finance', icon: <Receipt /> },
        { id: 'vehicles/warranty', label: 'Warranty', icon: <Engineering /> },
        { id: 'vehicles/insurance', label: 'Insurance', icon: <Policy /> },
        { id: 'vehicles/mot', label: 'MOT & Tax', icon: <Shield /> },
      ]
    },
    { type: 'divider' },
    { id: 'settings', label: 'Settings', icon: <Settings /> },
  ];

  const renderItem = (item, depth = 0) => {
    if (item.type === 'divider') return <Divider key={Math.random()} sx={{ my: 1 }} />;

    const isParent = !!item.children;
    const isOpen = item.id === 'house-parent' ? houseOpen : vehiclesOpen;
    const setOpen = item.id === 'house-parent' ? setHouseOpen : setVehiclesOpen;

    const isActive = location.pathname.includes(item.id) || (item.children && item.children.some(c => location.pathname.includes(c.id)));

    return (
      <Box key={item.id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            component={isParent ? 'div' : NavLink}
            to={isParent ? undefined : item.id}
            onClick={() => {
                if (isParent) {
                    setOpen(!isOpen);
                    if (!open && !isMobile) toggleDrawer();
                } else if (isMobile) {
                    toggleDrawer();
                }
            }}
            sx={{
              minHeight: 48,
              justifyContent: open || isMobile ? 'initial' : 'center',
              px: 2.5,
              pl: 2.5 + (depth * 2),
              '&.active': {
                bgcolor: 'action.selected',
                borderRight: '3px solid',
                borderColor: 'primary.main'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open || isMobile ? 3 : 'auto', justifyContent: 'center' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              sx={{ opacity: open || isMobile ? 1 : 0 }} 
            />
            {(open || isMobile) && isParent && (isOpen ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        
        {isParent && (
          <Collapse in={isOpen && (open || isMobile)} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderItem(item.id === 'house-parent' && child.id === 'house' ? { ...child, id: 'house' } : child, depth + 1))}
            </List>
          </Collapse>
        )}
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
        {menuItems.map(item => renderItem(item))}
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
