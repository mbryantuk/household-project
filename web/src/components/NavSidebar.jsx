import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Tooltip, Menu, MenuItem
} from '@mui/joy';
import Event from '@mui/icons-material/Event';
import Groups from '@mui/icons-material/Groups';
import Pets from '@mui/icons-material/Pets';
import Inventory2 from '@mui/icons-material/Inventory2';
import RestaurantMenu from '@mui/icons-material/RestaurantMenu';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Close from '@mui/icons-material/Close';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import PushPin from '@mui/icons-material/PushPin';
import PushPinOutlined from '@mui/icons-material/PushPinOutlined';
import HomeWork from '@mui/icons-material/HomeWork';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import DownloadIcon from '@mui/icons-material/Download';
import HomeIcon from '@mui/icons-material/Home';

import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import EmojiPicker from './EmojiPicker';
import { useHousehold } from '../contexts/HouseholdContext';

const RAIL_WIDTH = 64; 
const PANEL_WIDTH = 240;

const RailIcon = ({ icon, label, category, to, hasSubItems, onClick, location, activeCategory, hoveredCategory, onHover, handleNav, isMobile, isPinned }) => {
    const pathMatches = to && location.pathname.includes(to);
    const categoryMatches = activeCategory === category;
    const isHovered = hoveredCategory === category;
    const isActive = pathMatches || categoryMatches || isHovered;
    
    const handleClick = () => {
        if (onClick) onClick();
        else handleNav(to, category, hasSubItems);
    };

    const handleMouseEnter = () => {
        if (!isMobile) onHover(category);
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
    isMobile = false, onClose, installPrompt, onInstall
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    household, members, vehicles, user, isDark, 
    onUpdateProfile, onLogout, confirmAction 
  } = useHousehold();
  
  const [activeCategory, setActiveCategory] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [isPinned, setIsPinned] = useState(localStorage.getItem('nav_pinned') === 'true');
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (isMobile) return;
    const handleClickOutside = (event) => {
        if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
            setHoveredCategory(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

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

  const getCategoryFromPath = useCallback((path) => {
      if (path.includes('/people') || path.includes('/pets') || path.includes('/vehicles') || path.includes('/house')) return 'household';
      if (path.includes('/finance')) return 'finance';
      if (path.includes('/calendar')) return 'calendar';
      if (path.includes('/meals')) return 'meals';
      if (path.includes('/dashboard')) return 'dashboard';
      return null;
  }, []);

  useEffect(() => {
      setActiveCategory(getCategoryFromPath(location.pathname));
  }, [location.pathname, getCategoryFromPath]);

  const handleNav = (to, category, hasSubItems) => {
      if (to) {
          navigate(to);
          setHoveredCategory(null);
          if (!hasSubItems && isMobile && onClose) onClose();
      }
      if (!hasSubItems) setHoveredCategory(null);
      setActiveCategory(category);
  };

  const handleSubItemClick = () => {
      setHoveredCategory(null);
      if (isMobile && onClose) onClose();
  };

  const currentPanelCategory = (hoveredCategory || (isPinned ? activeCategory : null));
  const showPanel = currentPanelCategory && ['household', 'finance'].includes(currentPanelCategory);

  return (
    <Box 
        ref={sidebarRef}
        sx={{ 
            display: isMobile ? 'flex' : { xs: 'none', md: 'flex' },
            height: '100dvh', zIndex: 2500, position: 'relative',
            width: isMobile ? '100%' : (isPinned && showPanel ? (RAIL_WIDTH + PANEL_WIDTH) : RAIL_WIDTH),
            transition: 'width 0.2s', flexShrink: 0
        }}
    >
        {/* RAIL SECTION */}
        <Sheet
            sx={{
                width: isMobile ? '100%' : RAIL_WIDTH,
                borderRight: isMobile ? 'none' : '1px solid',
                borderColor: 'rgba(0,0,0,0.08)',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                pt: 1.5, pb: 1.5, 
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                zIndex: 2600, height: '100dvh',
                [theme => theme.getColorSchemeSelector('dark')]: {
                    bgcolor: 'rgba(19, 19, 24, 0.8)',
                    borderColor: 'rgba(255,255,255,0.1)',
                }
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
                                fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer',
                                transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' }
                            }}
                        >
                            {household?.avatar || '🏠'}
                        </Avatar>
                    </Tooltip>
                </Box>
                
                <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0 }}>
                    <RailIcon icon={<HomeWork />} label="Dashboard" category="dashboard" to="dashboard" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} isPinned={isPinned} />
                    <RailIcon icon={<HomeIcon />} label="House" category="household" hasSubItems to="house" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} isPinned={isPinned} />
                    <RailIcon icon={<Event />} label="Calendar" category="calendar" to="calendar" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} isPinned={isPinned} />
                </List>
                <Divider sx={{ my: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />
            </Box>

            <Box sx={{ width: '100%', flexGrow: 1, overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0 }}>
                    <RailIcon icon={<AccountBalance />} label="Finance" category="finance" hasSubItems to="finance" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} isPinned={isPinned} />
                    {enabledModules.includes('meals') && (
                        <RailIcon icon={<RestaurantMenu />} label="Meals" category="meals" to="meals" location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} isPinned={isPinned} />
                    )}
                </List>
            </Box>

            {/* FOOTER SECTION */}
            <Box sx={{ width: '100%', mt: 'auto', pt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: '100%', px: 1.5 }}><Divider sx={{ mb: 1 }} /></Box>
                
                {installPrompt && (
                    <Tooltip title="Install App" variant="soft" placement="right">
                        <IconButton variant="soft" color="success" onClick={onInstall} size="sm">
                            <DownloadIcon />
                        </IconButton>
                    </Tooltip>
                )}

                <Tooltip title="Account & Settings" variant="soft" placement="right">
                    <IconButton 
                        variant="plain" 
                        color="neutral" 
                        onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                        sx={{ p: 0.5, borderRadius: '50%' }}
                    >
                        <Avatar 
                            size="sm" 
                            sx={{ 
                                bgcolor: getEmojiColor(user?.avatar || '👤', isDark),
                                width: 32, height: 32, fontSize: '1rem'
                            }}
                        >
                            {user?.avatar || user?.first_name?.[0]}
                        </Avatar>
                    </IconButton>
                </Tooltip>

                <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={() => setUserMenuAnchor(null)}
                    placement="right-end"
                    sx={{ minWidth: 200, borderRadius: 'md', boxShadow: 'md' }}
                >
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography level="title-sm">{user?.first_name} {user?.last_name}</Typography>
                        <Typography level="body-xs" color="neutral">{user?.email}</Typography>
                    </Box>
                    <Divider />
                    <MenuItem onClick={() => { navigate('settings'); setUserMenuAnchor(null); }}>
                        <ListItemDecorator><SettingsIcon /></ListItemDecorator>
                        Settings
                    </MenuItem>
                    <MenuItem onClick={() => { 
                        setUserMenuAnchor(null);
                        confirmAction("Log Out", "Are you sure you want to log out?", onLogout);
                    }}>
                        <ListItemDecorator><LogoutIcon color="danger" /></ListItemDecorator>
                        Log Out
                    </MenuItem>
                </Menu>
            </Box>
        </Sheet>

        {/* SUB-PANEL */}
        {showPanel && (
            <Sheet
                sx={{
                    width: PANEL_WIDTH,
                    position: (isMobile || !isPinned) ? 'absolute' : 'relative',
                    left: (isMobile || !isPinned) ? RAIL_WIDTH : 'auto', 
                    top: 0, zIndex: 2100, borderRight: '1px solid',
                    borderColor: 'rgba(0,0,0,0.08)',
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    height: '100dvh', display: 'flex', flexDirection: 'column',
                    boxShadow: (!isPinned && !isMobile) ? '8px 0 24px rgba(0,0,0,0.15)' : 'none',
                    [theme => theme.getColorSchemeSelector('dark')]: {
                        bgcolor: 'rgba(19, 19, 24, 0.8)',
                        borderColor: 'rgba(255,255,255,0.1)',
                    }
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
                            <SubItem label="House Hub" to="house" emoji="🏠" isDark={isDark} onClick={handleSubItemClick} />
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
}