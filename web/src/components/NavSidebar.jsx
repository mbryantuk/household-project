import React, { useState, useEffect } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Stack, Button, ButtonGroup, Switch, Tooltip
} from '@mui/joy';
import {
  Settings, Home as HomeIcon, Event, 
  Groups, Pets, HomeWork, DirectionsCar, RestaurantMenu,
  Logout, Edit, KeyboardArrowRight, ChevronLeft, Download, Close, SwapHoriz,
  Delete, LightMode, DarkMode, SettingsBrightness, Contrast,
  KeyboardArrowUp, KeyboardArrowDown
} from '@mui/icons-material';import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getEmojiColor, THEMES } from '../theme';
import EmojiPicker from './EmojiPicker';

// Layout Constants
const RAIL_WIDTH = 64; 
const PANEL_WIDTH = 240;

const RailIcon = ({ icon, label, category, to, hasSubItems, onClick, location, activeCategory, handleNav, isMobile }) => {
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

const SubItem = ({ label, to, emoji, onClick, endAction, isDark }) => (
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

export default function NavSidebar({ 
    members = [], vehicles = [], households = [], isDark, household, user, 
    onLogout, onUpdateProfile, themeId, onThemeChange, onInstall, canInstall,
    isMobile = false, onClose, confirmAction, api, showNotification
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = React.useRef(null);

  const checkScroll = () => {
    if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setCanScrollUp(scrollTop > 10);
        setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 500); // Wait for potential layout shifts
    window.addEventListener('resize', checkScroll);
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkScroll);
    };
  }, [members, vehicles]);

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
            } catch {
                showNotification("Failed to delete household. Ensure you are an admin.", "danger");
            }
        }
    );
  };

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
            {/* Pinned Top */}
            <Box sx={{ width: '100%', flexShrink: 0 }}>
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
                
                <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0, mb: 1 }}>
                    <RailIcon icon={<HomeIcon />} label="Home" category="dashboard" to="dashboard" location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                    <RailIcon icon={<Event />} label="Events" category="calendar" to="calendar" location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                </List>
                <Divider sx={{ mb: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />
            </Box>

            {/* Scrollable Middle */}
            <Box sx={{ width: '100%', flexGrow: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {canScrollUp && !isMobile && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.surface', opacity: 0.8, pointerEvents: 'none' }}>
                        <KeyboardArrowUp sx={{ fontSize: '1rem', color: 'primary.plainColor' }} />
                    </Box>
                )}
                
                <Box 
                    ref={scrollRef}
                    onScroll={checkScroll}
                    sx={{ 
                        width: '100%', 
                        flexGrow: 1, 
                        overflowY: 'auto',
                        scrollbarWidth: 'none', // Firefox
                        '&::-webkit-scrollbar': { display: 'none' }, // Chrome/Safari
                        px: isMobile ? 0 : 0
                    }}
                >
                    <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0 }}>
                        <RailIcon icon={<Groups />} label="People" category="people" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                        <RailIcon icon={<Pets />} label="Pets" category="pets" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                        <RailIcon icon={<HomeWork />} label="House" category="house" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                        <RailIcon icon={<RestaurantMenu />} label="Meals" category="meals" to="meals" location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                        <RailIcon icon={<DirectionsCar />} label="Vehicles" category="vehicles" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                    </List>
                </Box>

                {canScrollDown && !isMobile && (
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.surface', opacity: 0.8, pointerEvents: 'none' }}>
                        <KeyboardArrowDown sx={{ fontSize: '1rem', color: 'primary.plainColor' }} />
                    </Box>
                )}
            </Box>

            {/* Pinned Bottom */}
            <Box sx={{ width: '100%', p: 0, m: 0, flexShrink: 0 }}>
                {/* Upper Separator */}
                <Divider sx={{ my: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />
                
                {/* Utilities Section */}
                <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0, p: 0, m: 0 }}>
                    {canInstall && (
                        <RailIcon icon={<Download />} label="Install" onClick={onInstall} location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                    )}
                    {households.length > 1 && (
                        <RailIcon icon={<SwapHoriz />} label="Switch" category="switch" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                    )}
                    <RailIcon icon={<Settings />} label="Settings" category="settings" to="settings" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                </List>

                {/* Lower Separator */}
                <Divider sx={{ my: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />

                {/* User Profile Section */}
                <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '0px', width: '100%', px: isMobile ? 1 : 0, p: 0, m: 0, pb: 0.5 }}>
                    <RailIcon 
                        icon={<Avatar size="sm" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark), width: 22, height: 22, fontSize: '0.75rem' }}>{user?.avatar || user?.first_name?.[0]}</Avatar>} 
                        label={user?.first_name || 'Account'} category="account" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile}
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
                                    isDark={isDark}
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
                            {members.filter(m => m.type !== 'pet').map(m => <SubItem key={m.id} label={m.name} to={`people/${m.id}`} emoji={m.emoji} isDark={isDark} />)}
                            <Divider sx={{ my: 1 }} /><SubItem label="Add New Person" to="people/new" isDark={isDark} />
                        </>
                    )}
                    {activeCategory === 'pets' && (
                        <>
                            <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>PETS</Typography></ListItem>
                            {members.filter(m => m.type === 'pet').map(m => <SubItem key={m.id} label={m.name} to={`pets/${m.id}`} emoji={m.emoji} isDark={isDark} />)}
                            <Divider sx={{ my: 1 }} /><SubItem label="Add New Pet" to="pets/new" isDark={isDark} />
                        </>
                    )}
                    {activeCategory === 'house' && (
                        <>
                            <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>PROPERTIES</Typography></ListItem>
                            <SubItem label={household?.name || 'Main House'} to={`house/${household?.id || 1}`} emoji={household?.avatar || '🏠'} isDark={isDark} />
                        </>
                    )}
                    {activeCategory === 'vehicles' && (
                        <>
                            <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>FLEET</Typography></ListItem>
                            {vehicles.map(v => <SubItem key={v.id} label={`${v.make} ${v.model}`} to={`vehicles/${v.id}`} emoji={v.emoji} isDark={isDark} />)}
                            <Divider sx={{ my: 1 }} /><SubItem label="Add New Vehicle" to="vehicles/new" isDark={isDark} />
                        </>
                    )}
                    {activeCategory === 'settings' && (
                        <SubItem label="General Settings" to="settings" isDark={isDark} />
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