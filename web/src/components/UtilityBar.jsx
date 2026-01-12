import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, IconButton, Tooltip, Sheet, Typography, Button
} from '@mui/joy';
import { 
  Calculate, NoteAlt, CalendarMonth, OpenInNew, KeyboardArrowDown, Savings
} from '@mui/icons-material';
import FloatingCalculator from './FloatingCalculator';
import FloatingCalendar from './FloatingCalendar';
import FinancialCalculator from './FinancialCalculator';
import PostItNote from './PostItNote';

// Utility Bar like Salesforce: persistent bar at bottom, items open upwards
export default function UtilityBar({ 
    user, api, dates, onDateAdded, onUpdateProfile, isDark
}) {
  const [activeWidget, setActiveWidget] = useState(null); // 'notes', 'calc', 'fincalc', 'calendar'
  const [poppedOut, setPoppedOut] = useState({});
  const popoutRefs = useRef({});

  // Poll for closed windows to reset state
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
      setActiveWidget(activeWidget === widget ? null : widget);
  };

  const handlePopout = (widget, url) => {
      const win = window.open(url, `Totem${widget}`, 'width=400,height=500,menubar=no,toolbar=no,location=no,status=no');
      popoutRefs.current[widget] = win;
      setPoppedOut(prev => ({ ...prev, [widget]: true }));
      setActiveWidget(null);
  };

  // Salesforce-style tab styling
  const tabSx = (id, color) => ({
      height: '100%',
      px: 2,
      borderRadius: 0,
      borderTop: '3px solid',
      borderColor: activeWidget === id ? `${color}.solidBg` : 'transparent',
      bgcolor: activeWidget === id ? 'background.level1' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minWidth: 120,
      '&:hover': { bgcolor: 'background.level1' }
  });

  return (
    <Box sx={{ position: 'relative', width: '100%', flexShrink: 0, zIndex: 2000 }}>
      {/* Docked Panel Container - Float above the bar */}
      <Box sx={{ position: 'absolute', bottom: '100%', left: 0, right: 0, height: 0, zIndex: 2002 }}>
          {activeWidget === 'notes' && !poppedOut.notes && (
              <Box sx={{ position: 'absolute', bottom: 0, left: 20 }}>
                  <PostItNote 
                    isDocked onClose={() => setActiveWidget(null)} user={user} onUpdateProfile={onUpdateProfile}
                    onPopout={() => handlePopout('notes', '/note-window')}
                  />
              </Box>
          )}
          {activeWidget === 'calc' && !poppedOut.calc && (
              <Box sx={{ position: 'absolute', bottom: 0, left: 150 }}>
                  <FloatingCalculator 
                    isDocked onClose={() => setActiveWidget(null)} isDark={isDark}
                    onPopout={() => handlePopout('calc', '/calculator')}
                  />
              </Box>
          )}
          {activeWidget === 'fincalc' && !poppedOut.fincalc && (
              <Box sx={{ position: 'absolute', bottom: 0, left: 280 }}>
                  <FinancialCalculator 
                    isDocked onClose={() => setActiveWidget(null)} isDark={isDark}
                    onPopout={() => handlePopout('fincalc', '/fin-calculator-window')}
                  />
              </Box>
          )}
          {activeWidget === 'calendar' && !poppedOut.calendar && (
              <Box sx={{ position: 'absolute', bottom: 0, left: 410 }}>
                  <FloatingCalendar 
                    isDocked onClose={() => setActiveWidget(null)} dates={dates} api={api} 
                    householdId={user?.default_household_id} currentUser={user} onDateAdded={onDateAdded} isDark={isDark}
                    onPopout={() => handlePopout('calendar', '/calendar-window')}
                  />
              </Box>
          )}
      </Box>

      {/* The Bar */}
      <Sheet
        variant="soft"
        sx={{
            height: 40,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            bgcolor: 'background.surface',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            zIndex: 2001
        }}
      >
        <Button variant="plain" color="neutral" sx={tabSx('notes', 'warning')} onClick={() => toggleWidget('notes')}>
            <NoteAlt fontSize="small" />
            <Typography level="body-xs" fontWeight="bold">Notes</Typography>
            {activeWidget === 'notes' && <KeyboardArrowDown fontSize="small" />}
        </Button>

        <Button variant="plain" color="neutral" sx={tabSx('calc', 'primary')} onClick={() => toggleWidget('calc')}>
            <Calculate fontSize="small" />
            <Typography level="body-xs" fontWeight="bold">Calculator</Typography>
            {activeWidget === 'calc' && <KeyboardArrowDown fontSize="small" />}
        </Button>

        <Button variant="plain" color="neutral" sx={tabSx('fincalc', 'success')} onClick={() => toggleWidget('fincalc')}>
            <Savings fontSize="small" />
            <Typography level="body-xs" fontWeight="bold">Finance</Typography>
            {activeWidget === 'fincalc' && <KeyboardArrowDown fontSize="small" />}
        </Button>

        <Button variant="plain" color="neutral" sx={tabSx('calendar', 'danger')} onClick={() => toggleWidget('calendar')}>
            <CalendarMonth fontSize="small" />
            <Typography level="body-xs" fontWeight="bold">Calendar</Typography>
            {activeWidget === 'calendar' && <KeyboardArrowDown fontSize="small" />}
        </Button>
      </Sheet>
    </Box>
  );
}