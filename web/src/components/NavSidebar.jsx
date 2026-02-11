import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Tooltip, Menu, MenuItem, Accordion, AccordionSummary, AccordionDetails, Modal, ModalDialog, DialogTitle, DialogContent, FormControl, FormLabel, Input, Button, DialogActions, useColorScheme
} from '@mui/joy';
import { 
  Event, Pets, Inventory2, RestaurantMenu, AccountBalance, Close, 
  KeyboardArrowRight, PushPin, PushPinOutlined, HomeWork, Settings as SettingsIcon, 
  Logout as LogoutIcon, Download as DownloadIcon, Home as HomeIcon, ExpandMore, Add, CheckCircle,
  Palette, Person, Security
} from '@mui/icons-material';

import { useLocation, useNavigate, NavLink, useSearchParams } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import { useHousehold } from '../contexts/HouseholdContext';
import EmojiPicker from './EmojiPicker';

const RAIL_WIDTH = 64; 
const PANEL_WIDTH = 260; 

const RailIcon = ({ icon, label, category, to, hasSubItems, onClick, location, activeCategory, hoveredCategory, onHover, handleNav, isMobile }) => {
    const { mode, systemMode } = useColorScheme();
    const isDark = mode === 'dark' || (mode === 'system' && systemMode === 'dark');
    
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
                      '&.Mui-selected': { 
                          bgcolor: 'primary.softBg', 
                          color: 'primary.solidBg' 
                      }
                  }}
              >
                  <ListItemDecorator sx={{ 
                      display: 'flex', justifyContent: 'center', m: 0, 
                      '& svg': { fontSize: '1.4rem' },
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
              borderRadius: 'sm',
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
                    <Avatar size="sm" sx={{ '--Avatar-size': '24px', fontSize: '1rem', bgcolor: getEmojiColor(emoji, isDark) }}>{emoji}</Avatar>
                  ) : emoji
              ) : <KeyboardArrowRight />}
            </ListItemDecorator>
            <ListItemContent>{label}</ListItemContent>
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
  const { mode, systemMode } = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && systemMode === 'dark');
  
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    household, members, vehicles, user, api,
    onLogout, confirmAction 
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
      if (path.includes('/settings')) return 'account';
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

  const getFinanceLink = (tab) => {
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
    const showPanel = currentPanelCategory && ['household', 'finance', 'account'].includes(currentPanelCategory);

    const [profiles, setProfiles] = useState([]);
    const [profileCreateOpen, setProfileCreateOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileEmoji, setNewProfileEmoji] = useState('💰');
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

    useEffect(() => {
        if (currentPanelCategory === 'finance') {
            api.get(`/households/${household.id}/finance/profiles`)
               .then(res => setProfiles(res.data))
               .catch(console.error);
        }
    }, [api, household.id, currentPanelCategory]);

    const handleCreateProfile = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post(`/households/${householdId}/finance/profiles`, {
                name: newProfileName, emoji: newProfileEmoji, is_default: false
            });
            setProfiles(prev => [...prev, res.data]);
            handleProfileSelect(res.data.id);
            setProfileCreateOpen(false);
            setNewProfileName(''); setNewProfileEmoji('💰');
        } catch (err) { alert("Failed: " + err.message); }
    };

    const handleDeleteProfile = async (id) => {
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
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'center',
                  pt: 1.5, pb: 1.5, 
                  bgcolor: isDark ? '#000000' : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
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
  
                  <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
                      <Tooltip title="Dashboard" variant="soft" placement="right">
                          <Avatar 
                              variant="soft" color="primary" size="lg"
                              onClick={() => { navigate(`/household/${household.id}/dashboard`); setHoveredCategory(null); }}
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
                      <RailIcon icon={<HomeIcon />} label="House" category="household" hasSubItems to={`/household/${household.id}/house`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      <RailIcon icon={<Event />} label="Calendar" category="calendar" to={`/household/${household.id}/calendar`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                  </List>
                  <Divider sx={{ my: 1, width: isMobile ? '100%' : 40, mx: 'auto' }} />
              </Box>
  
              <Box sx={{ width: '100%', flexGrow: 1, overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                  <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%', px: isMobile ? 1 : 0 }}>
                      <RailIcon icon={<AccountBalance />} label="Finance" category="finance" hasSubItems to={`/household/${household.id}/finance`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      <RailIcon icon={<Add />} label="Shop" category="shopping" to={`/household/${household.id}/shopping`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      {enabledModules.includes('meals') && (
                          <RailIcon icon={<RestaurantMenu />} label="Meals" category="meals" to={`/household/${household.id}/meals`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
                      )}
                  </List>
              </Box>
  
              <Box sx={{ width: '100%', mt: 'auto', pt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: '100%', px: 1.5 }}><Divider sx={{ mb: 1 }} /></Box>
                  {installPrompt && (
                      <Tooltip title="Install App" variant="soft" placement="right">
                          <IconButton variant="soft" color="success" onClick={onInstall} size="sm"><DownloadIcon /></IconButton>
                      </Tooltip>
                  )}
                  <Tooltip title={isMobile ? "Account" : "Account & Settings"} variant="soft" placement="right">
                      <IconButton 
                          variant="plain" 
                          color={(hoveredCategory === 'account' || activeCategory === 'account') ? 'primary' : 'neutral'}
                          onClick={(e) => {
                              if (isMobile) setUserMenuAnchor(userMenuAnchor ? null : e.currentTarget);
                              else setHoveredCategory(hoveredCategory === 'account' ? null : 'account');
                          }}
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
                      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
                      bgcolor: isDark ? '#050505' : 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(12px)',
                      height: '100dvh', display: 'flex', flexDirection: 'column',
                      boxShadow: (!isPinned && !isMobile) ? '8px 0 24px rgba(0,0,0,0.15)' : 'none'
                  }}
              >
                  {currentPanelCategory === 'account' ? (
                      <>
                          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                              <Typography level="title-md" textTransform="uppercase" letterSpacing="1px">Personal Preferences</Typography>
                          </Box>
                          <Box sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                  <Avatar size="lg" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark) }}>{user?.avatar || user?.first_name?.[0]}</Avatar>
                                  <Box>
                                      <Typography level="title-sm">{user?.first_name} {user?.last_name}</Typography>
                                      <Typography level="body-xs" color="neutral">{user?.email}</Typography>
                                  </Box>
                              </Box>
                          </Box>
                          
                          <List sx={{ p: 1, gap: 0.5 }}>
                              <SubItem label="Profile Settings" to={`/household/${household.id}/settings?tab=0`} emoji={<Person />} active={isSettingsTabActive(0)} onClick={handleSubItemClick} />
                              <SubItem label="Security & MFA" to={`/household/${household.id}/settings?tab=1`} emoji={<Security />} active={isSettingsTabActive(1)} onClick={handleSubItemClick} />
                              <SubItem label="Appearance" to={`/household/${household.id}/settings?tab=3`} emoji={<Palette />} active={isSettingsTabActive(3)} onClick={handleSubItemClick} />
                              
                              <Divider sx={{ my: 1 }} />
                              <GroupHeader label="Workspace" />
                              <SubItem label="Household Settings" to={`/household/${household.id}/settings?tab=2`} emoji={<HomeWork />} active={isSettingsTabActive(2)} onClick={handleSubItemClick} />
                              <SubItem label="Switch Household" to="/select-household" emoji={<HomeWork />} onClick={handleSubItemClick} />
                              
                              <Box sx={{ mt: 'auto', pt: 2 }}>
                                <Divider sx={{ mb: 1 }} />
                                <SubItem label="Log Out" onClick={() => confirmAction("Log Out", "Are you sure?", onLogout)} emoji={<LogoutIcon color="danger" />} />
                              </Box>
                          </List>
                      </>
                  ) : (
                      <>
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
                                  <SubItem label="House Hub" to={`/household/${household.id}/house`} emoji="🏠" onClick={handleSubItemClick} />
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
                          {currentPanelCategory === 'finance' && (
                              <>
                                  <ListItem sx={{ mt: 1, mb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
                                      <Typography level="body-xs" fontWeight="bold" textTransform="uppercase" letterSpacing="1px" sx={{ px: 1, color: 'text.tertiary' }}>PROFILES</Typography>
                                      <IconButton size="sm" variant="plain" onClick={() => setProfileCreateOpen(true)}><Add fontSize="small" /></IconButton>
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
                      </List>
                      </>
                  )}
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
