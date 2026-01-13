import React, { useState, useEffect } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Stack, Tooltip, Button, Badge
} from '@mui/joy';
import { 
  Settings, Home as HomeIcon, Event, 
  Groups, Pets, HomeWork, DirectionsCar, 
  Logout, Edit, KeyboardArrowRight, ChevronLeft, Download, Close, SwapHoriz,
  Delete
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import EmojiPicker from './EmojiPicker';
import TotemIcon from './TotemIcon';

// Layout Constants
const RAIL_WIDTH = 64; 
const PANEL_WIDTH = 240;

export default function NavSidebar({ 
    members = [], vehicles = [], households = [], isDark, household, user, 
    onLogout, onUpdateProfile, onModeChange, onInstall, canInstall,
    useDracula, onDraculaChange, isMobile = false, onClose, confirmAction, api, showNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

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

  const handleNav = (to, category, hasSubItems) => {
      if (to) {
          navigate(to);
          if (!hasSubItems && isMobile && onClose) onClose();
      }
      setActiveCategory(category);
  };

  const handleDeleteHousehold = (hh) => {
    confirmAction(
        "Delete Household",
        `Are you sure you want to delete '${hh.name}'? This will permanently remove all data, members, and settings. This cannot be undone.`,
        async () => {
            try {
                await api.delete(`/households/${hh.id}`);
                showNotification(`Household '${hh.name}' deleted.`, "success");
                window.location.href = '/select-household';
            } catch (err) {
                showNotification("Failed to delete household. Ensure you are an admin.", "danger");
            }
        }
    );
  };

  const RailIcon = ({ icon, label, category, to, hasSubItems, badge, onClick }) => {
      const pathMatches = to && location.pathname.includes(to);
      const categoryMatches = activeCategory === category;
      const isActive = pathMatches || categoryMatches;
      
      const handleClick = () => {
          if (onClick) onClick();
          else handleNav(to, category, hasSubItems);
      };

      if (isMobile) {
          return (
            <ListItem sx={{ px: 0 }}>
                <ListItemButton 
                    selected={isActive}
                    onClick={handleClick}
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
                    <ListItemDecorator>{icon}</ListItemDecorator>
                    <ListItemContent>{label}</ListItemContent>
                    {hasSubItems && <KeyboardArrowRight />}
                </ListItemButton>
            </ListItem>
          );
      }

      return (
            <ListItem sx={{ p: 0 }}>
                <ListItemButton 
                    selected={isActive}
                    onClick={handleClick}
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

  const SubItem = ({ label, to, emoji, onClick, endAction }) => (
      <ListItem endAction={endAction}>
          <ListItemButton 
            component={to ? NavLink : 'div'} 
            to={to} 
            onClick={onClick}
            sx={{ borderRadius: 'sm' }}
          >
              <ListItemDecorator>
                {emoji ? (
                    <Avatar size="sm" sx={{ '--Avatar-size': '24px', fontSize: '1rem', bgcolor: getEmojiColor(emoji, isDark) }}>{emoji}</Avatar>
                ) : <KeyboardArrowRight />}
              </ListItemDecorator>
              <ListItemContent>{label}</ListItemContent>
          </ListItemButton>
      </ListItem>
  );

  const showPanel = activeCategory && ['people', 'pets', 'house', 'vehicles', 'settings', 'account', 'switch'].includes(activeCategory);

  const sidebarContent = (
    <Box sx={{ display: 'flex', height: '100dvh' }}>
        <Sheet
            sx={{
                width: isMobile ? '100%' : RAIL_WIDTH,
                borderRight: isMobile ? 'none' : '1px solid',
                borderColor: 'divider',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                pt: 1.5, pb: 0, bgcolor: 'background.surface', zIndex: 2500, 
                height: '100dvh', overflowY: 'hidden', position: 'relative'
            }}
        >
            <Box sx={{ width: '100%' }}>
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
                    {canInstall && (
                        <RailIcon icon={<Download />} label="Install" onClick={onInstall} />
                    )}
                    {households.length > 1 && (
                        <RailIcon icon={<SwapHoriz />} label="Switch" category="switch" hasSubItems />
                    )}
                    <RailIcon icon={<Settings />} label="Settings" category="settings" to="settings" hasSubItems />
                </List>
            </Box>

            {/* Absolute Bottom Anchoring */}
            <Box sx={{ width: '100%', p: 0, m: 0 }}>
                <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '0px', width: '100%', px: isMobile ? 1 : 0, p: 0, m: 0 }}>
                    <RailIcon 
                        icon={<Avatar size="sm" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark), width: 22, height: 22, fontSize: '0.75rem' }}>{user?.avatar || user?.first_name?.[0]}</Avatar>} 
                        label="Account" category="account" hasSubItems 
                    />
                </List>
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
                    bgcolor: 'background.level1', whiteSpace: 'nowrap', height: '100dvh' 
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level="title-md" textTransform="uppercase" letterSpacing="1px">{activeCategory}</Typography>
                    <IconButton size="sm" variant="plain" color="neutral" onClick={() => setActiveCategory(null)}><ChevronLeft /></IconButton>
                </Box>
                
                <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                    {activeCategory === 'switch' && (
                        <>
                            <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>SELECT HOUSEHOLD</Typography></ListItem>
                            {households.map(hh => (
                                <SubItem 
                                    key={hh.id} 
                                    label={hh.name} 
                                    emoji={hh.avatar || '🏠'} 
                                    onClick={() => { navigate(`/household/${hh.id}`); setActiveCategory(null); if (isMobile && onClose) onClose(); }}
                                    endAction={
                                        hh.role === 'admin' && hh.id !== household?.id ? (
                                            <IconButton size="sm" color="danger" variant="plain" onClick={() => handleDeleteHousehold(hh)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        ) : null
                                    }
                                />
                            ))}
                        </>
                    )}
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
    <Box sx={{ display: 'flex', height: '100dvh', zIndex: 2500, position: 'relative', overflow: 'hidden' }}>
        {sidebarContent}
        <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(emoji) => { onUpdateProfile({ avatar: emoji }); setEmojiPickerOpen(false); }} title="Select Avatar Emoji" isDark={isDark} />
    </Box>
  );
}
