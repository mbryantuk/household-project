import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Tooltip, Menu, MenuItem, Accordion, AccordionSummary, AccordionDetails, Modal, ModalDialog, DialogTitle, DialogContent, FormControl, FormLabel, Input, Button, DialogActions
} from '@mui/joy';
import { 
  Event, Pets, Inventory2, RestaurantMenu, AccountBalance, Close, 
  KeyboardArrowRight, PushPin, PushPinOutlined, HomeWork, Settings as SettingsIcon, 
  Logout as LogoutIcon, Download as DownloadIcon, Home as HomeIcon, ExpandMore, Add, CheckCircle
} from '@mui/icons-material';

import { useLocation, useNavigate, NavLink, useSearchParams } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import { useHousehold } from '../contexts/HouseholdContext';
import EmojiPicker from './EmojiPicker';

const RAIL_WIDTH = 64; 
const PANEL_WIDTH = 260; // Increased slightly for accordion

const RailIcon = ({ icon, label, category, to, hasSubItems, onClick, location, activeCategory, hoveredCategory, onHover, handleNav, isMobile }) => {
    // ... (unchanged)
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

// --- NEW COMPONENT: Profile Accordion ---
const FinanceProfileAccordion = ({ householdId, api, isDark, onSelect, currentProfileId }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileEmoji, setNewProfileEmoji] = useState('💰');

    const fetchProfiles = useCallback(async () => {
        try {
            const res = await api.get(`/households/${householdId}/finance/profiles`);
            setProfiles(res.data || []);
            // If no profile selected, default to the one marked default
            if (!currentProfileId && res.data.length > 0) {
                const def = res.data.find(p => p.is_default) || res.data[0];
                onSelect(def.id);
            }
        } catch (err) { console.error("Failed to fetch profiles", err); } finally { setLoading(false); }
    }, [api, householdId, currentProfileId, onSelect]);

    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post(`/households/${householdId}/finance/profiles`, {
                name: newProfileName, emoji: newProfileEmoji, is_default: false
            });
            setProfiles(prev => [...prev, res.data]);
            onSelect(res.data.id);
            setCreateOpen(false);
            setNewProfileName('');
            setNewProfileEmoji('💰');
        } catch (err) { alert("Failed to create profile: " + err.message); }
    };

    const activeProfile = profiles.find(p => String(p.id) === String(currentProfileId));

    return (
        <Box sx={{ mb: 1 }}>
            <Accordion variant="outlined" defaultExpanded sx={{ borderRadius: 'sm', bgcolor: 'background.surface' }}>
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 48 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(activeProfile?.emoji || '💰', isDark) }}>{activeProfile?.emoji || '💰'}</Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography level="title-sm" noWrap>{activeProfile?.name || 'Loading...'}</Typography>
                            <Typography level="body-xs" color="neutral">Active Profile</Typography>
                        </Box>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.level1', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography level="body-xs" fontWeight="bold" sx={{ px: 1 }}>SWITCH PROFILE</Typography>
                        <IconButton size="sm" variant="plain" color="primary" onClick={() => setCreateOpen(true)}><Add /></IconButton>
                    </Box>
                    <List size="sm" sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {profiles.map(p => (
                            <ListItem key={p.id}>
                                <ListItemButton 
                                    selected={String(p.id) === String(currentProfileId)} 
                                    onClick={() => onSelect(p.id)}
                                    sx={{ borderRadius: 'sm' }}
                                >
                                    <ListItemDecorator>{p.emoji}</ListItemDecorator>
                                    <ListItemContent>{p.name}</ListItemContent>
                                    {String(p.id) === String(currentProfileId) && <CheckCircle color="primary" sx={{ fontSize: '1rem' }} />}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </AccordionDetails>
            </Accordion>

            <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
                <ModalDialog>
                    <DialogTitle>Create Financial Profile</DialogTitle>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
                                <IconButton variant="outlined" onClick={() => setEmojiPickerOpen(true)} sx={{ width: 48, height: 48, fontSize: '1.5rem' }}>{newProfileEmoji}</IconButton>
                                <FormControl required sx={{ flexGrow: 1 }}>
                                    <FormLabel>Profile Name</FormLabel>
                                    <Input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} autoFocus placeholder="e.g. Joint, Business..." />
                                </FormControl>
                            </Box>
                            <DialogActions>
                                <Button variant="plain" color="neutral" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                <Button type="submit">Create Profile</Button>
                            </DialogActions>
                        </form>
                    </DialogContent>
                </ModalDialog>
            </Modal>
            <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setNewProfileEmoji(e); setEmojiPickerOpen(false); }} isDark={isDark} />
        </Box>
    );
};

export default function NavSidebar({ 
    isMobile = false, onClose, installPrompt, onInstall
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    household, members, vehicles, user, isDark, api,
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
      return null;
  }, []);

  useEffect(() => {
      setActiveCategory(getCategoryFromPath(location.pathname));
  }, [location.pathname, getCategoryFromPath]);

  const handleNav = (to, category, hasSubItems) => {
      if (to) {
          // Preserve query params if navigating within finance? No, usually reset.
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

  // Helper to append profile ID to sub-item links
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
                    {enabledModules.includes('meals') && (
                        <RailIcon icon={<RestaurantMenu />} label="Meals" category="meals" to={`/household/${household.id}/meals`} location={location} activeCategory={activeCategory} hoveredCategory={hoveredCategory} onHover={setHoveredCategory} handleNav={handleNav} isMobile={isMobile} />
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

                <Tooltip title={isMobile ? "Account" : "Account & Settings"} variant="soft" placement="right">
                    <IconButton 
                        variant="plain" 
                        color={hoveredCategory === 'account' ? 'primary' : 'neutral'}
                        onClick={(e) => {
                            if (isMobile) {
                                setUserMenuAnchor(userMenuAnchor ? null : e.currentTarget);
                            } else {
                                setHoveredCategory(hoveredCategory === 'account' ? null : 'account');
                            }
                        }}
                        sx={{ 
                            p: 0.5, borderRadius: '50%', 
                            bgcolor: (userMenuAnchor || hoveredCategory === 'account') ? 'background.level1' : 'transparent' 
                        }}
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

                {/* Mobile Menu */}
                {isMobile && (
                    <Menu
                        anchorEl={userMenuAnchor}
                        open={Boolean(userMenuAnchor)}
                        onClose={() => setUserMenuAnchor(null)}
                        placement="top-end"
                        sx={{ minWidth: 200, borderRadius: 'md', boxShadow: 'md', zIndex: 3500 }}
                    >
                        <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography level="title-sm">{user?.first_name} {user?.last_name}</Typography>
                            <Typography level="body-xs" color="neutral">{user?.email}</Typography>
                        </Box>
                        <Divider />
                        <MenuItem onClick={() => { navigate(`/household/${household.id}/settings`); setUserMenuAnchor(null); }}>
                            <ListItemDecorator><SettingsIcon /></ListItemDecorator>
                            Settings
                        </MenuItem>
                        <MenuItem onClick={() => { navigate('/select-household'); setUserMenuAnchor(null); }}>
                            <ListItemDecorator><HomeWork /></ListItemDecorator>
                            Switch Household
                        </MenuItem>
                        <MenuItem onClick={() => { 
                            setUserMenuAnchor(null);
                            confirmAction("Log Out", "Are you sure you want to log out?", onLogout);
                        }}>
                            <ListItemDecorator><LogoutIcon color="danger" /></ListItemDecorator>
                            Log Out
                        </MenuItem>
                    </Menu>
                )}
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
                {currentPanelCategory === 'account' ? (
                    <>
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography level="title-md">Account</Typography>
                        </Box>
                        <Box sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark) }}>
                                    {user?.avatar || user?.first_name?.[0]}
                                </Avatar>
                                <Box>
                                    <Typography level="title-sm">{user?.first_name} {user?.last_name}</Typography>
                                    <Typography level="body-xs" color="neutral">{user?.email}</Typography>
                                </Box>
                            </Box>
                        </Box>
                        
                        <List sx={{ mt: 'auto', p: 1 }}>
                            <Divider sx={{ mb: 1 }} />
                            <SubItem label="Settings" onClick={() => handleNav(`/household/${household.id}/settings`, 'settings')} emoji="⚙️" isDark={isDark} />
                            <SubItem label="Switch Household" onClick={() => handleNav('/select-household', 'switch')} emoji="🔄" isDark={isDark} />
                            <SubItem label="Log Out" onClick={() => confirmAction("Log Out", "Are you sure?", onLogout)} emoji="🚪" isDark={isDark} />
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
                                <SubItem label="House Hub" to={`/household/${household.id}/house`} emoji="🏠" isDark={isDark} onClick={handleSubItemClick} />
                                <Divider sx={{ my: 1 }} />
                                <GroupHeader label="Residents" />
                                {members.filter(m => m.type !== 'pet').map(m => <SubItem key={m.id} label={m.alias || (m.name || '').split(' ')[0]} to={`/household/${household.id}/people/${m.id}`} emoji={m.emoji} isDark={isDark} onClick={handleSubItemClick} />)}
                                {enabledModules.includes('pets') && (
                                    <>
                                        <Divider sx={{ my: 1 }} />
                                        <GroupHeader label="Pets" />
                                        {members.filter(m => m.type === 'pet').map(m => <SubItem key={m.id} label={m.name} to={`/household/${household.id}/pets/${m.id}`} emoji={m.emoji} isDark={isDark} onClick={handleSubItemClick} />)}
                                    </>
                                )}
                                <Divider sx={{ my: 1 }} />
                                <GroupHeader label="Fleet" />
                                {vehicles.map(v => <SubItem key={v.id} label={`${v.make} ${v.model}`} to={`/household/${household.id}/vehicles/${v.id}`} emoji={v.emoji} isDark={isDark} onClick={handleSubItemClick} />)}
                            </>
                        )}
                                            {currentPanelCategory === 'finance' && (
                                                <>
                                                    <GroupHeader label="Overview" /><SubItem label="Budget" to={getFinanceLink('budget')} emoji="📊" isDark={isDark} onClick={handleSubItemClick} />                                <Divider sx={{ my: 1 }} /><GroupHeader label="Accounts" />
                                <SubItem label="Income" to={getFinanceLink('income')} emoji="💰" isDark={isDark} onClick={handleSubItemClick} />
                                <SubItem label="Banking" to={getFinanceLink('banking')} emoji="🏦" isDark={isDark} onClick={handleSubItemClick} />
                                <SubItem label="Savings" to={getFinanceLink('savings')} emoji="🐷" isDark={isDark} onClick={handleSubItemClick} />
                                <SubItem label="Investments" to={getFinanceLink('invest')} emoji="📈" isDark={isDark} onClick={handleSubItemClick} />
                                <SubItem label="Pensions" to={getFinanceLink('pensions')} emoji="👴" isDark={isDark} onClick={handleSubItemClick} />
                                <Divider sx={{ my: 1 }} /><GroupHeader label="Liabilities" />
                                <SubItem label="Credit Cards" to={getFinanceLink('credit')} emoji="💳" isDark={isDark} onClick={handleSubItemClick} />
                                <SubItem label="Loans" to={getFinanceLink('loans')} emoji="📝" isDark={isDark} onClick={handleSubItemClick} />
                                <SubItem label="Car Finance" to={getFinanceLink('car')} emoji="🚗" isDark={isDark} onClick={handleSubItemClick} />
                                <SubItem label="Mortgages" to={getFinanceLink('mortgage')} emoji="🏠" isDark={isDark} onClick={handleSubItemClick} />
                            </>
                        )}
                    </List>
                    </>
                )}
            </Sheet>
        )}
    </Box>
  );
}