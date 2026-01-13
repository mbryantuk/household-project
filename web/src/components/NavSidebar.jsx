import React, { useState, useEffect } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Stack, Tooltip, Button, Badge
} from '@mui/joy';
import { 
  Settings, Home as HomeIcon, Event, 
  Groups, Pets, HomeWork, DirectionsCar, 
  Logout, Edit, KeyboardArrowRight, ChevronLeft, Download, Close, SwapHoriz
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import EmojiPicker from './EmojiPicker';
import TotemIcon from './TotemIcon';

// Layout Constants
const RAIL_WIDTH = 64; 
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

  const handleNav = (to, category, hasSubItems) => {
      if (to) {
          navigate(to);
          if (!hasSubItems && isMobile && onClose) onClose();
      }
      setActiveCategory(category);
  };

  const RailIcon = ({ icon, label, category, to, hasSubItems, badge }) => {
      const pathMatches = to && location.pathname.includes(to);
      const categoryMatches = activeCategory === category;
      const isActive = pathMatches || categoryMatches;
      
      const iconElement = (badge && isMobile) ? (
          <Box sx={{ position: 'relative', display: 'flex' }}>
              {icon}
              <Box sx={{ 
                  position: 'absolute', top: -2, right: -2, width: 8, height: 8, 
                  bgcolor: 'danger.solidBg', borderRadius: '50%', 
                  border: '1px solid', borderColor: 'background.surface' 
              }} />
          </Box>
      ) : icon;

      if (isMobile) {
          return (
            <ListItem>
                <ListItemButton 
                    selected={isActive}
                    onClick={() => handleNav(to, category, hasSubItems)}
                    sx={{ 
                        borderRadius: 'sm', gap: 2,
                        '&.Mui-selected': { 
                            bgcolor: 'background.level1', 
                            color: 'primary.plainColor',
                            fontWeight: 'bold',
                            borderLeft: '4px solid',
                            borderColor: 'primary.solidBg'
                        }
                    }}
                >
                    <ListItemDecorator>
                        {iconElement}
                    </ListItemDecorator>
                    <ListItemContent>{label}</ListItemContent>
                    {hasSubItems && <KeyboardArrowRight />}
                </ListItemButton>
            </ListItem>
          );
      }

      return (
            <ListItem>
                <ListItemButton 
                    selected={isActive}
                    onClick={() => handleNav(to, category, hasSubItems)}
                    sx={{ 
                        borderRadius: 'md', justifyContent: 'center', px: 0, 
                        flexDirection: 'column', gap: 0.5, py: 1, width: 56, 
                        mx: 'auto', minHeight: 60,
                        '&.Mui-selected': { bgcolor: 'background.level1', color: 'primary.plainColor' }
                    }}
                >
                    <ListItemDecorator sx={{ display: 'flex', justifyContent: 'center', m: 0, '& svg': { fontSize: '1.4rem' } }}>
                        {icon}
                    </ListItemDecorator>
                    <Typography level="body-xs" sx={{ fontSize: '10px', fontWeight: isActive ? '600' : '500', color: isActive ? 'primary.plainColor' : 'neutral.plainColor', textAlign: 'center' }}>{label}</Typography>
                </ListItemButton>
            </ListItem>
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

  const showPanel = activeCategory && ['people', 'pets', 'house', 'vehicles', 'settings', 'account'].includes(activeCategory);

  const sidebarContent = (
    <Box sx={{ display: 'flex', height: '100%' }}>
        <Sheet
            sx={{
                width: isMobile ? '100%' : RAIL_WIDTH,
                borderRight: isMobile ? 'none' : '1px solid',
                borderColor: 'divider',
                display: 'flex', flexDirection: 'column',
                alignItems: isMobile ? 'stretch' : 'center',
                py: 1.5, bgcolor: 'background.surface', zIndex: 2500, height: '100%' 
            }}
        >
            {isMobile && (
                <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography level="title-lg" sx={{ fontWeight: 'bold' }}>Menu</Typography>
                    <IconButton variant="plain" color="neutral" onClick={onClose}><Close /></IconButton>
                </Box>
            )}

            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
                <Avatar 
                    variant="soft" 
                    color="primary" 
                    size="lg"
                    sx={{ 
                        bgcolor: getEmojiColor(household?.avatar || '🏠', isDark),
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        boxShadow: 'sm'
                    }}
                >
                    {household?.avatar || '🏠'}
                </Avatar>
            </Box>

            <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0 }}>
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
                    icon={<Avatar size="sm" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark), width: 22, height: 22, fontSize: '0.75rem' }}>{user?.avatar || user?.first_name?.[0]}</Avatar>} 
                    label="Account" category="account" hasSubItems 
                />
            </List>

            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ pb: 2, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', width: '100%' }}>
                {canInstall && (
                    <RailIcon icon={<Download />} label="Install" onClick={onInstall} />
                )}
                <RailIcon icon={<SwapHoriz />} label="Switch" onClick={() => navigate('/select-household')} />
            </Box>
        </Sheet>

        {(showPanel || (isMobile && activeCategory)) && (
            <Sheet
                sx={{
                    width: isMobile ? '100%' : (showPanel ? PANEL_WIDTH : 0),
                    position: isMobile ? 'absolute' : 'relative',
                    left: isMobile ? 0 : 'auto', top: 0,
                    zIndex: isMobile ? 2600 : 2100,
                    borderRight: (showPanel && !isMobile) ? '1px solid' : 'none',
                    borderColor: 'divider', overflow: 'hidden',
                    transition: isMobile ? 'none' : 'width 0.2s',
                    display: 'flex', flexDirection: 'column',
                    bgcolor: 'background.level1', whiteSpace: 'nowrap', height: '100%' 
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level="title-md" textTransform="uppercase" letterSpacing="1px">{activeCategory}</Typography>
                    <IconButton size="sm" variant="plain" color="neutral" onClick={() => setActiveCategory(null)}><ChevronLeft /></IconButton>
                </Box>
                
                <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                    {activeCategory === 'account' && (
                        <>
                            <ListItem sx={{ px: 2, py: 1.5 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Avatar size="lg" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark) }} onClick={() => setEmojiPickerOpen(true)}>{user?.avatar || user?.first_name?.[0]}</Avatar>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography level="title-sm" noWrap>{user?.first_name} {user?.last_name}</Typography>
                                        <Typography level="body-xs" noWrap>{user?.email}</Typography>
                                    </Box>
                                </Stack>
                            </ListItem>
                            <Divider sx={{ my: 1 }} />
                            <ListItem><ListItemButton onClick={() => { navigate('profile'); setActiveCategory(null); if (isMobile && onClose) onClose(); }}><ListItemDecorator><Edit /></ListItemDecorator><ListItemContent>Edit Profile</ListItemContent></ListItemButton></ListItem>
                            <ListItem><ListItemButton onClick={() => { navigate('/select-household'); setActiveCategory(null); }}><ListItemDecorator><SwapHoriz /></ListItemDecorator><ListItemContent>Switch Household</ListItemContent></ListItemButton></ListItem>
                            <Divider sx={{ my: 1 }} />
                            <ListItem><ListItemButton onClick={() => { onLogout(); if (isMobile && onClose) onClose(); }} variant="solid" color="danger" sx={{ borderRadius: 'sm', mx: 0.5 }}><ListItemDecorator><Logout sx={{ color: 'inherit' }} /></ListItemDecorator><ListItemContent>Logout</ListItemContent></ListItemButton></ListItem>
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
                        <ListItem><Button variant="soft" color="neutral" fullWidth onClick={() => onModeChange(isDark ? 'light' : 'dark')}>{isDark ? 'Switch to Light' : 'Switch to Dark'}</Button></ListItem>
                        <ListItem sx={{ mt: 1 }}><Button variant={useDracula ? 'solid' : 'outlined'} color="danger" fullWidth onClick={() => onDraculaChange && onDraculaChange(!useDracula)}>{useDracula ? 'Disable Dracula' : 'Enable Dracula'}</Button></ListItem>
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
        <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(emoji) => { onUpdateProfile({ avatar: emoji }); setEmojiPickerOpen(false); }} title="Select Avatar Emoji" isDark={isDark} />
    </Box>
  );
}
