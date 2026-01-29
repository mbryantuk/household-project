import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Tooltip
} from '@mui/joy';
import {
  Event, Groups, Pets, Inventory2, RestaurantMenu, AccountBalance,
  Close, KeyboardArrowRight, KeyboardArrowUp, KeyboardArrowDown,
  PersonAdd, ChildCare, PushPin, PushPinOutlined, HomeWork
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import EmojiPicker from './EmojiPicker';

// Layout Constants
const RAIL_WIDTH = 64; 
const PANEL_WIDTH = 240;

const RailIcon = ({ icon, label, category, to, hasSubItems, onClick, location, activeCategory, hoveredCategory, onHover, handleNav, isMobile }) => {
    const pathMatches = to && location.pathname.includes(to);
    const categoryMatches = activeCategory === category;
    const isHovered = hoveredCategory === category;
    const isActive = pathMatches || categoryMatches || isHovered;
    
    const handleClick = () => {
        if (onClick) onClick();
        else handleNav(to, category, hasSubItems);
    };

    const handleMouseEnter = () => {
        if (!isMobile) {
            onHover(category);
        }
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
                  onMouseEnter={handleMouseEnter}
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

const SubItem = ({ label, to, emoji, onClick, isDark }) => (
    <ListItem>
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
    members = [], vehicles = [], isDark, household, onUpdateProfile,
    isMobile = false, onClose
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [isPinned, setIsPinned] = useState(localStorage.getItem('nav_pinned') === 'true');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  
  const sidebarRef = useRef(null);
  const scrollRef = useRef(null);

  // Global Click-Outside Handler
  useEffect(() => {
    if (isMobile) return;
    
    const handleClickOutside = (event) => {
        if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
            if (!isPinned) {
                setHoveredCategory(null);
            }
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned, isMobile]);

  const togglePin = () => {
      const newVal = !isPinned;
      setIsPinned(newVal);
      localStorage.setItem('nav_pinned', String(newVal));
  };

  const enabledModules = useMemo(() => {
      try {
          return household?.enabled_modules ? JSON.parse(household.enabled_modules) : ['pets', 'vehicles', 'meals'];
      } catch { return ['pets', 'vehicles', 'meals']; }
  }, [household]);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setCanScrollUp(scrollTop > 10);
        setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 500); 
    window.addEventListener('resize', checkScroll);
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkScroll);
    };
  }, [members, vehicles, checkScroll]);

  const getCategoryFromPath = useCallback((path) => {
      if (path.includes('/people')) return 'household';
      if (path.includes('/pets')) return 'household';
      if (path.includes('/vehicles')) return 'household';
      if (path.includes('/house/') || path.endsWith('/house')) return 'household';
      if (path.includes('/settings')) return 'assets';
      if (path.includes('/profile')) return 'account';
      if (path.includes('/dashboard')) return 'dashboard';
      if (path.includes('/calendar')) return 'calendar';
      if (path.includes('/meals')) return 'meals';
      if (path.includes('/finance')) return 'finance';
      return null;
  }, []);

  useEffect(() => {
      Promise.resolve().then(() => setActiveCategory(getCategoryFromPath(location.pathname)));
  }, [location.pathname, getCategoryFromPath]);

  const handleNav = (to, category, hasSubItems) => {
      if (to) {
          navigate(to);
          setHoveredCategory(null);
          if (!hasSubItems && isMobile && onClose) onClose();
      }
      if (!hasSubItems) {
          setHoveredCategory(null);
      }
      setActiveCategory(category);
  };

  const handleSubItemClick = () => {
      setHoveredCategory(null);
      if (isMobile && onClose) onClose();
  };

  const currentPanelCategory = (hoveredCategory || (isPinned ? activeCategory : null));
  const showPanel = currentPanelCategory && ['household', 'finance'].includes(currentPanelCategory);

  const sidebarContent = (
    <Box 
        ref={sidebarRef}
        onMouseLeave={() => !isMobile && setHoveredCategory(null)}
        sx={{ display: 'flex', height: '100dvh', width: '100%', position: 'relative' }}
    >
        <Sheet
            sx={{
                width: isMobile ? '100%' : RAIL_WIDTH,
                borderRight: isMobile ? 'none' : '1px solid',
                borderColor: 'divider',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                pt: 1.5, pb: 0, bgcolor: 'background.surface', zIndex: 2600, 
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
                    <Tooltip title="Switch Household" variant="soft" placement="right">
                        <Avatar 
                            variant="soft" color="primary" size="lg"
                            onClick={() => { navigate('/select-household'); setHoveredCategory(null); }}
                            sx={{ 
                                bgcolor: getEmojiColor(household?.avatar || '🏠', isDark),
                                fontSize: '1.5rem', fontWeight: 'bold', boxShadow: 'sm', cursor: 'pointer',
                                transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' }
                            }}
                        >
                            {household?.avatar || '🏠'}
                        </Avatar>
                    </Tooltip>
                </Box>
                
                <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0, mb: 1 }}>
                    <RailIcon icon={<Event />} label="Calendar" category="calendar" to="calendar" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
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
                        width: '100%', flexGrow: 1, overflowY: 'auto',
                        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }
                    }}
                >
                    <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0 }}>
                        <RailIcon icon={<HomeWork />} label="Household" category="household" hasSubItems to="house" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                        <RailIcon icon={<AccountBalance />} label="Finance" category="finance" hasSubItems to="finance" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                        {enabledModules.includes('meals') && (
                            <RailIcon icon={<RestaurantMenu />} label="Meals" category="meals" to="meals" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
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

        {showPanel && (
            <Sheet
                sx={{
                    width: PANEL_WIDTH,
                    position: (isMobile || !isPinned) ? 'absolute' : 'relative',
                    left: (isMobile || !isPinned) ? RAIL_WIDTH : 'auto', 
                    top: 0,
                    zIndex: (isMobile || !isPinned) ? 3000 : 2100,
                    borderRight: '1px solid',
                    borderColor: 'divider', overflow: 'hidden',
                    transition: isMobile ? 'none' : 'width 0.2s, left 0.2s, transform 0.2s, opacity 0.2s',
                    display: 'flex', flexDirection: 'column',
                    bgcolor: 'background.surface', whiteSpace: 'nowrap', height: '100dvh',
                    boxShadow: (!isPinned && !isMobile) ? '8px 0 24px rgba(0,0,0,0.15)' : 'none',
                    opacity: 1,
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level="title-md" textTransform="uppercase" letterSpacing="1px">{currentPanelCategory}</Typography>
                    <IconButton size="sm" variant={isPinned ? "solid" : "plain"} color={isPinned ? "primary" : "neutral"} onClick={togglePin}>
                        {isPinned ? <PushPin /> : <PushPinOutlined />}
                    </IconButton>
                </Box>
                
                <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                    {currentPanelCategory === 'household' && (
                        <>
                            <GroupHeader label="Overview" />
                            <SubItem label="Dashboard" to="house" emoji="🏠" isDark={isDark} onClick={handleSubItemClick} />
                            <Divider sx={{ my: 1 }} />
                            <GroupHeader label="Residents" />
                            {members.filter(m => m.type !== 'pet').map(m => <SubItem key={m.id} label={m.alias || (m.name || '').split(' ')[0]} to={`people/${m.id}`} emoji={m.emoji} isDark={isDark} onClick={handleSubItemClick} />)}
                            {enabledModules.includes('pets') && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    <GroupHeader label="Pets" />
                                    {members.filter(m => m.type === 'pet').map(m => <SubItem key={m.id} label={m.name} to={`pets/${m.id}`} emoji={m.emoji} isDark={isDark} onClick={handleSubItemClick} />)}
                                </>
                            )}
                            <Divider sx={{ my: 1 }} />
                            <GroupHeader label="Fleet" />
                            {vehicles.map(v => <SubItem key={v.id} label={`${v.make} ${v.model}`} to={`vehicles/${v.id}`} emoji={v.emoji} isDark={isDark} onClick={handleSubItemClick} />)}
                        </>
                    )}
                    {currentPanelCategory === 'finance' && (
                        <>
                            <GroupHeader label="Overview" /><SubItem label="Budget" to="finance?tab=budget" emoji="📊" isDark={isDark} onClick={handleSubItemClick} />
                            <Divider sx={{ my: 1 }} /><GroupHeader label="Accounts" />
                            <SubItem label="Income" to="finance?tab=income" emoji="💰" isDark={isDark} onClick={handleSubItemClick} />
                            <SubItem label="Banking" to="finance?tab=banking" emoji="🏦" isDark={isDark} onClick={handleSubItemClick} />
                            <SubItem label="Savings" to="finance?tab=savings" emoji="🐷" isDark={isDark} onClick={handleSubItemClick} />
                            <SubItem label="Investments" to="finance?tab=invest" emoji="📈" isDark={isDark} onClick={handleSubItemClick} />
                            <SubItem label="Pensions" to="finance?tab=pensions" emoji="👴" isDark={isDark} onClick={handleSubItemClick} />
                            <Divider sx={{ my: 1 }} /><GroupHeader label="Liabilities" />
                            <SubItem label="Credit Cards" to="finance?tab=credit" emoji="💳" isDark={isDark} onClick={handleSubItemClick} />
                            <SubItem label="Loans" to="finance?tab=loans" emoji="📝" isDark={isDark} onClick={handleSubItemClick} />
                            <SubItem label="Car Finance" to="finance?tab=car" emoji="🚗" isDark={isDark} onClick={handleSubItemClick} />
                            <SubItem label="Mortgages" to="finance?tab=mortgage" emoji="🏠" isDark={isDark} onClick={handleSubItemClick} />
                        </>
                    )}
                </List>
            </Sheet>
        )}
    </Box>
  );

  return (
    <Box sx={{ 
        display: isMobile ? 'flex' : { xs: 'none', md: 'flex' },
        height: '100dvh', zIndex: 2500, position: 'relative', overflow: 'visible',
        width: isMobile ? '100%' : (isPinned && showPanel ? (RAIL_WIDTH + PANEL_WIDTH) : RAIL_WIDTH),
        transition: 'width 0.2s', flexShrink: 0
    }}>
        {sidebarContent}
        <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(emoji) => { onUpdateProfile({ avatar: emoji }); setEmojiPickerOpen(false); }} title="Select Avatar Emoji" isDark={isDark} />
    </Box>
  );
}