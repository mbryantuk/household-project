import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { 
  Box, IconButton, Tooltip, Sheet, Typography, Divider, Chip, Stack
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
import AccountBalance from '@mui/icons-material/AccountBalance';
import AttachMoney from '@mui/icons-material/AttachMoney';
import CreditCard from '@mui/icons-material/CreditCard';
import ReceiptLong from '@mui/icons-material/ReceiptLong';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsCar from '@mui/icons-material/DirectionsCar';

import { useNavigate } from 'react-router-dom';
import FloatingCalculator from './FloatingCalculator';
import FloatingCalendar from './FloatingCalendar';
import FinancialCalculator from './FinancialCalculator';
import PostItNote from './PostItNote';
import TaxCalculator from './TaxCalculator';
import FloatingSavings from './FloatingSavings';
import FloatingInvestments from './FloatingInvestments';
import FloatingPensions from './FloatingPensions';

import IncomeWidget from './widgets/IncomeWidget';
import BankingWidget from './widgets/BankingWidget';
import CreditCardWidget from './widgets/CreditCardWidget';
import LoansWidget from './widgets/LoansWidget';
import MortgageWidget from './widgets/MortgageWidget';
import VehicleFinanceWidget from './widgets/VehicleFinanceWidget';

import { useHousehold } from '../contexts/HouseholdContext';

const WidgetWrapper = ({ id, label, icon: Icon, color, width, children, activeWidget, poppedOut, toggleWidget }) => {
    const isOpen = activeWidget === id && !poppedOut[id];
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
          <Tooltip title={label} variant="soft">
            <IconButton 
                ref={buttonRef} variant={isOpen ? "solid" : "plain"} color={isOpen ? color : "neutral"} 
                onClick={() => toggleWidget(id)}
                sx={{ height: 44, width: 44, borderRadius: 0, transition: 'all 0.2s' }}
            >
                {renderIcon()}
            </IconButton>
          </Tooltip>
      </Box>
    );
};

export default function UtilityBar() {
  const { user, api, dates, onDateAdded, onUpdateProfile, isDark, statusBarData, activeHouseholdId, household } = useHousehold();
  const scrollRef = useRef(null);
  const [activeWidget, setActiveWidget] = useState(null); 
  const [poppedOut, setPoppedOut] = useState({});
  const popoutRefs = useRef({});

  const formatCurrency = (val) => (parseFloat(val) || 0).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  const toggleWidget = (widget) => {
      if (poppedOut[widget]) popoutRefs.current[widget]?.focus();
      else setActiveWidget(activeWidget === widget ? null : widget);
  };

  const handlePopout = (widget, url) => {
      popoutRefs.current[widget] = window.open(url, `Mantel${widget}`, 'width=450,height=600');
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
                <WidgetWrapper id="calc" label="Calculator" icon={Calculate} color="primary" width={300} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingCalculator isDocked onClose={() => setActiveWidget(null)} isDark={isDark} onPopout={() => handlePopout('calc', '/calculator')} />
                </WidgetWrapper>
                
                <Divider orientation="vertical" sx={{ mx: 0.5, height: '60%' }} />

                <WidgetWrapper id="income" label="Income" icon={AttachMoney} color="success" width={350} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <IncomeWidget api={api} household={household} />
                </WidgetWrapper>
                <WidgetWrapper id="accounts" label="Banking" icon={AccountBalance} color="success" width={350} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <BankingWidget api={api} household={household} />
                </WidgetWrapper>
                <WidgetWrapper id="savings" label="Savings & Pots" icon={Savings} color="success" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingSavings isDocked onClose={() => setActiveWidget(null)} api={api} householdId={household?.id} isDark={isDark} onPopout={() => handlePopout('savings', '/savings-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="invest" label="Investments" icon={TrendingUp} color="primary" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingInvestments isDocked onClose={() => setActiveWidget(null)} api={api} householdId={household?.id} isDark={isDark} onPopout={() => handlePopout('invest', '/investments-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="pensions" label="Pensions" icon={HourglassBottom} color="warning" width={400} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <FloatingPensions isDocked onClose={() => setActiveWidget(null)} api={api} householdId={household?.id} isDark={isDark} onPopout={() => handlePopout('pensions', '/pensions-window')} />
                </WidgetWrapper>
                <WidgetWrapper id="credit" label="Credit Cards" icon={CreditCard} color="danger" width={350} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <CreditCardWidget api={api} household={household} />
                </WidgetWrapper>
                <WidgetWrapper id="loans" label="Personal Loans" icon={ReceiptLong} color="danger" width={350} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <LoansWidget api={api} household={household} />
                </WidgetWrapper>
                <WidgetWrapper id="mortgage" label="Mortgages" icon={HomeIcon} color="danger" width={350} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <MortgageWidget api={api} household={household} />
                </WidgetWrapper>
                <WidgetWrapper id="carfin" label="Car Finance" icon={DirectionsCar} color="danger" width={350} activeWidget={activeWidget} poppedOut={poppedOut} toggleWidget={toggleWidget}>
                    <VehicleFinanceWidget api={api} household={household} />
                </WidgetWrapper>

                <Divider orientation="vertical" sx={{ mx: 0.5, height: '60%' }} />

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
        </Box>
    </Sheet>
  );
}
