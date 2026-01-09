import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Divider, IconButton, styled, useTheme, useMediaQuery, Box } from '@mui/material';
import { 
  Settings, Home as HomeIcon, ChevronLeft, Menu, Event, 
  Groups, Pets, HomeWork, DirectionsCar, Inventory, 
  ElectricBolt, WaterDrop, AccountBalance, DeleteSweep 
} from '@mui/icons-material';
import { NavLink } from 'react-router-dom';

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

  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: <HomeIcon /> },
    { id: 'calendar', label: 'Calendar', icon: <Event /> },
    { type: 'divider' },
    { id: 'people', label: 'People', icon: <Groups /> },
    { id: 'pets', label: 'Pets', icon: <Pets /> },
    { type: 'divider' },
    { id: 'house', label: 'House Info', icon: <HomeWork /> },
    { id: 'vehicles', label: 'Vehicles', icon: <DirectionsCar /> },
    { id: 'assets', label: 'Assets & Warranties', icon: <Inventory /> },
    { type: 'divider' },
    { id: 'energy', label: 'Energy', icon: <ElectricBolt /> },
    { id: 'water', label: 'Water', icon: <WaterDrop /> },
    { id: 'council', label: 'Council Tax', icon: <AccountBalance /> },
    { id: 'waste', label: 'Waste', icon: <DeleteSweep /> },
    { type: 'divider' },
    { id: 'settings', label: 'Settings', icon: <Settings /> },
  ];

  const drawerContent = (
    <>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-end' : 'center', px: [1] }}>
        <IconButton onClick={toggleDrawer}>
          {!isMobile && !open ? <Menu /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item, index) => (
          item.type === 'divider' ? <Divider key={`div-${index}`} sx={{ my: 1 }} /> : (
            <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                component={NavLink}
                to={item.id}
                onClick={isMobile ? toggleDrawer : undefined}
                sx={{
                  minHeight: 48,
                  justifyContent: open || isMobile ? 'initial' : 'center',
                  px: 2.5,
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
                  sx={{ 
                    opacity: open || isMobile ? 1 : 0, 
                    transition: theme.transitions.create('opacity', { duration: theme.transitions.duration.shorter }),
                    whiteSpace: 'nowrap'
                  }} 
                />
              </ListItemButton>
            </ListItem>
          )
        ))}
      </List>
    </>
  );

  return (
    <Box component="nav" sx={{ 
      width: { sm: open ? drawerWidth : `calc(${theme.spacing(8)} + 1px)` }, 
      flexShrink: { sm: 0 }, 
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
      }),
    }}>
      {/* Mobile Drawer (Temporary) */}
      <Drawer
        variant="temporary"
        open={open && isMobile}
        onClose={toggleDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer (Permanent) */}
      <StyledDrawer
        variant="permanent"
        open={open}
        sx={{
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {drawerContent}
      </StyledDrawer>
    </Box>
  );
}