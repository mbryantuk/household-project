import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, IconButton, Tooltip, Sheet, Typography, Button
} from '@mui/joy';
import { 
  Calculate, NoteAlt, CalendarMonth, OpenInNew, KeyboardArrowDown, Savings, Close, Wifi, Payments
} from '@mui/icons-material';
import FloatingCalculator from './FloatingCalculator';
import FloatingCalendar from './FloatingCalendar';
import FinancialCalculator from './FinancialCalculator';
import PostItNote from './PostItNote';
import TaxCalculator from './TaxCalculator';
import pkg from '../../package.json';

export default function UtilityBar({ 
    user, api, dates, onDateAdded, onUpdateProfile, isDark
}) {
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

  const WidgetWrapper = ({ id, label, icon: Icon, color, width, children }) => {
      const isOpen = activeWidget === id && !poppedOut[id];
      const isPopped = poppedOut[id];

      return (
        <Box sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
            {isOpen && (
                <Box sx={{ 
                    position: 'absolute', bottom: '100%', left: 0, width: width, height: 500, 
                    mb: '1px', bgcolor: 'background.surface', borderTopLeftRadius: 'md', 
                    borderTopRightRadius: 'md', border: '1px solid', borderColor: 'divider',
                    borderBottom: 'none', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 2005
                }}>
                    {children}
                </Box>
            )}
            <Button 
                variant={isOpen ? "solid" : "plain"} color={isOpen ? color : "neutral"} onClick={() => toggleWidget(id)}
                sx={{
                    height: '100%', borderRadius: 0, px: 2, minWidth: 100, gap: 1,
                    borderTop: isOpen ? 'none' : '3px solid transparent',
                    borderColor: isOpen ? 'transparent' : (isPopped ? `${color}.solidBg` : 'transparent'),
                    transition: 'all 0.2s'
                }}
            >
                <Icon fontSize="small" />
                <Typography level="body-xs" fontWeight="bold" textColor={isOpen ? 'common.white' : 'text.primary'}>{label}</Typography>
                {isOpen ? <KeyboardArrowDown fontSize="small" /> : (isPopped ? <OpenInNew fontSize="small" /> : null)}
            </Button>
        </Box>
      );
  };

  return (
    <Sheet
        variant="soft"
        sx={{
            position: 'relative', width: '100%', height: 40, display: 'flex', alignItems: 'center',
            bgcolor: 'background.surface', borderTop: '1px solid', borderColor: 'divider', zIndex: 900, flexShrink: 0
        }}
    >
        <Box sx={{ flex: '1 1 75%', display: 'flex', height: '100%' }}>
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

        <Box sx={{ flex: '0 0 25%', height: '100%', borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.level1', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 2, gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.7 }}><Wifi fontSize="small" color="success" /><Typography level="body-xs">Online</Typography></Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.7 }}><Typography level="body-xs" fontWeight="600">v{pkg.version}</Typography></Box>
        </Box>
    </Sheet>
  );
}
