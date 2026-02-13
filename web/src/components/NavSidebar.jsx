import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Tooltip, Menu, MenuItem, Accordion, AccordionSummary, AccordionDetails, Modal, ModalDialog, DialogTitle, DialogContent, FormControl, FormLabel, Input, Button, DialogActions, useColorScheme
} from '@mui/joy';
import { 
  Event, Pets, Inventory2, RestaurantMenu, AccountBalance, Close, 
  KeyboardArrowRight, PushPin, PushPinOutlined, HomeWork, Settings as SettingsIcon, 
  Logout as LogoutIcon, Download as DownloadIcon, Home as HomeIcon, ExpandMore, Add, CheckCircle,
  Palette, Person, Security, CleaningServices, ShoppingBag,
  LightMode, DarkMode, SettingsBrightness
} from '@mui/icons-material';

import { useLocation, useNavigate, NavLink, useSearchParams } from 'react-router-dom';
import { isToday, parseISO } from 'date-fns';
import { getEmojiColor } from '../theme';
import { useHousehold } from '../contexts/HouseholdContext';
import EmojiPicker from './EmojiPicker';
import { ToggleButtonGroup } from '@mui/joy';

const RAIL_WIDTH = 72; 
const PANEL_WIDTH = 280; 

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
        if (!isMobile) onHover(category);
    };

    if (isMobile) {
        return (
          <ListItem sx={{ px: 0 }}>
              <ListItemButton 
                  component={to ? NavLink : 'div'}
                  to={to}
                  selected={isActive}
                  onClick={handleClick}
                  aria-label={label}
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
                  component={to ? NavLink : 'div'}
                  to={to}
                  selected={isActive}
                  onClick={handleClick}
                  onMouseEnter={handleMouseEnter}
                  aria-label={label}
                  sx={{ 
                      borderRadius: 'md', justifyContent: 'center', px: 0, 
                      flexDirection: 'column', gap: 0.5, py: 1, width: 56, 
                      mx: 'auto', minHeight: 60,
                      transition: 'all 0.2s',
                      '&.Mui-selected': { 
                          bgcolor: 'primary.softBg', 
                          color: 'primary.solidBg',
                          transform: 'scale(0.95)'
                      },
                      '&:hover': {
                          bgcolor: 'background.level1'
                      }
                  }}
              >
                  <ListItemDecorator sx={{ 
                      display: 'flex', justifyContent: 'center', m: 0, 
                      '& svg': { fontSize: '1.5rem' },
                      color: isActive ? 'primary.solidBg' : 'text.secondary' 
                  }}>
                      {icon}
                  </ListItemDecorator>
                  <Typography level="body-xs" sx={{ 
                      fontSize: '10px', 
                      fontWeight: isActive ? '700' : '500', 
                      color: isActive ? 'primary.solidBg' : 'text.secondary', 
                      textAlign: 'center' 
                  }}>{label}</Typography>
              </ListItemButton>
          </ListItem>
    );
};

const SubItem = ({ label, to, emoji, onClick, active }) => {
    const { mode, systemMode } = useColorScheme();
    const isDark = mode === 'dark' || (mode === 'system' && systemMode === 'dark');
    return (
    <ListItem>
        <ListItemButton 
          component={to ? NavLink : 'div'} 
          to={to} 
          onClick={onClick}
          selected={active}
          sx={{ 
              borderRadius: 'md',
              py: 1,
              gap: 1.5,
              '&.Mui-selected': {
                  bgcolor: 'primary.softBg',
                  color: 'primary.solidBg',
                  fontWeight: '700'
              }
          }}
        >
            <ListItemDecorator>
              {emoji ? (
                  typeof emoji === 'string' ? (
                    <Avatar size="sm" sx={{ '--Avatar-size': '32px', fontSize: '1.2rem', bgcolor: getEmojiColor(emoji, isDark) }}>{emoji}</Avatar>
                  ) : emoji
              ) : <KeyboardArrowRight />}
            </ListItemDecorator>
            <ListItemContent sx={{ fontSize: '0.95rem' }}>{label}</ListItemContent>
        </ListItemButton>
    </ListItem>
    );
};

const GroupHeader = ({ label }) => (
    <ListItem sx={{ mt: 1, mb: 0.5 }}>
        <Typography level="body-xs" fontWeight="700" textTransform="uppercase" letterSpacing="1px" sx={{ px: 1, color: 'text.tertiary' }}>
            {label}
        </Typography>
    </ListItem>
);

export default function NavSidebar({ 
    isMobile = false, onClose, installPrompt, onInstall
}) {
  const { mode: muiMode, systemMode } = useColorScheme();
  const isDark = muiMode === 'dark' || (muiMode === 'system' && systemMode === 'dark');
  
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    household, members = [], vehicles = [], user, api,
    onLogout, confirmAction, households = [], onSelectHousehold,
    mode, onModeChange
  } = useHousehold();
  
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
      if (!path) return null;
      if (path.includes('/finance')) return 'finance';
      if (path.includes('/calendar')) return 'calendar';
      if (path.includes('/meals')) return 'meals';
      if (path.includes('/chores')) return 'chores';
      if (path.includes('/shopping')) return 'shopping';
      if (path.includes('/dashboard')) return 'dashboard';
      if (path.includes('/settings')) return 'account';
      // Check for house/people/pets last or use stricter matching
      if (path.match(/\/house($|\/)/) || path.includes('/people') || path.includes('/pets') || path.includes('/vehicles')) return 'household';
      return null;
  }, []);

  const activeCategory = useMemo(() => getCategoryFromPath(location.pathname), [location.pathname, getCategoryFromPath]);

  const handleNav = (to, category, hasSubItems) => {
      if (to) {
          navigate(to);
          setHoveredCategory(null);
          if (!hasSubItems && isMobile && onClose) onClose();
      }
      if (!hasSubItems) setHoveredCategory(null);
  };

  const handleSubItemClick = () => {
      setHoveredCategory(null);
      if (isMobile && onClose) onClose();
  };

  const getFinanceLink = (tab) => {
      if (!household?.id) return '/';
      const profileId = searchParams.get('financial_profile_id');
      let link = `/household/${household.id}/finance?tab=${tab}`;
      if (profileId) link += `&financial_profile_id=${profileId}`;
      return link;
  };

  const handleProfileSelect = (id) => {
      setSearchParams(prev => {
          prev.set('financial_profile_id', id);
          return prev;
      });
  };

    const currentPanelCategory = (hoveredCategory || (isPinned ? activeCategory : null));
    const showPanel = !!currentPanelCategory;

    const [profiles, setProfiles] = useState([]);
    const [profileCreateOpen, setProfileCreateOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileEmoji, setNewProfileEmoji] = useState('💰');
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

    // Sidebar Data States
    const [todayEvents, setTodayEvents] = useState([]);
    const [pendingChores, setPendingChores] = useState([]);
    const [quickShopItem, setQuickShopItem] = useState('');

    useEffect(() => {
        if (!household?.id) return;

        if (currentPanelCategory === 'finance') {
            api.get(`/households/${household.id}/finance/profiles`)
               .then(res => setProfiles(res.data))
               .catch(console.error);
        }

        if (currentPanelCategory === 'calendar') {
            api.get(`/households/${household.id}/dates`)
               .then(res => {
                   const todayStr = new Date().toISOString().split('T')[0];
                   setTodayEvents((res.data || []).filter(d => d.date?.startsWith(todayStr)));
               })
               .catch(console.error);
        }

        if (currentPanelCategory === 'chores') {
            api.get(`/households/${household.id}/chores`)
               .then(res => {
                   setPendingChores((res.data || []).filter(c => {
                       if (!c.next_due_date) return false;
                       return isToday(parseISO(c.next_due_date));
                   }));
               })
               .catch(console.error);
        }
    }, [api, household?.id, currentPanelCategory]);

    const handleQuickShopAdd = async (e) => {
        if (e.key === 'Enter' && quickShopItem.trim()) {
            try {
                await api.post(`/households/${household.id}/shopping`, { name: quickShopItem });
                setQuickShopItem('');
                if (location.pathname.includes('/shopping')) {
                    // Force refresh if on page? Better to use a global state or bus, 
                    // but for now simple message
                    navigate(location.pathname, { replace: true });
                }
            } catch (err) { console.error(err); }
        }
    };

    const handleCreateProfile = async (e) => {
        e.preventDefault();
        if (!household?.id) return;
        try {
            const res = await api.post(`/households/${household.id}/finance/profiles`, {
                name: newProfileName, emoji: newProfileEmoji, is_default: false
            });
            setProfiles(prev => [...prev, res.data]);
            handleProfileSelect(res.data.id);
            setProfileCreateOpen(false);
            setNewProfileName(''); setNewProfileEmoji('💰');
        } catch (err) { alert("Failed: " + err.message); }
    };

    const handleDeleteProfile = async (id) => {
        if (!household?.id) return;
        if (!confirm("Delete this profile?")) return;
        try {
            await api.delete(`/households/${household.id}/finance/profiles/${id}`);
            setProfiles(prev => prev.filter(p => p.id !== id));
            if (String(searchParams.get('financial_profile_id')) === String(id)) {
                handleProfileSelect(profiles.find(p => p.id !== id)?.id);
            }
        } catch (err) { alert("Failed to delete: " + err.message); }
    };

    const isSettingsTabActive = (tab) => location.pathname.includes('/settings') && searchParams.get('tab') === String(tab);

    if (!household) return null;

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
                  borderRight: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'center',
                  pt: 1.5, pb: 1.5, 
                  bgcolor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(20px)',
                  zIndex: 2600, height: '100dvh'
              }}
          >
              <Box sx={{ width: '100%', flexShrink: 0 }}>
                  {isMobile && (
                      <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography level="title-lg" sx={{ fontWeight: 'bold' }}>Menu</Typography>
                          <IconButton variant="plain" color="neutral" onClick={onClose}><Close /></IconButton>
                      </Box>
                  )}
  
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                      <Tooltip title="Dashboard" variant="soft" placement="right">
                          <Avatar 
                              variant="soft" color="primary" size="lg"
                              onClick={() => { navigate(`/household/${household.id}/dashboard`); setHoveredCategory(null); }}
                              onMouseEnter={() => !isMobile && setHoveredCategory('dashboard')}
                              sx={{ 
                                  bgcolor: getEmojiColor(household?.avatar || '🏠', isDark),
                                  fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer',
                                  transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' },
                                  border: (activeCategory === 'dashboard') ? '2px solid' : 'none',
                                  borderColor: 'primary.solidBg'
                              }}
                          >
                              {household?.avatar || '🏠'}
                          </Avatar>
                      </Tooltip>
                  </Box>
                  
                  <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '8px', width: '100%', px: isMobile ? 1 : 0 }}>
                      <RailIcon icon={<HomeIcon />} label="House" category="household" hasSubItems to={`/household/${household.id}/house`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      <RailIcon icon={<Event />} label="Calendar" category="calendar" to={`/household/${household.id}/calendar`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                  </List>
                  <Divider sx={{ my: 1.5, width: isMobile ? '100%' : 48, mx: 'auto', bgcolor: isDark ? 'neutral.700' : 'neutral.300', height: '2px' }} />
              </Box>
  
              <Box sx={{ width: '100%', flexGrow: 1, overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                  <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '8px', width: '100%', px: isMobile ? 1 : 0 }}>
                      <RailIcon icon={<AccountBalance />} label="Finance" category="finance" hasSubItems to={`/household/${household.id}/finance`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      <RailIcon icon={<ShoppingBag />} label="Groceries" category="shopping" to={`/household/${household.id}/shopping`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      <RailIcon icon={<CleaningServices />} label="Chores" category="chores" to={`/household/${household.id}/chores`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      {enabledModules.includes('meals') && (
                          <RailIcon icon={<RestaurantMenu />} label="Meals" category="meals" to={`/household/${household.id}/meals`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      )}
                  </List>
              </Box>
  
              <Box sx={{ width: '100%', mt: 'auto', pt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: '100%', px: 1.5 }}><Divider sx={{ mb: 1.5 }} /></Box>
                  {installPrompt && (
                      <Tooltip title="Install App" variant="soft" placement="right">
                          <IconButton variant="soft" color="success" onClick={onInstall} size="sm"><DownloadIcon /></IconButton>
                      </Tooltip>
                  )}
                  <Tooltip title={isMobile ? "Account" : "Account & Settings"} variant="soft" placement="right">
                      <IconButton 
                          variant="plain" 
                          aria-label="Account"
                          color={(hoveredCategory === 'account' || activeCategory === 'account') ? 'primary' : 'neutral'}
                          onClick={(e) => {
                              if (isMobile) setUserMenuAnchor(userMenuAnchor ? null : e.currentTarget);
                              else setHoveredCategory(hoveredCategory === 'account' ? null : 'account');
                          }}
                          onMouseEnter={() => !isMobile && setHoveredCategory('account')}
                          sx={{ p: 0.5, borderRadius: '50%', bgcolor: (userMenuAnchor || hoveredCategory === 'account' || activeCategory === 'account') ? 'primary.softBg' : 'transparent' }}
                      >
                          <Avatar size="sm" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark), width: 32, height: 32, fontSize: '1rem' }}>
                              {user?.avatar || user?.first_name?.[0]}
                          </Avatar>
                      </IconButton>
                  </Tooltip>
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
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      bgcolor: isDark ? 'rgba(5, 5, 5, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(24px)',
                      height: '100dvh', display: 'flex', flexDirection: 'column',
                      boxShadow: (!isPinned && !isMobile) ? '8px 0 24px rgba(0,0,0,0.15)' : 'none'
                  }}
              >
                  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography level="title-md" textTransform="uppercase" letterSpacing="1px">{currentPanelCategory}</Typography>
                      <IconButton size="sm" variant={isPinned ? "solid" : "plain"} color={isPinned ? "primary" : "neutral"} onClick={togglePin}>
                          {isPinned ? <PushPin /> : <PushPinOutlined />}
                      </IconButton>
                  </Box>

                  <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                      {currentPanelCategory === 'dashboard' && (
                          <List sx={{ gap: 1 }}>
                              <SubItem label="Overview" to={`/household/${household.id}/dashboard`} emoji="🏠" onClick={handleSubItemClick} />
                              <Divider sx={{ my: 1 }} />
                              <Typography level="body-xs" sx={{ px: 2, mb: 1, opacity: 0.6 }}>QUICK STATS</Typography>
                              <Box sx={{ px: 2 }}>
                                  <Typography level="title-sm">{household.name}</Typography>
                                  <Typography level="body-xs">Role: {user.role}</Typography>
                              </Box>
                          </List>
                      )}

                      {currentPanelCategory === 'household' && (
                          <>
                              <GroupHeader label="Overview" />
                              <SubItem label="House Hub" to={`/household/${household.id}/house`} emoji="🏠" onClick={handleSubItemClick} />
                              <SubItem label="Property Details" to={`/household/${household.id}/house/details`} emoji="📋" onClick={handleSubItemClick} />
                              <SubItem label="People & Residents" to={`/household/${household.id}/people`} emoji="👥" onClick={handleSubItemClick} />
                              <Divider sx={{ my: 1 }} />
                              <GroupHeader label="Residents" />
                              {members.filter(m => m.type !== 'pet').map(m => <SubItem key={m.id} label={m.alias || (m.name || '').split(' ')[0]} to={`/household/${household.id}/people/${m.id}`} emoji={m.emoji} onClick={handleSubItemClick} />)}
                              {enabledModules.includes('pets') && (
                                  <>
                                      <Divider sx={{ my: 1 }} /><GroupHeader label="Pets" />
                                      {members.filter(m => m.type === 'pet').map(m => <SubItem key={m.id} label={m.name} to={`/household/${household.id}/pets/${m.id}`} emoji={m.emoji} onClick={handleSubItemClick} />)}
                                  </>
                              )}
                              <Divider sx={{ my: 1 }} /><GroupHeader label="Fleet" />
                              {vehicles.map(v => <SubItem key={v.id} label={`${v.make} ${v.model}`} to={`/household/${household.id}/vehicles/${v.id}`} emoji={v.emoji} onClick={handleSubItemClick} />)}
                          </>
                      )}

                      {currentPanelCategory === 'calendar' && (
                          <Box sx={{ p: 1 }}>
                              <Button fullWidth startDecorator={<Add />} onClick={() => navigate(`/household/${household.id}/calendar`)} sx={{ mb: 2 }}>New Event</Button>
                              <GroupHeader label="Today's Events" />
                              <List sx={{ gap: 0.5 }}>
                                  {todayEvents.length === 0 && <Typography level="body-xs" sx={{ px: 2, opacity: 0.5 }}>Nothing scheduled today.</Typography>}
                                  {todayEvents.map(e => (
                                      <ListItem key={e.id}>
                                          <ListItemButton onClick={() => navigate(`/household/${household.id}/calendar`)}>
                                              <ListItemDecorator>{e.emoji || '📅'}</ListItemDecorator>
                                              <ListItemContent>{e.title}</ListItemContent>
                                          </ListItemButton>
                                      </ListItem>
                                  ))}
                              </List>
                              <Divider sx={{ my: 2 }} />
                              <SubItem label="View Full Calendar" to={`/household/${household.id}/calendar`} emoji="📅" onClick={handleSubItemClick} />
                          </Box>
                      )}

                      {currentPanelCategory === 'finance' && (
                          <>
                              <ListItem sx={{ mt: 1, mb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
                                  <Typography level="body-xs" fontWeight="bold" textTransform="uppercase" letterSpacing="1px" sx={{ px: 1, color: 'text.tertiary' }}>PROFILES</Typography>
                                  <IconButton size="sm" variant="plain" onClick={() => setProfileCreateOpen(true)} aria-label="Add Profile"><Add fontSize="small" /></IconButton>
                              </ListItem>
                              {profiles.map(p => (
                                  <ListItem key={p.id} endAction={p.is_default !== 1 ? (<IconButton size="sm" variant="plain" color="danger" onClick={() => handleDeleteProfile(p.id)} sx={{ opacity: 0, transition: 'opacity 0.2s', '.MuiListItem-root:hover &': { opacity: 1 } }}><Close fontSize="small" /></IconButton>) : null}>
                                      <ListItemButton selected={String(searchParams.get('financial_profile_id')) === String(p.id)} onClick={() => handleProfileSelect(p.id)} sx={{ borderRadius: 'sm' }}>
                                          <ListItemDecorator>{p.emoji}</ListItemDecorator>
                                          <ListItemContent>{p.name}</ListItemContent>
                                      </ListItemButton>
                                  </ListItem>
                              ))}
                              <Divider sx={{ my: 1 }} />
                              <GroupHeader label="Overview" /><SubItem label="Budget" to={getFinanceLink('budget')} emoji="📊" onClick={handleSubItemClick} />
                              <Divider sx={{ my: 1 }} /><GroupHeader label="Accounts" />
                              <SubItem label="Income" to={getFinanceLink('income')} emoji="💰" onClick={handleSubItemClick} />
                              <SubItem label="Banking" to={getFinanceLink('banking')} emoji="🏦" onClick={handleSubItemClick} />
                              <SubItem label="Savings" to={getFinanceLink('savings')} emoji="🐷" onClick={handleSubItemClick} />
                              <SubItem label="Investments" to={getFinanceLink('invest')} emoji="📈" onClick={handleSubItemClick} />
                              <SubItem label="Pensions" to={getFinanceLink('pensions')} emoji="👴" onClick={handleSubItemClick} />
                              <Divider sx={{ my: 1 }} /><GroupHeader label="Liabilities" />
                              <SubItem label="Credit Cards" to={getFinanceLink('credit')} emoji="💳" onClick={handleSubItemClick} />
                              <SubItem label="Loans" to={getFinanceLink('loans')} emoji="📝" onClick={handleSubItemClick} />
                              <SubItem label="Car Finance" to={getFinanceLink('car')} emoji="🚗" onClick={handleSubItemClick} />
                              <SubItem label="Mortgages" to={getFinanceLink('mortgage')} emoji="🏠" onClick={handleSubItemClick} />
                          </>
                      )}

                      {currentPanelCategory === 'shopping' && (
                          <Box sx={{ p: 1 }}>
                              <Typography level="body-xs" sx={{ px: 1, mb: 1, fontWeight: 'bold' }}>QUICK ADD</Typography>
                              <Input 
                                  placeholder="Type and press Enter..." 
                                  value={quickShopItem}
                                  onChange={e => setQuickShopItem(e.target.value)}
                                  onKeyDown={handleQuickShopAdd}
                                  sx={{ mb: 2 }}
                              />
                              <Divider sx={{ my: 1 }} />
                              <SubItem label="Open Full List" to={`/household/${household.id}/shopping`} emoji="🛒" onClick={handleSubItemClick} />
                          </Box>
                      )}

                      {currentPanelCategory === 'chores' && (
                          <Box sx={{ p: 1 }}>
                              <Button fullWidth startDecorator={<Add />} onClick={() => navigate(`/household/${household.id}/chores`)} sx={{ mb: 2 }}>Add Task</Button>
                              <GroupHeader label="Due Today" />
                              <List sx={{ gap: 0.5 }}>
                                  {pendingChores.length === 0 && <Typography level="body-xs" sx={{ px: 2, opacity: 0.5 }}>All chores complete!</Typography>}
                                  {pendingChores.map(c => (
                                      <ListItem key={c.id}>
                                          <ListItemButton onClick={() => navigate(`/household/${household.id}/chores`)}>
                                              <ListItemDecorator>{c.emoji || '🧹'}</ListItemDecorator>
                                              <ListItemContent>{c.name}</ListItemContent>
                                          </ListItemButton>
                                      </ListItem>
                                  ))}
                              </List>
                              <Divider sx={{ my: 2 }} />
                              <SubItem label="View All Chores" to={`/household/${household.id}/chores`} emoji="🧹" onClick={handleSubItemClick} />
                          </Box>
                      )}

                      {currentPanelCategory === 'meals' && (
                          <Box sx={{ p: 1 }}>
                              <GroupHeader label="Meal Plan" />
                              <SubItem label="Meal Planner" to={`/household/${household.id}/meals`} emoji="🍱" onClick={handleSubItemClick} />
                              <SubItem label="Recipe book" to={`/household/${household.id}/meals?tab=library`} emoji="📖" onClick={handleSubItemClick} />
                          </Box>
                      )}

                      {currentPanelCategory === 'account' && (
                          <>
                              <Box sx={{ p: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                      <Avatar size="lg" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark) }}>{user?.avatar || user?.first_name?.[0]}</Avatar>
                                      <Box>
                                          <Typography level="title-sm">{user?.first_name} {user?.last_name}</Typography>
                                          <Typography level="body-xs" color="neutral">{user?.email}</Typography>
                                      </Box>
                                  </Box>

                                  <Box sx={{ mb: 2 }}>
                                      <Typography level="body-xs" fontWeight="bold" sx={{ mb: 1, color: 'text.tertiary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Theme Mode</Typography>
                                      <ToggleButtonGroup 
                                          variant="soft" 
                                          size="sm" 
                                          value={mode} 
                                          onChange={(e, v) => v && onModeChange(v)}
                                          sx={{ width: '100%', justifyContent: 'center' }}
                                      >
                                          <Button value="light" sx={{ flex: 1 }} startDecorator={<LightMode />}>Light</Button>
                                          <Button value="dark" sx={{ flex: 1 }} startDecorator={<DarkMode />}>Dark</Button>
                                          <Button value="system" sx={{ flex: 1 }} startDecorator={<SettingsBrightness />}>System</Button>
                                      </ToggleButtonGroup>
                                  </Box>
                              </Box>
                              
                              <List sx={{ p: 1, gap: 0.5 }}>
                                  <SubItem label="Profile Settings" to={`/household/${household.id}/settings?tab=0`} emoji={<Person />} active={isSettingsTabActive(0)} onClick={handleSubItemClick} />
                                  <SubItem label="Security & MFA" to={`/household/${household.id}/settings?tab=1`} emoji={<Security />} active={isSettingsTabActive(1)} onClick={handleSubItemClick} />
                                  <SubItem label="Appearance" to={`/household/${household.id}/settings?tab=3`} emoji={<Palette />} active={isSettingsTabActive(3)} onClick={handleSubItemClick} />
                                  
                                  <Divider sx={{ my: 1 }} />
                                  <GroupHeader label="Workspace" />
                                  <SubItem label="User Settings" to={`/household/${household.id}/settings`} emoji={<SettingsIcon />} onClick={handleSubItemClick} />
                                  <SubItem label="Household Settings" to={`/household/${household.id}/house/details?tab=modules`} emoji={<HomeWork />} onClick={handleSubItemClick} />
                                  
                                  {(user?.system_role === 'admin' || user?.role === 'admin') && (
                                      <SubItem label="Add New Household" to="/select-household" emoji={<Add />} onClick={handleSubItemClick} />
                                  )}
                                  
                                  <Box sx={{ pl: 2, pr: 2, pt: 1, pb: 1 }}>
                                      <Typography level="body-xs" fontWeight="bold" sx={{ mb: 1, color: 'text.tertiary', fontSize: '0.7rem', textTransform: 'uppercase' }}>Available Households</Typography>
                                      <List sx={{ gap: 0.5, p: 0 }}>
                                          {households.map(hh => (
                                              <ListItem key={hh.id}>
                                                  <ListItemButton 
                                                      selected={hh.id === household.id}
                                                      onClick={async () => {
                                                          await onSelectHousehold(hh);
                                                          navigate(`/household/${hh.id}/dashboard`);
                                                          if (isMobile && onClose) onClose();
                                                          else setHoveredCategory(null);
                                                      }}
                                                      sx={{ borderRadius: 'sm', py: 0.5 }}
                                                  >
                                                      <ListItemDecorator>
                                                          <Avatar size="sm" sx={{ width: 24, height: 24, fontSize: '0.9rem', bgcolor: getEmojiColor(hh.avatar || '🏠', isDark) }}>
                                                              {hh.avatar || '🏠'}
                                                          </Avatar>
                                                      </ListItemDecorator>
                                                      <ListItemContent>
                                                          <Typography level="body-sm" fontWeight={hh.id === household.id ? 'bold' : 'normal'}>
                                                              {hh.name}
                                                          </Typography>
                                                      </ListItemContent>
                                                      {hh.id === household.id && <CheckCircle color="primary" sx={{ fontSize: '1rem' }} />}
                                                  </ListItemButton>
                                              </ListItem>
                                          ))}
                                      </List>
                                  </Box>

                                  <Box sx={{ mt: 'auto', pt: 2 }}>
                                    <Divider sx={{ mb: 1 }} />
                                    <SubItem label="Log Out" onClick={() => confirmAction("Log Out", "Are you sure?", onLogout)} emoji={<LogoutIcon color="danger" />} />
                                  </Box>
                              </List>
                          </>
                      )}
                  </Box>
              </Sheet>
          )}
  
          <Modal open={profileCreateOpen} onClose={() => setProfileCreateOpen(false)}>
              <ModalDialog>
                  <DialogTitle>New Financial Profile</DialogTitle>
                  <DialogContent>
                      <form onSubmit={handleCreateProfile}>
                          <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
                              <IconButton variant="outlined" onClick={() => setEmojiPickerOpen(true)} sx={{ width: 48, height: 48, fontSize: '1.5rem' }}>{newProfileEmoji}</IconButton>
                              <FormControl required sx={{ flexGrow: 1 }}>
                                  <FormLabel>Profile Name</FormLabel>
                                  <Input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} autoFocus placeholder="e.g. Side Hustle" />
                              </FormControl>
                          </Box>
                          <DialogActions>
                              <Button variant="plain" color="neutral" onClick={() => setProfileCreateOpen(false)}>Cancel</Button>
                              <Button type="submit">Create</Button>
                          </DialogActions>
                      </form>
                  </DialogContent>
              </ModalDialog>
          </Modal>
          <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setNewProfileEmoji(e); setEmojiPickerOpen(false); }} isDark={isDark} />
      </Box>
    );
}