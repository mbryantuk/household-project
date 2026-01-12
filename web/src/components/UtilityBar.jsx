import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, IconButton, Tooltip, Sheet, Typography, Button
} from '@mui/joy';
import { 
  Calculate, NoteAlt, CalendarMonth, OpenInNew, KeyboardArrowDown, Savings, Close
} from '@mui/icons-material';
import FloatingCalculator from './FloatingCalculator';
import FloatingCalendar from './FloatingCalendar';
import FinancialCalculator from './FinancialCalculator';
import PostItNote from './PostItNote';

export default function UtilityBar({ 
    user, api, dates, onDateAdded, onUpdateProfile, isDark
}) {
  const [activeWidgets, setActiveWidgets] = useState({}); // { notes: true, calc: false }
  const [poppedOut, setPoppedOut] = useState({});
  const popoutRefs = useRef({});

  // Poll for closed windows
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
          // If popped out, focus the window or re-open it if blocked
          if (popoutRefs.current[widget] && !popoutRefs.current[widget].closed) {
              popoutRefs.current[widget].focus();
          } else {
              // State desync? Reset
              setPoppedOut(prev => ({ ...prev, [widget]: false }));
              setActiveWidgets(prev => ({ ...prev, [widget]: true }));
          }
      } else {
          setActiveWidgets(prev => ({ ...prev, [widget]: !prev[widget] }));
      }
  };

  const closeWidget = (widget) => {
      setActiveWidgets(prev => ({ ...prev, [widget]: false }));
  };

  const handlePopout = (widget, url) => {
      const win = window.open(url, `Totem${widget}`, 'width=400,height=500,menubar=no,toolbar=no,location=no,status=no');
      popoutRefs.current[widget] = win;
      setPoppedOut(prev => ({ ...prev, [widget]: true }));
      closeWidget(widget);
  };

  const WidgetWrapper = ({ id, label, icon: Icon, color, width, children }) => {
      const isOpen = activeWidgets[id] && !poppedOut[id];
      const isPopped = poppedOut[id];

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            {/* The Panel (if open) */}
            {isOpen && (
                <Box sx={{ 
                    width: width, 
                    height: 450, 
                    mb: 0, 
                    bgcolor: 'background.surface', 
                    borderTopLeftRadius: 'md', 
                    borderTopRightRadius: 'md', 
                    border: '1px solid', 
                    borderColor: 'divider',
                    borderBottom: 'none',
                    position: 'relative',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}>
                    {children}
                </Box>
            )}

            {/* The Button */}
            <Button 
                variant={isOpen ? "solid" : "plain"} 
                color={isOpen ? color : "neutral"} 
                onClick={() => toggleWidget(id)}
                sx={{
                    height: 40,
                    borderRadius: 0,
                    px: 2,
                    minWidth: 120,
                    gap: 1,
                    borderTop: isOpen ? 'none' : '3px solid transparent',
                    borderColor: isOpen ? 'transparent' : (isPopped ? `${color}.solidBg` : 'transparent'),
                    width: isOpen ? width : 'auto',
                    transition: 'width 0.2s'
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
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2000, pointerEvents: 'none' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', pointerEvents: 'auto', width: 'fit-content' }}>
        <Sheet
            variant="soft"
            sx={{
                height: 40,
                display: 'flex',
                alignItems: 'flex-end', // Align items to bottom
                bgcolor: 'background.surface',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                borderTopRightRadius: 'md'
            }}
        >
            <WidgetWrapper id="notes" label="Notes" icon={NoteAlt} color="warning" width={320}>
                <PostItNote 
                    isDocked onClose={() => closeWidget('notes')} user={user} onUpdateProfile={onUpdateProfile}
                    onPopout={() => handlePopout('notes', '/note-window')}
                />
            </WidgetWrapper>
            
            <WidgetWrapper id="calc" label="Calculator" icon={Calculate} color="primary" width={300}>
                <FloatingCalculator 
                    isDocked onClose={() => closeWidget('calc')} isDark={isDark}
                    onPopout={() => handlePopout('calc', '/calculator')}
                />
            </WidgetWrapper>

            <WidgetWrapper id="fincalc" label="Finance" icon={Savings} color="success" width={350}>
                <FinancialCalculator 
                    isDocked onClose={() => closeWidget('fincalc')} isDark={isDark}
                    onPopout={() => handlePopout('fincalc', '/fin-calculator-window')}
                />
            </WidgetWrapper>

            <WidgetWrapper id="calendar" label="Calendar" icon={CalendarMonth} color="danger" width={350}>
                 <FloatingCalendar 
                    isDocked onClose={() => closeWidget('calendar')} dates={dates} api={api} 
                    householdId={user?.default_household_id} currentUser={user} onDateAdded={onDateAdded} isDark={isDark}
                    onPopout={() => handlePopout('calendar', '/calendar-window')}
                  />
            </WidgetWrapper>
        </Sheet>
      </Box>
    </Box>
  );
}