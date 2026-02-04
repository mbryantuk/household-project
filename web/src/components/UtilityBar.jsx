import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { 
  Box, IconButton, Tooltip, Sheet, Typography, Divider, Chip
} from '@mui/joy';
import Wifi from '@mui/icons-material/Wifi';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import NoteAlt from '@mui/icons-material/NoteAlt';
import Calculate from '@mui/icons-material/Calculate';
import Payments from '@mui/icons-material/Payments';
import Savings from '@mui/icons-material/Savings';
import TrendingUp from '@mui/icons-material/TrendingUp';
import HourglassBottom from '@mui/icons-material/HourglassBottom';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import OpenInNew from '@mui/icons-material/OpenInNew';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';

import { useNavigate } from 'react-router-dom';
import FloatingCalculator from './FloatingCalculator';
import FloatingCalendar from './FloatingCalendar';
import FinancialCalculator from './FinancialCalculator';
import PostItNote from './PostItNote';
import TaxCalculator from './TaxCalculator';
import FloatingSavings from './FloatingSavings';
import FloatingInvestments from './FloatingInvestments';
import FloatingPensions from './FloatingPensions';
import { useHousehold } from '../contexts/HouseholdContext';

const WidgetWrapper = ({ id, label, icon: Icon, color, width, children, showLabel = true, variant = "plain", activeWidget, poppedOut, toggleWidget }) => {
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
            if (calcLeft + widgetWidth > screenWidth) calcLeft = screenWidth - widgetWidth - 10;
            if (calcLeft < 10) calcLeft = 10;
            setLeftPos(calcLeft);
        }
    }, [isOpen, width]);

    const renderIcon = () => (typeof Icon === 'function' ? <Icon /> : <Icon fontSize="small" />);

    return (
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {isOpen && (
              <Box sx={{ 
                  position: 'fixed', bottom: 42, left: leftPos, width: width || 250, 
                  maxHeight: 'calc(100vh - 60px)', bgcolor: 'background.surface', 
                  borderTopLeftRadius: 'md', borderTopRightRadius: 'md', 
                  border: '1px solid', borderColor: 'divider', boxShadow: 'lg', zIndex: 2005,
                  display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>{children}</Box>
          )}
          <IconButton 
              ref={buttonRef} variant={isOpen ? "solid" : variant} color={isOpen ? color : "neutral"} 
              onClick={() => toggleWidget(id)}
              sx={{ height: 44, width: 44, borderRadius: 0, transition: 'all 0.2s' }}
          >
              {renderIcon()}
          </IconButton>
      </Box>
    );
};

export default function UtilityBar() {
  const { user, api, dates, onDateAdded, onUpdateProfile, isDark, statusBarData, activeHouseholdId } = useHousehold();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeWidget, setActiveWidget] = useState(null); 
  const [poppedOut, setPoppedOut] = useState({});
  const popoutRefs = useRef({});

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollWidth - (scrollLeft + clientWidth) > 5);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      checkScroll();
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      const resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(el);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        resizeObserver.disconnect();
      };
    }
  }, [checkScroll]);

  const formatCurrency = (val) => (parseFloat(val) || 0).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  const toggleWidget = (widget) => {
      if (poppedOut[widget]) popoutRefs.current[widget]?.focus();
      else setActiveWidget(activeWidget === widget ? null : widget);
  };

  const handlePopout = (widget, url) => {
      popoutRefs.current[widget] = window.open(url, `Keystone${widget}`, 'width=450,height=600');
      setPoppedOut(prev => ({ ...prev, [widget]: true }));
      setActiveWidget(null);
  };

  return (
    <Sheet
        variant="soft"
        sx={{
            width: '100%', minHeight: 40, display: 'flex', alignItems: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)',
            borderTop: '1px solid', borderColor: 'rgba(0,0,0,0.08)', zIndex: 900, 
            [theme => theme.getColorSchemeSelector('dark')]: { bgcolor: 'rgba(19, 19, 24, 0.8)', borderColor: 'rgba(255,255,255,0.1)' }
        }}
    >
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            <Box ref={scrollRef} sx={{ display: 'flex', height: '100%', overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                <WidgetWrapper id="notes" label="Notes" icon={NoteAlt} color="warning" width={320} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <PostItNote isDocked onClose={() => setActiveWidget(null)} user={user} onUpdateProfile={onUpdateProfile} onPopout={() => handlePopout('notes', '/note-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="calc" label="Calc" icon={Calculate} color="primary" width={300} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingCalculator isDocked onClose={() => setActiveWidget(null)} isDark={isDark} onPopout={() => handlePopout('calc', '/calculator')} />
                </WidgetWrapper>
                <WidgetWrapper id="fincalc" label="Finance" icon={Payments} color="success" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FinancialCalculator isDocked onClose={() => setActiveWidget(null)} isDark={isDark} onPopout={() => handlePopout('fincalc', '/fin-calculator-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="savings" label="Savings" icon={Savings} color="success" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingSavings isDocked onClose={() => setActiveWidget(null)} api={api} householdId={activeHouseholdId} isDark={isDark} onPopout={() => handlePopout('savings', '/savings-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="calendar" label="Calendar" icon={CalendarMonth} color="danger" width={350} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                     <FloatingCalendar isDocked onClose={() => setActiveWidget(null)} dates={dates} api={api} householdId={activeHouseholdId} currentUser={user} onDateAdded={onDateAdded} isDark={isDark} onPopout={() => handlePopout('calendar', '/calendar-window')} />
                </WidgetWrapper>
            </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, ml: 'auto' }}>
            {statusBarData && (
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mr: 2 }}>
                    <Typography level="body-xs" fontWeight="bold">Selected: {statusBarData.count}</Typography>
                    <Typography level="body-xs">Total: <b>{formatCurrency(statusBarData.total)}</b></Typography>
                </Stack>
            )}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 0.5, opacity: 0.7 }}>
                <Wifi fontSize="small" color="success" />
                <Typography level="body-xs">Online</Typography>
            </Box>
        </Box>
    </Sheet>
  );
}