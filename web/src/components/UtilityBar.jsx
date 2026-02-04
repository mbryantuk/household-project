import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { 
  Box, IconButton, Tooltip, Sheet, Typography, Button, Divider, Avatar, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, Chip, Stack
} from '@mui/joy';
import { 
  Calculate, NoteAlt, CalendarMonth, OpenInNew, KeyboardArrowDown, Logout, Wifi, Download, Edit, Settings, ChevronLeft, ChevronRight, Payments,
  Savings, TrendingUp, HourglassBottom
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import FloatingCalculator from './FloatingCalculator';
import FloatingCalendar from './FloatingCalendar';
import FinancialCalculator from './FinancialCalculator';
import PostItNote from './PostItNote';
import TaxCalculator from './TaxCalculator';
import FloatingSavings from './FloatingSavings';
import FloatingInvestments from './FloatingInvestments';
import FloatingPensions from './FloatingPensions';
import { getEmojiColor } from '../theme';
import pkg from '../../package.json';
import gitInfo from '../git-info.json';

const WidgetWrapper = ({ id, label, icon: Icon, color, width, children, showLabel = true, variant = "plain", alignRight = false, activeWidget, poppedOut, toggleWidget }) => {
    const isOpen = activeWidget === id && !poppedOut[id];
    const isPopped = poppedOut[id];
    const buttonRef = useRef(null);
    const [leftPos, setLeftPos] = useState(0);

    useLayoutEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const widgetWidth = width || 250;
            const screenWidth = window.innerWidth;
            
            let calcLeft = rect.left;
            if (alignRight) {
                calcLeft = rect.right - widgetWidth;
            }

            if (calcLeft + widgetWidth > screenWidth) {
                calcLeft = screenWidth - widgetWidth - 10;
            }
            if (calcLeft < 10) {
                calcLeft = 10;
            }

            Promise.resolve().then(() => setLeftPos(calcLeft));
        }
    }, [isOpen, width, alignRight]);

    const renderIcon = () => {
        if (typeof Icon === 'function') return <Icon />;
        return <Icon fontSize="small" />;
    };

    return (
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {isOpen && (
              <Box sx={{ 
                  position: 'fixed', 
                  bottom: 42,
                  left: leftPos,
                  width: width || 250, 
                  maxHeight: 'calc(100vh - 60px)', 
                  bgcolor: 'background.surface', 
                  borderTopLeftRadius: 'md', 
                  borderTopRightRadius: 'md', 
                  border: '1px solid', borderColor: 'divider',
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', 
                  overflow: 'hidden', 
                  zIndex: 2005,
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
              ref={buttonRef}
              variant={isOpen ? "solid" : variant} color={isOpen ? color : "neutral"} onClick={() => toggleWidget(id)}
              sx={{
                  height: { xs: 44, md: '100%' }, 
                  borderRadius: { xs: 'sm', md: 0 }, 
                  px: showLabel ? 2 : 1.5, 
                  minWidth: showLabel ? 100 : 44, 
                  gap: 1,
                  borderTop: { xs: 'none', md: isOpen ? 'none' : '3px solid transparent' },
                  borderColor: isOpen ? 'transparent' : (isPopped ? `${color}.solidBg` : 'transparent'),
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flexGrow: { xs: 1, md: 0 }
              }}
          >
              {renderIcon()}
              {showLabel && <Typography level="body-xs" fontWeight="bold" textColor={isOpen ? 'common.white' : 'text.primary'}>{label}</Typography>}
              {showLabel && (isOpen ? <KeyboardArrowDown fontSize="small" /> : (isPopped ? <OpenInNew fontSize="small" /> : null))}
          </Button>
      </Box>
    );
};

export default function UtilityBar({
    user, api, dates, onDateAdded, onUpdateProfile, isDark, onLogout,
    households = [], onSelectHousehold, onInstall, canInstall, confirmAction,
    activeHouseholdId,
    statusBarData
}) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);

  const scroll = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      checkScroll();
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      
      const resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(el);

      // Force multiple checks as items might render/re-flow
      const timer1 = setTimeout(checkScroll, 100);
      const timer2 = setTimeout(checkScroll, 1000);
      
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        resizeObserver.disconnect();
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [checkScroll, households, statusBarData]);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
          }
          else {
              setPoppedOut(prev => ({ ...prev, [widget]: false }));
              setActiveWidget(widget);
          }
      }
      else {
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

  const getRoleColor = (role) => {
    switch(role) {
        case 'admin': return 'primary';
        case 'member': return 'neutral';
        case 'viewer': return 'success';
        default: return 'neutral';
    }
  };

    const isMobile = window.innerWidth < 600;

    return (
    <Sheet
        variant="soft"
        sx={{
            position: 'relative', width: '100%', minHeight: 40, display: 'flex', alignItems: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid', 
            borderColor: 'rgba(0,0,0,0.08)',
            zIndex: 900, 
            flexShrink: 0, overflow: 'hidden',
            flexDirection: { xs: 'column', md: 'row' },
            py: { xs: 1, md: 0 },
            [theme => theme.getColorSchemeSelector('dark')]: {
                bgcolor: 'rgba(19, 19, 24, 0.8)',
                borderColor: 'rgba(255,255,255,0.1)',
            }
        }}
    >
        <Box sx={{ 
            flex: '1 1 auto', display: 'flex', width: '100%', alignItems: 'center', position: 'relative',
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            justifyContent: { xs: 'center', md: 'flex-start' },
            gap: { xs: 1, md: 0 },
            minWidth: 0
        }}>
            {/* Left Hint Gradient - Desktop Only */}
            {!isMobile && canScrollLeft && (
                <Box sx={{ 
                    position: 'absolute', left: 0, zIndex: 5, height: '100%', width: 60,
                    pointerEvents: 'none',
                    background: 'linear-gradient(to right, var(--joy-palette-background-surface) 30%, transparent)'
                }} />
            )}
            
            {!isMobile && canScrollLeft && (
                <Box sx={{ 
                    position: 'absolute', left: 0, zIndex: 6, height: '100%', display: 'flex', alignItems: 'center',
                    bgcolor: 'background.surface', borderRight: '1px solid', borderColor: 'divider',
                    boxShadow: '4px 0 8px rgba(0,0,0,0.05)'
                }}>
                    <IconButton onClick={() => scroll(-200)} variant="plain" size="sm" sx={{ borderRadius: 0, height: '100%' }}>
                        <ChevronLeft />
                    </IconButton>
                </Box>
            )}

            <Box ref={scrollRef} sx={{ 
                display: 'flex', 
                height: '100%', 
                overflowX: { xs: 'visible', md: 'auto' }, 
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                justifyContent: { xs: 'center', md: 'flex-start' },
                scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, 
                flexGrow: 1,
                gap: { xs: 1, md: 0 }
            }}>
                <WidgetWrapper id="notes" label="Notes" icon={NoteAlt} color="warning" width={320} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <PostItNote isDocked onClose={closeWidget} user={user} onUpdateProfile={onUpdateProfile} onPopout={() => handlePopout('notes', '/note-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="calc" label="Calc" icon={Calculate} color="primary" width={300} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingCalculator isDocked onClose={closeWidget} isDark={isDark} onPopout={() => handlePopout('calc', '/calculator')} />
                </WidgetWrapper>
                <WidgetWrapper id="fincalc" label="Finance" icon={Payments} color="success" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FinancialCalculator isDocked onClose={closeWidget} isDark={isDark} onPopout={() => handlePopout('fincalc', '/fin-calculator-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="tax" label="Tax" icon={Payments} color="warning" width={450} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <TaxCalculator isDocked onClose={closeWidget} isDark={isDark} onPopout={() => handlePopout('tax', '/tax-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="savings" label="Savings" icon={Savings} color="success" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingSavings isDocked onClose={closeWidget} api={api} householdId={activeHouseholdId} isDark={isDark} onPopout={() => handlePopout('savings', '/savings-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="invest" label="Investments" icon={TrendingUp} color="primary" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingInvestments isDocked onClose={closeWidget} api={api} householdId={activeHouseholdId} isDark={isDark} onPopout={() => handlePopout('invest', '/investments-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="pensions" label="Pensions" icon={HourglassBottom} color="warning" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingPensions isDocked onClose={closeWidget} api={api} householdId={activeHouseholdId} isDark={isDark} onPopout={() => handlePopout('pensions', '/pensions-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="calendar" label="Calendar" icon={CalendarMonth} color="danger" width={350} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                     <FloatingCalendar isDocked onClose={closeWidget} dates={dates} api={api} householdId={activeHouseholdId} currentUser={user} onDateAdded={onDateAdded} isDark={isDark} onPopout={() => handlePopout('calendar', '/calendar-window')} />
                </WidgetWrapper>
            </Box>

            {/* Right Hint Gradient - Desktop Only */}
            {!isMobile && canScrollRight && (
                <Box sx={{ 
                    position: 'absolute', right: 0, zIndex: 5, height: '100%', width: 60,
                    pointerEvents: 'none',
                    background: 'linear-gradient(to left, var(--joy-palette-background-surface) 30%, transparent)'
                }} />
            )}

            {!isMobile && canScrollRight && (
                <Box sx={{ 
                    position: 'absolute', right: 0, zIndex: 6, height: '100%', display: 'flex', alignItems: 'center',
                    bgcolor: 'background.surface', borderLeft: '1px solid', borderColor: 'divider',
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.1)'
                }}>
                    <IconButton onClick={() => scroll(200)} variant="plain" size="sm" sx={{ borderRadius: 0, height: '100%' }}>
                        <ChevronRight />
                    </IconButton>
                </Box>
            )}
        </Box>

        <Box sx={{ 
            flex: { xs: '1 1 100%', md: '0 0 auto' }, 
            width: { xs: '100%', md: 'auto' },
            height: { xs: 'auto', md: '100%' }, 
            borderLeft: { md: '1px solid' }, 
            borderTop: { xs: '1px solid', md: 'none' },
            borderColor: 'divider', 
            bgcolor: 'background.level1', 
            display: 'flex', alignItems: 'center', 
            justifyContent: { xs: 'space-between', md: 'flex-start' },
            px: { xs: 2, md: 0 },
            py: { xs: 1, md: 0 },
            mt: { xs: 1, md: 0 }
        }}>
            {statusBarData && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, borderRight: '1px solid', borderColor: 'divider', height: '100%', bgcolor: 'primary.softBg' }}>
                    <Typography level="body-xs" fontWeight="bold">Selected: {statusBarData.count}</Typography>
                    <Typography level="body-xs">Total: <b>{formatCurrency(statusBarData.total)}</b></Typography>
                    
                    {statusBarData.paid > 0 && statusBarData.unpaid > 0 ? (
                        <>
                            <Divider orientation="vertical" sx={{ mx: 0.5, height: '60%' }} />
                            <Typography level="body-xs" color="success">Paid: <b>{formatCurrency(statusBarData.paid)}</b></Typography>
                            <Typography level="body-xs" color="danger">Unpaid: <b>{formatCurrency(statusBarData.unpaid)}</b></Typography>
                        </>
                    ) : statusBarData.paid > 0 ? (
                        <Chip size="sm" variant="soft" color="success" sx={{ fontSize: '10px', fontWeight: 'bold' }}>ALL PAID</Chip>
                    ) : statusBarData.unpaid > 0 ? (
                        <Chip size="sm" variant="soft" color="danger" sx={{ fontSize: '10px', fontWeight: 'bold' }}>ALL UNPAID</Chip>
                    ) : null}
                </Box>
            )}

            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 0.5, opacity: 0.7, px: 1.5 }}>
                <Wifi fontSize="small" color="success" />
                <Typography level="body-xs">Online</Typography>
            </Box>
            
            {canInstall && (
                <Tooltip title="Install App" variant="soft">
                    <IconButton size="sm" variant="plain" color="success" onClick={onInstall} sx={{ height: '100%', borderRadius: 0, px: 1.5 }}>
                        <Download fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            <Tooltip title="Log Out" variant="soft">
                <IconButton 
                    size="sm" 
                    variant="plain" 
                    color="danger" 
                    onClick={() => confirmAction("Log Out", "Are you sure you want to log out?", onLogout)}
                    sx={{ height: '100%', borderRadius: 0, px: 1.5 }}
                >
                    <Logout fontSize="small" />
                </IconButton>
            </Tooltip>

            <WidgetWrapper 
                id="account" 
                label="Account" 
                icon={() => <Avatar size="sm" sx={{ width: 22, height: 22, fontSize: '0.75rem', bgcolor: getEmojiColor(user?.avatar || '👤', isDark) }}>{user?.avatar || user?.first_name?.[0]}</Avatar>} 
                color="neutral" 
                width={280} 
                showLabel={false} 
                alignRight
                activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}
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
                                <ListItemButton selected={hh.id === user?.default_household_id} onClick={async () => { await onSelectHousehold(hh); navigate(`/household/${hh.id}/dashboard`); closeWidget(); }}>
                                    <ListItemDecorator>
                                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(hh.avatar || '🏠', isDark) }}>{hh.avatar || '🏠'}</Avatar>
                                    </ListItemDecorator>
                                    <ListItemContent>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography level="title-sm">{hh.name}</Typography>
                                            <Chip size="sm" variant="soft" color={getRoleColor(hh.role)} sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '10px' }}>
                                                {hh.role}
                                            </Chip>
                                        </Stack>
                                    </ListItemContent>
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center', opacity: 0.5 }}>
                        <Tooltip title={gitInfo.commitMessage || "Unknown"} variant="soft" size="sm">
                            <Typography level="body-xs">Totem v{pkg.version}</Typography>
                        </Tooltip>
                    </Box>
                </Box>
            </WidgetWrapper>
        </Box>
    </Sheet>
  );
}