import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, IconButton, Tooltip, Sheet, Typography, Button, Divider, Avatar, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, Chip
} from '@mui/joy';
import { 
  Calculate, NoteAlt, CalendarMonth, OpenInNew, KeyboardArrowDown, Savings, Close, Wifi, Payments, Logout, SwapHoriz, Download, Edit, Settings
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import FloatingCalculator from './FloatingCalculator';
import FloatingCalendar from './FloatingCalendar';
import FinancialCalculator from './FinancialCalculator';
import PostItNote from './PostItNote';
import TaxCalculator from './TaxCalculator';
import { getEmojiColor } from '../theme';
import pkg from '../../package.json';

export default function UtilityBar({ 
    user, api, dates, onDateAdded, onUpdateProfile, isDark, onLogout,
    households = [], onSelectHousehold, onInstall, canInstall
}) {
  const navigate = useNavigate();
  const [activeWidget, setActiveWidget] = useState(null); 
  const [poppedOut, setPoppedOut] = useState({});
  const popoutRefs = useRef({});

  useEffect(() => {
    const timer = setInterval(() => {
        const nextPoppedOut = { ...poppedOut };
        let changed = false;
        Object.keys(popoutRefs.current).forEach(key => {
            if (popoutRefs.current[key] && popoutRefs.current[key].closed) {
                if (nextPoppedOut[key]) {
                    nextPoppedOut[key] = false;
                    changed = true;
                }
                popoutRefs.current[key] = null;
            }
        });
        if (changed) setPoppedOut(nextPoppedOut);
    }, 1000);
    return () => clearInterval(timer);
  }, [poppedOut]);

  const toggleWidget = (widget) => {
      if (poppedOut[widget]) {
          if (popoutRefs.current[widget] && !popoutRefs.current[widget].closed) {
              popoutRefs.current[widget].focus();
          } else {
              setPoppedOut(prev => ({ ...prev, [widget]: false }));
              setActiveWidget(widget);
          }
      } else {
          setActiveWidget(activeWidget === widget ? null : widget);
      }
  };

  const closeWidget = () => setActiveWidget(null);

  const handlePopout = (widget, url) => {
      const win = window.open(url, `Totem${widget}`, 'width=450,height=600,menubar=no,toolbar=no,location=no,status=no');
      popoutRefs.current[widget] = win;
      setPoppedOut(prev => ({ ...prev, [widget]: true }));
      closeWidget();
  };

  const WidgetWrapper = ({ id, label, icon: Icon, color, width, children, showLabel = true, variant = "plain", alignRight = false }) => {
      const isOpen = activeWidget === id && !poppedOut[id];
      const isPopped = poppedOut[id];

      const renderIcon = () => {
          if (typeof Icon === 'function') return <Icon />;
          return <Icon fontSize="small" />;
      };

      return (
        <Box sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
            {isOpen && (
                <Box sx={{ 
                    position: 'absolute', bottom: '100%', 
                    ...(alignRight ? { right: 0 } : { left: 0 }),
                    width: width || 250, 
                    maxHeight: 'calc(100vh - 80px)', 
                    mb: '1px', bgcolor: 'background.surface', borderTopLeftRadius: 'md', 
                    borderTopRightRadius: 'md', border: '1px solid', borderColor: 'divider',
                    borderBottom: 'none', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', 
                    overflow: 'hidden', zIndex: 2005,
                    display: 'flex', flexDirection: 'column',
                    '& *': {
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' }
                    }
                }}>
                    {children}
                </Box>
            )}
            <Button 
                variant={isOpen ? "solid" : variant} color={isOpen ? color : "neutral"} onClick={() => toggleWidget(id)}
                sx={{
                    height: '100%', borderRadius: 0, px: showLabel ? 2 : 1.5, minWidth: showLabel ? 100 : 44, gap: 1,
                    borderTop: isOpen ? 'none' : '3px solid transparent',
                    borderColor: isOpen ? 'transparent' : (isPopped ? `${color}.solidBg` : 'transparent'),
                    transition: 'all 0.2s'
                }}
            >
                {renderIcon()}
                {showLabel && <Typography level="body-xs" fontWeight="bold" textColor={isOpen ? 'common.white' : 'text.primary'}>{label}</Typography>}
                {showLabel && (isOpen ? <KeyboardArrowDown fontSize="small" /> : (isPopped ? <OpenInNew fontSize="small" /> : null))}
            </Button>
        </Box>
      );
  };

  const getRoleColor = (role) => {
    switch(role) {
        case 'admin': return 'primary';
        case 'member': return 'neutral';
        case 'viewer': return 'success';
        default: return 'neutral';
    }
  };

  return (
    <Sheet
        variant="soft"
        sx={{
            position: 'relative', width: '100%', height: 40, display: 'flex', alignItems: 'center',
            bgcolor: 'background.surface', borderTop: '1px solid', borderColor: 'divider', zIndex: 900, 
            flexShrink: 0, overflow: 'visible'
        }}
    >
        {/* Left Side: Widgets */}
        <Box sx={{ flex: '1 1 auto', display: 'flex', height: '100%' }}>
            <WidgetWrapper id="notes" label="Notes" icon={NoteAlt} color="warning" width={320}>
                <PostItNote isDocked onClose={closeWidget} user={user} onUpdateProfile={onUpdateProfile} onPopout={() => handlePopout('notes', '/note-window')} />
            </WidgetWrapper>
            
            <WidgetWrapper id="calc" label="Calc" icon={Calculate} color="primary" width={300}>
                <FloatingCalculator isDocked onClose={closeWidget} isDark={isDark} onPopout={() => handlePopout('calc', '/calculator')} />
            </WidgetWrapper>

            <WidgetWrapper id="fincalc" label="Finance" icon={Savings} color="success" width={400}>
                <FinancialCalculator isDocked onClose={closeWidget} isDark={isDark} onPopout={() => handlePopout('fincalc', '/fin-calculator-window')} />
            </WidgetWrapper>

            <WidgetWrapper id="tax" label="Tax" icon={Payments} color="warning" width={450}>
                <TaxCalculator isDocked onClose={closeWidget} isDark={isDark} onPopout={() => handlePopout('tax', '/tax-window')} />
            </WidgetWrapper>

            <WidgetWrapper id="calendar" label="Calendar" icon={CalendarMonth} color="danger" width={350}>
                 <FloatingCalendar isDocked onClose={closeWidget} dates={dates} api={api} householdId={user?.default_household_id} currentUser={user} onDateAdded={onDateAdded} isDark={isDark} onPopout={() => handlePopout('calendar', '/calendar-window')} />
            </WidgetWrapper>
        </Box>

        {/* Right Side: System Utilities */}
        <Box sx={{ flex: '0 0 auto', height: '100%', borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.level1', display: 'flex', alignItems: 'center', px: 0 }}>
            
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 0.5, opacity: 0.7, px: 1.5 }}>
                <Wifi fontSize="small" color="success" />
                <Typography level="body-xs">Online</Typography>
            </Box>
            
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.5, opacity: 0.7, px: 1.5 }}>
                <Tooltip title={`System Root: v${__SYSTEM_VERSION__}`} variant="soft" arrow>
                    <Typography level="body-xs" fontWeight="600" sx={{ cursor: 'help' }}>v{pkg.version}</Typography>
                </Tooltip>
            </Box>

            {canInstall && (
                <Tooltip title="Install App" variant="soft">
                    <IconButton size="sm" variant="plain" color="success" onClick={onInstall} sx={{ height: '100%', borderRadius: 0, px: 1.5 }}>
                        <Download fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            <WidgetWrapper 
                id="account" 
                label="Account" 
                icon={() => <Avatar size="sm" sx={{ width: 22, height: 22, fontSize: '0.75rem', bgcolor: getEmojiColor(user?.avatar || '👤', isDark) }}>{user?.avatar || user?.first_name?.[0]}</Avatar>} 
                color="neutral" 
                width={280} 
                showLabel={false} 
                alignRight
            >
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                    <Avatar size="lg" sx={{ bgcolor: getEmojiColor(user?.avatar || '👤', isDark) }}>{user?.avatar || user?.first_name?.[0]}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography level="title-sm" noWrap>{user?.first_name} {user?.last_name}</Typography>
                            <Chip size="sm" variant="soft" color={getRoleColor(user?.role)} sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '10px' }}>
                                {user?.role}
                            </Chip>
                        </Stack>
                        <Typography level="body-xs" noWrap>{user?.email}</Typography>
                    </Box>
                </Box>
                
                <Box sx={{ overflowY: 'auto', flexGrow: 1, maxHeight: 'calc(100vh - 200px)' }}>
                    <List size="sm" sx={{ p: 1 }}>
                        <ListItem>
                            <ListItemButton onClick={() => { navigate('profile'); closeWidget(); }}>
                                <ListItemDecorator><Edit fontSize="small" /></ListItemDecorator>
                                <ListItemContent>Edit Profile</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton onClick={() => { navigate('settings'); closeWidget(); }}>
                                <ListItemDecorator><Settings fontSize="small" /></ListItemDecorator>
                                <ListItemContent>Household Settings</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                    </List>

                    <Divider sx={{ my: 1 }}>
                        <Typography level="body-xs" fontWeight="bold" sx={{ px: 1, textTransform: 'uppercase' }}>Switch Household</Typography>
                    </Divider>

                    <List size="sm" sx={{ '--ListItem-radius': '0px', p: 0 }}>
                        {households.map(hh => (
                            <ListItem key={hh.id}>
                                <ListItemButton selected={hh.id === user?.default_household_id} onClick={() => { onSelectHousehold(hh); navigate(`/household/${hh.id}/dashboard`); closeWidget(); }}>
                                    <ListItemDecorator>
                                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(hh.avatar || '🏠', isDark) }}>{hh.avatar || '🏠'}</Avatar>
                                    </ListItemDecorator>
                                    <ListItemContent>
                                        <Typography level="title-sm">{hh.name}</Typography>
                                        <Typography level="body-xs">{hh.role}</Typography>
                                    </ListItemContent>
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ my: 1 }} />
                    
                    <List size="sm" sx={{ p: 1 }}>
                        <ListItem>
                            <ListItemButton color="danger" variant="soft" onClick={onLogout}>
                                <ListItemDecorator><Logout fontSize="small" /></ListItemDecorator>
                                <ListItemContent>Logout</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            </WidgetWrapper>
        </Box>
    </Sheet>
  );
}
