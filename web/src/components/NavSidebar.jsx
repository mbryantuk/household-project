import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Tooltip, Menu, MenuItem
} from '@mui/joy';
import {
  Event, Groups, Pets, Inventory2, DirectionsCar, RestaurantMenu,
  Close, KeyboardArrowRight, ChevronLeft, KeyboardArrowUp, KeyboardArrowDown,
  VisibilityOff, PersonAdd, ChildCare, Add
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getEmojiColor } from '../theme';
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
                      '&.Mui-selected': { bgcolor: 'background.level1', color: 'var(--joy-palette-primary-plainColor)' }
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

const GroupHeader = ({ label }) => (
    <ListItem sx={{ mt: 1, mb: 0.5 }}>
        <Typography level="body-xs" fontWeight="bold" textTransform="uppercase" letterSpacing="1px" sx={{ px: 1, color: 'text.tertiary' }}>
            {label}
        </Typography>
    </ListItem>
);

export default function NavSidebar({ 
    members = [], vehicles = [], households = [], isDark, household, user, 
    onLogout, onUpdateProfile, themeId, onThemeChange, onInstall, canInstall,
    isMobile = false, onClose, confirmAction, api, showNotification, onUpdateHousehold
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  
  const scrollRef = React.useRef(null);

  // Enabled Modules
  const enabledModules = useMemo(() => {
      try {
          return household?.enabled_modules ? JSON.parse(household.enabled_modules) : ['pets', 'vehicles', 'meals'];
      } catch (e) {
          return ['pets', 'vehicles', 'meals'];
      }
  }, [household]);

  const checkScroll = () => {
    if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setCanScrollUp(scrollTop > 10);
        setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 500); 
    window.addEventListener('resize', checkScroll);
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkScroll);
    };
  }, [members, vehicles]);

  useEffect(() => {
      const path = location.pathname;
      if (path.includes('/people')) setActiveCategory('people');
      else if (path.includes('/pets')) setActiveCategory('people'); // Merge pets into people
      else if (path.includes('/vehicles')) setActiveCategory('assets'); // Merge vehicles into assets
      else if (path.includes('/house/') || path.endsWith('/house')) setActiveCategory('assets'); 
      else if (path.includes('/settings')) setActiveCategory('assets');
      else if (path.includes('/profile')) setActiveCategory('account');
      else if (path.includes('/dashboard')) setActiveCategory('dashboard');
      else if (path.includes('/calendar')) setActiveCategory('calendar');
      else if (path.includes('/meals')) setActiveCategory('meals');
  }, [location.pathname]);

  const handleNav = (to, category, hasSubItems) => {
      if (to) {
          navigate(to);
          if (!hasSubItems && isMobile && onClose) onClose();
      }
      setActiveCategory(category);
  };

  const showPanel = activeCategory && ['people', 'assets', 'vehicles'].includes(activeCategory);

  // Grouping Logic
  const groupedPets = useMemo(() => {
      const groups = {};
      members.filter(m => m.type === 'pet').forEach(p => {
          const species = p.species || 'Other';
          if (!groups[species]) groups[species] = [];
          groups[species].push(p);
      });
      return groups;
  }, [members]);

  const groupedVehicles = useMemo(() => {
      const groups = {};
      vehicles.forEach(v => {
          const type = v.type || 'Car';
          if (!groups[type]) groups[type] = [];
          groups[type].push(v);
      });
      return groups;
  }, [vehicles]);

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
            <Box sx={{ width: '100%', flexShrink: 0 }}>
                {isMobile && (
                    <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography level="title-lg" sx={{ fontWeight: 'bold' }}>Menu</Typography>
                        <IconButton variant="plain" color="neutral" onClick={onClose}><Close /></IconButton>
                    </Box>
                )}

                <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
                    <Tooltip title="Go to Dashboard" variant="soft" placement="right">
                        <Avatar 
                            variant="soft" 
                            color="primary" 
                            size="lg"
                            onClick={() => navigate('dashboard')}
                            sx={{ 
                                bgcolor: getEmojiColor(household?.avatar || '🏠', isDark),
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                boxShadow: 'sm',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'scale(1.1)' }
                            }}
                        >
                            {household?.avatar || '🏠'}
                        </Avatar>
                    </Tooltip>
                </Box>
                
                <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0, mb: 1 }}>
                    <RailIcon icon={<Event />} label="Calendar" category="calendar" to="calendar" location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                </List>
                <Divider sx={{ mb: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />
            </Box>

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
                        scrollbarWidth: 'none', 
                        '&::-webkit-scrollbar': { display: 'none' },
                        px: isMobile ? 0 : 0
                    }}
                >
                    <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0 }}>
                        <RailIcon icon={<Groups />} label="People" category="people" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                        
                        <RailIcon icon={<Inventory2 />} label="Assets" category="assets" hasSubItems location={location} activeCategory={activeCategory} handleNav={handleNav} isMobile={isMobile} />
                        
                        {enabledModules.includes('meals') && (
                            <RailIcon 
                                icon={<RestaurantMenu />} 
                                label="Meals" 
                                category="meals" 
                                to="meals" 
                                location={location} 
                                activeCategory={activeCategory} 
                                handleNav={handleNav} 
                                isMobile={isMobile} 
                            />
                        )}
                    </List>
                </Box>

                {canScrollDown && !isMobile && (
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.surface', opacity: 0.8, pointerEvents: 'none' }}>
                        <KeyboardArrowDown sx={{ fontSize: '1rem', color: 'primary.plainColor' }} />
                    </Box>
                )}
            </Box>

            <Box sx={{ width: '100%', p: 0, m: 0, flexShrink: 0, pb: 1 }} />
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
                    {activeCategory === 'people' && (
                        <>
                            <GroupHeader label="Adults" />
                            {members.filter(m => m.type !== 'pet' && m.type !== 'child').map(m => <SubItem key={m.id} label={m.alias || (m.name || '').split(' ')[0]} to={`people/${m.id}`} emoji={m.emoji} isDark={isDark} />)}
                            
                            <Divider sx={{ my: 1 }} />
                            <GroupHeader label="Children" />
                            {members.filter(m => m.type === 'child').map(m => <SubItem key={m.id} label={m.alias || (m.name || '').split(' ')[0]} to={`people/${m.id}`} emoji={m.emoji} isDark={isDark} />)}

                            {enabledModules.includes('pets') && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    {Object.entries(groupedPets).map(([species, pets]) => (
                                        <React.Fragment key={species}>
                                            <GroupHeader label={species} />
                                            {pets.map(m => <SubItem key={m.id} label={m.name} to={`pets/${m.id}`} emoji={m.emoji} isDark={isDark} />)}
                                        </React.Fragment>
                                    ))}
                                    {Object.keys(groupedPets).length === 0 && <Typography level="body-xs" sx={{ p: 2, color: 'neutral.outlinedColor' }}>No pets found.</Typography>}
                                </>
                            )}
                            
                            <Divider sx={{ my: 1 }} />
                            <Typography level="body-xs" fontWeight="bold" sx={{ px: 2, pt: 1, color: 'neutral.plainColor' }}>ADD NEW</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, p: 1 }}>
                                <Tooltip title="Add Adult" variant="soft">
                                    <IconButton variant="soft" color="neutral" onClick={() => navigate('people/new?type=adult')} sx={{ borderRadius: 'sm' }}>
                                        <PersonAdd />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Add Child" variant="soft">
                                    <IconButton variant="soft" color="neutral" onClick={() => navigate('people/new?type=child')} sx={{ borderRadius: 'sm' }}>
                                        <ChildCare />
                                    </IconButton>
                                </Tooltip>
                                {enabledModules.includes('pets') && (
                                    <Tooltip title="Add Pet" variant="soft">
                                        <IconButton variant="soft" color="neutral" onClick={() => navigate('pets/new')} sx={{ borderRadius: 'sm', gridColumn: 'span 2' }}>
                                            <Pets />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        </>
                    )}
                    {activeCategory === 'assets' && (
                        <>
                            <GroupHeader label="Properties" />
                            <SubItem label={household?.name || 'Main House'} to="house/1" emoji={household?.avatar || '🏠'} isDark={isDark} />
                            
                            {enabledModules.includes('vehicles') && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    {Object.entries(groupedVehicles).map(([type, list]) => (
                                        <React.Fragment key={type}>
                                            <GroupHeader label={type} />
                                            {list.map(v => <SubItem key={v.id} label={`${v.make} ${v.model}`} to={`vehicles/${v.id}`} emoji={v.emoji} isDark={isDark} />)}
                                        </React.Fragment>
                                    ))}
                                    {Object.keys(groupedVehicles).length === 0 && <Typography level="body-xs" sx={{ p: 2, color: 'neutral.outlinedColor' }}>No vehicles found.</Typography>}
                                    <Divider sx={{ my: 1 }} /><SubItem label="Add New Vehicle" to="vehicles/new" isDark={isDark} />
                                </>
                            )}
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
