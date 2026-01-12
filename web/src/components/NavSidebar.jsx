import React, { useState, useEffect } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Stack, Tooltip, Button
} from '@mui/joy';
import { 
  Settings, Home as HomeIcon, Event, 
  Groups, Pets, HomeWork, DirectionsCar, 
  Logout, Edit, KeyboardArrowRight, ChevronLeft, Download, Close
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import EmojiPicker from './EmojiPicker';
import TotemIcon from './TotemIcon';

// Layout Constants
const RAIL_WIDTH = 64; // Reduced from 72
const PANEL_WIDTH = 240;

export default function NavSidebar({ 
    members = [], vehicles = [], isDark, household, user, 
    onLogout, onUpdateProfile, onModeChange, onInstall, canInstall,
    useDracula, onDraculaChange, isMobile = false, onClose
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState(null);
  
  useEffect(() => {
      const path = location.pathname;
      if (path.includes('/people')) setActiveCategory('people');
      else if (path.includes('/pets')) setActiveCategory('pets');
      else if (path.includes('/vehicles')) setActiveCategory('vehicles');
      else if (path.includes('/house/') || path.endsWith('/house')) setActiveCategory('house'); 
      else if (path.includes('/settings')) setActiveCategory('settings');
      else if (path.includes('/profile')) setActiveCategory('account');
      else if (path.includes('/dashboard')) setActiveCategory('dashboard');
      else if (path.includes('/calendar')) setActiveCategory('calendar');
  }, [location.pathname]);

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const handleCategoryClick = (category, hasSubItems) => {
      if (activeCategory === category && !hasSubItems) {
          // If it's a direct link and already active, do nothing or collapse
      } else {
          setActiveCategory(category);
      }
  };

  const handleNav = (to, category, hasSubItems) => {
      if (to) {
          navigate(to);
          if (!hasSubItems && isMobile && onClose) onClose();
      }
      setActiveCategory(category);
  };

  const RailIcon = ({ icon, label, category, to, hasSubItems }) => {
      // Logic: isActive if path matches OR category matches manually
      const pathMatches = to && location.pathname.includes(to);
      const categoryMatches = activeCategory === category;
      const isActive = pathMatches || categoryMatches;
      
      if (isMobile) {
          return (
            <ListItem>
                <ListItemButton 
                    selected={isActive}
                    onClick={() => handleNav(to, category, hasSubItems)}
                    sx={{ borderRadius: 'sm', gap: 2 }}
                >
                    <ListItemDecorator>{icon}</ListItemDecorator>
                    <ListItemContent>{label}</ListItemContent>
                    {hasSubItems && <KeyboardArrowRight />}
                </ListItemButton>
            </ListItem>
          );
      }

      return (
        <Tooltip title={label} placement="right" arrow size="sm">
            <ListItem>
                <ListItemButton 
                    selected={isActive}
                    onClick={() => handleNav(to, category, hasSubItems)}
                    sx={{ 
                        borderRadius: 'md', 
                        justifyContent: 'center', 
                        px: 0, 
                        flexDirection: 'column', 
                        gap: 0.2, 
                        py: 0.8, 
                        width: 52, // Slightly narrower
                        mx: 'auto',
                        minHeight: 52,
                        '&.Mui-selected': {
                            bgcolor: 'background.level1',
                            color: 'primary.plainColor'
                        }
                    }}
                >
                    <ListItemDecorator sx={{ display: 'flex', justifyContent: 'center', m: 0, '& svg': { fontSize: '1.25rem' } }}>{icon}</ListItemDecorator>
                    <Typography level="body-xs" sx={{ fontSize: '9px', fontWeight: '500', color: 'inherit' }}>{label}</Typography>
                </ListItemButton>
            </ListItem>
        </Tooltip>
      );
  };

  const SubItem = ({ label, to, emoji }) => (
      <ListItem>
          <ListItemButton 
            component={NavLink} 
            to={to} 
            sx={{ borderRadius: 'sm' }}
            onClick={() => { if (isMobile && onClose) onClose(); }}
          >
              <ListItemDecorator>
                {emoji ? (
                    <Avatar size="sm" sx={{ '--Avatar-size': '20px', fontSize: '0.9rem', bgcolor: getEmojiColor(emoji, isDark) }}>{emoji}</Avatar>
                ) : <KeyboardArrowRight />}
              </ListItemDecorator>
              <ListItemContent>{label}</ListItemContent>
          </ListItemButton>
      </ListItem>
  );

  // Determine if panel should actually be visible
  const showPanel = activeCategory && ['people', 'pets', 'house', 'vehicles', 'settings', 'account'].includes(activeCategory);

  const sidebarContent = (
    <Box sx={{ display: 'flex', height: '100%' }}>
        <Sheet
            sx={{
                width: isMobile ? '100%' : RAIL_WIDTH,
                borderRight: isMobile ? 'none' : '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMobile ? 'stretch' : 'center',
                py: 1.5,
                bgcolor: 'background.surface',
                zIndex: 2500,
                height: '100%' 
            }}
        >
            {isMobile && (
                <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography level="title-lg" sx={{ fontWeight: 'bold' }}>Menu</Typography>
                    <IconButton variant="plain" color="neutral" onClick={onClose}><Close /></IconButton>
                </Box>
            )}

            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
                <Box 
                    sx={{ 
                        width: 42, height: 42, borderRadius: '50%', 
                        bgcolor: getEmojiColor(household?.avatar || '?', isDark),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', cursor: 'pointer',
                        border: '2px solid', borderColor: 'divider',
                        overflow: 'hidden'
                    }}
                >
                    {household?.avatar ? (household.avatar.startsWith('data:image') ? <img src={household.avatar} alt="HH" style={{width:'100%'}}/> : household.avatar) : <TotemIcon />}
                </Box>
            </Box>

            <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '2px', width: '100%', px: isMobile ? 1 : 0 }}>
                <RailIcon icon={<HomeIcon />} label="Home" category="dashboard" to="dashboard" />
                <RailIcon icon={<Event />} label="Events" category="calendar" to="calendar" />
                <Divider sx={{ my: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />
                <RailIcon icon={<Groups />} label="People" category="people" hasSubItems />
                <RailIcon icon={<Pets />} label="Pets" category="pets" hasSubItems />
                <RailIcon icon={<HomeWork />} label="House" category="house" hasSubItems />
                <RailIcon icon={<DirectionsCar />} label="Vehicles" category="vehicles" hasSubItems />
                <Divider sx={{ my: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />
                <RailIcon icon={<Settings />} label="Settings" category="settings" to="settings" hasSubItems />
                <Divider sx={{ my: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />
                <RailIcon 
                    icon={
                        <Avatar 
                            size="sm"
                            sx={{ 
                                bgcolor: getEmojiColor(user?.avatar || '👤', isDark), 
                                width: 22, height: 22, fontSize: '0.75rem' 
                            }}
                        >
                            {user?.avatar || user?.first_name?.[0] || user?.email?.[0]}
                        </Avatar>
                    } 
                    label="Account" 
                    category="account" 
                    hasSubItems 
                />
            </List>

            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ mt: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'center', px: isMobile ? 2 : 0, pb: 1 }}>
                {canInstall && (
                    <Tooltip title="Install App" placement="right" arrow size="sm">
                        <IconButton 
                            onClick={onInstall} 
                            variant="soft" 
                            color="primary" 
                            sx={{ borderRadius: 'sm', width: 36, height: 36 }}
                        >
                            <Download sx={{ fontSize: '1.2rem' }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        </Sheet>

        {(showPanel || (isMobile && activeCategory)) && (
            <Sheet
                sx={{
                    width: isMobile ? '100%' : (showPanel ? PANEL_WIDTH : 0),
                    position: isMobile ? 'absolute' : 'relative',
                    left: isMobile ? 0 : 'auto',
                    top: 0,
                    zIndex: isMobile ? 2600 : 2100,
                    borderRight: (showPanel && !isMobile) ? '1px solid' : 'none',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    transition: isMobile ? 'none' : 'width 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.level1',
                    whiteSpace: 'nowrap',
                    height: '100%' 
                }}
            >
                <Box sx={{ 
                    p: 2, borderBottom: '1px solid', borderColor: 'divider',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <Typography level="title-md" textTransform="uppercase" letterSpacing="1px">{activeCategory}</Typography>
                    <IconButton size="sm" variant="plain" color="neutral" onClick={() => {
                        // When manually closing via Chevron, we don't clear activeCategory
                        // We just toggle a local "hidden" state or rely on the showPanel logic
                        // Re-evaluating: To keep the rail icon selected, we need activeCategory to persist.
                        // But we want the panel to close.
                        // Solution: Use a separate "expanded" state for the panel.
                        setActiveCategory(null); // Simple way for now, Rail will re-sync from path
                    }}><ChevronLeft /></IconButton>
                </Box>
                
                <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                    {activeCategory === 'account' && (
                        <>
                            <ListItem sx={{ px: 2, py: 1.5 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar 
                                        size="lg" 
                                        sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark) }}
                                        onClick={() => setEmojiPickerOpen(true)}
                                    >
                                        {user?.avatar || user?.first_name?.[0]}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography level="title-sm" noWrap>{user?.first_name} {user?.last_name}</Typography>
                                        <Typography level="body-xs" noWrap>{user?.email}</Typography>
                                    </Box>
                                </Stack>
                            </ListItem>
                            <Divider sx={{ my: 1 }} />
                            <ListItem>
                                <ListItemButton onClick={() => { navigate('profile'); setActiveCategory(null); if (isMobile && onClose) onClose(); }}>
                                    <ListItemDecorator><Edit /></ListItemDecorator>
                                    <ListItemContent>Edit Profile</ListItemContent>
                                </ListItemButton>
                            </ListItem>
                            <Divider sx={{ my: 1 }} />
                            <ListItem>
                                <ListItemButton 
                                    onClick={() => { onLogout(); if (isMobile && onClose) onClose(); }} 
                                    variant="solid"
                                    color="danger"
                                    sx={{ borderRadius: 'sm', mx: 0.5 }}
                                >
                                    <ListItemDecorator><Logout sx={{ color: 'inherit' }} /></ListItemDecorator>
                                    <ListItemContent>Logout</ListItemContent>
                                </ListItemButton>
                            </ListItem>
                        </>
                    )}
                    {activeCategory === 'people' && (
                        <>
                            <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>MEMBERS</Typography></ListItem>
                            {members.filter(m => m.type !== 'pet').map(m => <SubItem key={m.id} label={m.name} to={`people/${m.id}`} emoji={m.emoji} />)}
                            <Divider sx={{ my: 1 }} /><SubItem label="Add New Person" to="people/new" />
                        </>
                    )}
                    {activeCategory === 'pets' && (
                        <>
                            <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>PETS</Typography></ListItem>
                            {members.filter(m => m.type === 'pet').map(m => <SubItem key={m.id} label={m.name} to={`pets/${m.id}`} emoji={m.emoji} />)}
                            <Divider sx={{ my: 1 }} /><SubItem label="Add New Pet" to="pets/new" />
                        </>
                    )}
                    {activeCategory === 'house' && (
                        <>
                            <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>PROPERTIES</Typography></ListItem>
                            <SubItem label={household?.name || 'Main House'} to={`house/${household?.id || 1}`} emoji={household?.avatar || '🏠'} />
                        </>
                    )}
                    {activeCategory === 'vehicles' && (
                        <>
                            <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>FLEET</Typography></ListItem>
                            {vehicles.map(v => <SubItem key={v.id} label={`${v.make} ${v.model}`} to={`vehicles/${v.id}`} emoji={v.emoji} />)}
                            <Divider sx={{ my: 1 }} /><SubItem label="Add New Vehicle" to="vehicles/new" />
                        </>
                    )}
                    {activeCategory === 'settings' && (
                        <>
                        <SubItem label="General" to="settings" />
                        <ListItem><Typography level="body-xs" sx={{ p: 1 }}>Theme</Typography></ListItem>
                        <ListItem>
                            <Button variant="soft" color="neutral" fullWidth onClick={() => onModeChange(isDark ? 'light' : 'dark')}>
                                    {isDark ? 'Switch to Light' : 'Switch to Dark'}
                                </Button>
                        </ListItem>
                        <ListItem sx={{ mt: 1 }}>
                            <Button 
                                    variant={useDracula ? 'solid' : 'outlined'} 
                                    color="danger" 
                                    fullWidth 
                                    onClick={() => onDraculaChange && onDraculaChange(!useDracula)}
                                >
                                    {useDracula ? 'Disable Dracula' : 'Enable Dracula'}
                                </Button>
                        </ListItem>
                        </>
                    )}
                </List>
            </Sheet>
        )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', zIndex: 2500, position: 'relative' }}>
        {sidebarContent}
        <EmojiPicker 
            open={emojiPickerOpen} 
            onClose={() => setEmojiPickerOpen(false)} 
            onEmojiSelect={(emoji) => { 
                onUpdateProfile({ avatar: emoji }); 
                setEmojiPickerOpen(false); 
            }} 
            title="Select Avatar Emoji" 
            isDark={isDark} 
        />
    </Box>
  );
}
