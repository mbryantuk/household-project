import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box, Typography, Button, Stack, IconButton, Sheet, Menu, MenuItem, Grid, Divider } from '@mui/joy';
import Add from '@mui/icons-material/Add';
import Save from '@mui/icons-material/Save';
import Edit from '@mui/icons-material/Edit';
import Close from '@mui/icons-material/Close';
import Settings from '@mui/icons-material/Settings';

import { Responsive } from 'react-grid-layout/legacy';
import WidthProvider from '../components/helpers/WidthProvider';

import BirthdaysWidget from '../components/widgets/BirthdaysWidget';
import EventsWidget from '../components/widgets/EventsWidget';
import HomeRecurringCostsWidget from '../components/widgets/HomeRecurringCostsWidget';
import VehiclesWidget from '../components/widgets/VehiclesWidget';
import NotesWidget from '../components/widgets/NotesWidget';
import CalculatorWidget from '../components/widgets/CalculatorWidget';
import FinancialWidget from '../components/widgets/FinancialWidget';
import TaxWidget from '../components/widgets/TaxWidget';
import CalendarWidget from '../components/widgets/CalendarWidget';
import SavingsWidget from '../components/widgets/SavingsWidget';
import InvestmentsWidget from '../components/widgets/InvestmentsWidget';
import PensionsWidget from '../components/widgets/PensionsWidget';
import WealthWidget from '../components/widgets/WealthWidget';
import BudgetStatusWidget from '../components/widgets/BudgetStatusWidget';
import ClockWidget from '../components/widgets/ClockWidget';

import IncomeWidget from '../components/widgets/IncomeWidget';
import BankingWidget from '../components/widgets/BankingWidget';
import CreditCardWidget from '../components/widgets/CreditCardWidget';
import LoansWidget from '../components/widgets/LoansWidget';
import MortgageWidget from '../components/widgets/MortgageWidget';
import VehicleFinanceWidget from '../components/widgets/VehicleFinanceWidget';

import ErrorBoundary from '../components/ErrorBoundary';
import WidgetSkeleton from '../components/ui/WidgetSkeleton';
import { useHousehold } from '../contexts/HouseholdContext';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_TYPES = {
  clock: { component: ClockWidget, label: 'System Clock', defaultH: 4, defaultW: 4 },
  budget_status: { component: BudgetStatusWidget, label: 'Budget Health', defaultH: 5, defaultW: 4 },
  wealth: { component: WealthWidget, label: 'Wealth Tracking', defaultH: 7, defaultW: 4 },
  birthdays: { component: BirthdaysWidget, label: 'Upcoming Birthdays', defaultH: 4, defaultW: 4 },
  events: { component: EventsWidget, label: 'Calendar Events', defaultH: 4, defaultW: 6 },
  costs: { component: HomeRecurringCostsWidget, label: 'Monthly Costs', defaultH: 4, defaultW: 6 },
  vehicles: { component: VehiclesWidget, label: 'Fleet Status', defaultH: 4, defaultW: 4 },
  notes: { component: NotesWidget, label: 'Sticky Note', defaultH: 4, defaultW: 4 },
  calc: { component: CalculatorWidget, label: 'Calculator', defaultH: 5, defaultW: 4 },
  finance: { component: FinancialWidget, label: 'Finance Tools', defaultH: 6, defaultW: 5 },
  tax: { component: TaxWidget, label: 'Tax Tools', defaultH: 6, defaultW: 5 },
  calendar: { component: CalendarWidget, label: 'Full Calendar', defaultH: 8, defaultW: 8 },
  savings: { component: SavingsWidget, label: 'Savings Tracker', defaultH: 4, defaultW: 4 },
  invest: { component: InvestmentsWidget, label: 'Investments', defaultH: 4, defaultW: 4 },
  pensions: { component: PensionsWidget, label: 'Pensions', defaultH: 4, defaultW: 4 },
  
  income: { component: IncomeWidget, label: 'Income', defaultH: 4, defaultW: 4 },
  banking: { component: BankingWidget, label: 'Banking', defaultH: 4, defaultW: 4 },
  credit: { component: CreditCardWidget, label: 'Credit Cards', defaultH: 4, defaultW: 4 },
  loans: { component: LoansWidget, label: 'Loans', defaultH: 4, defaultW: 4 },
  mortgage: { component: MortgageWidget, label: 'Mortgages', defaultH: 4, defaultW: 4 },
  carfin: { component: VehicleFinanceWidget, label: 'Car Finance', defaultH: 4, defaultW: 4 },
};

const DEFAULT_LAYOUT = [
  // Primary Row
  { i: 'clock-1', x: 0, y: 0, w: 4, h: 4, type: 'clock' },
  { i: 'budget-1', x: 4, y: 0, w: 4, h: 5, type: 'budget_status' },
  { i: 'wealth-1', x: 8, y: 0, w: 4, h: 7, type: 'wealth' },
  
  // Finance Row 1
  { i: 'income-1', x: 0, y: 4, w: 4, h: 4, type: 'income' },
  { i: 'banking-1', x: 4, y: 5, w: 4, h: 4, type: 'banking' },
  { i: 'savings-1', x: 8, y: 7, w: 4, h: 4, type: 'savings' },

  // Interaction Row
  { i: 'calendar-1', x: 0, y: 8, w: 8, h: 8, type: 'calendar' },
  { i: 'notes-1', x: 8, y: 11, w: 4, h: 8, type: 'notes' },

  // Finance Row 2 (Liabilities)
  { i: 'credit-1', x: 0, y: 16, w: 4, h: 4, type: 'credit' },
  { i: 'loans-1', x: 4, y: 16, w: 4, h: 4, type: 'loans' },
  { i: 'mortgage-1', x: 8, y: 19, w: 4, h: 4, type: 'mortgage' },

  // Archive Row
  { i: 'pensions-1', x: 0, y: 20, w: 4, h: 4, type: 'pensions' },
  { i: 'vehicles-1', x: 4, y: 20, w: 4, h: 4, type: 'vehicles' },
  { i: 'carfin-1', x: 8, y: 23, w: 4, h: 4, type: 'carfin' },
  { i: 'birthdays-1', x: 0, y: 24, w: 4, h: 4, type: 'birthdays' },
];

export default function HomeView() {
  const { members, household, user, dates, onUpdateProfile, api } = useHousehold();
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [breakpoint, setBreakpoint] = useState('lg');
  const [addWidgetAnchor, setAddWidgetAnchor] = useState(null);

  const [layouts, setLayouts] = useState(() => {
    if (user?.dashboard_layout) {
      try {
        const cloud = typeof user.dashboard_layout === 'string' 
          ? JSON.parse(user.dashboard_layout) 
          : user.dashboard_layout;
        if (cloud && Object.keys(cloud).length > 0) return cloud;
      } catch (err) { console.error("Cloud Layout Parse Error", err); }
    }
    return { 1: DEFAULT_LAYOUT };
  });

  const currentItems = useMemo(() => {
    const pageLayout = layouts[page] || { lg: [], md: [], sm: [] };
    if (Array.isArray(pageLayout)) return pageLayout;
    return pageLayout[breakpoint] || pageLayout.lg || [];
  }, [layouts, page, breakpoint]);

  const gridItems = useMemo(() => currentItems.map(item => ({ ...item, static: !isEditing })), [currentItems, isEditing]);

  const handleLayoutChange = (currentLayout, allLayouts) => {
    if (!isEditing) return;
    setLayouts(prev => {
        const pageLayouts = prev[page] || { lg: [], md: [], sm: [] };
        const updated = {};
        Object.keys(allLayouts).forEach(bp => {
            updated[bp] = allLayouts[bp].map(l => {
                let existing = null;
                if (Array.isArray(pageLayouts)) {
                    existing = pageLayouts.find(i => i.i === l.i);
                } else {
                    existing = (pageLayouts[bp] || pageLayouts.lg || pageLayouts.md || pageLayouts.sm || []).find(i => i.i === l.i);
                }
                return { ...existing, ...l };
            });
        });
        return { ...prev, [page]: updated };
    });
  };

  const handleAddWidget = (type) => {
    const config = WIDGET_TYPES[type];
    const newId = `${type}-${Date.now()}`;
    const newItem = {
        i: newId, x: (currentItems.length * 4) % 12, y: Infinity, w: config.defaultW, h: config.defaultH, type: type,
        data: {}
    };
    
    setLayouts(prev => {
        const pageLayouts = prev[page] || { lg: [], md: [], sm: [] };
        const updated = {};
        ['lg', 'md', 'sm', 'xs', 'xxs'].forEach(bp => {
            const base = Array.isArray(pageLayouts) ? pageLayouts : (pageLayouts[bp] || pageLayouts.lg || []);
            updated[bp] = [...base, newItem];
        });
        return { ...prev, [page]: updated };
    });
    setAddWidgetAnchor(null);
  };

  const handleRemoveWidget = (id) => {
      setLayouts(prev => {
          const pageLayouts = prev[page];
          if (Array.isArray(pageLayouts)) {
              return { ...prev, [page]: pageLayouts.filter(i => i.i !== id) };
          }
          const updated = {};
          Object.keys(pageLayouts).forEach(bp => {
              updated[bp] = pageLayouts[bp].filter(i => i.i !== id);
          });
          return { ...prev, [page]: updated };
      });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try { 
        if (onUpdateProfile) {
            await onUpdateProfile({ dashboard_layout: JSON.stringify(layouts) }); 
        }
        setIsEditing(false);
    } catch (err) { console.error("Failed to save layout", err); }
    setIsSaving(false);
  };

  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <Box sx={{ pb: 10, px: { xs: 1, md: 4 }, pt: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box id="tour-dashboard-greeting">
          <Typography level="h2" sx={{ fontWeight: 'lg' }}>{greeting}, {user?.first_name || 'Friend'}</Typography>
          <Typography level="body-md" color="neutral">{dateStr} • {household?.name}</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }} id="tour-dashboard-actions">
            {isEditing ? (
                <>
                    <Button variant="soft" startDecorator={<Add />} onClick={(e) => setAddWidgetAnchor(e.currentTarget)}>Add Widget</Button>
                    <Button variant="solid" color="primary" loading={isSaving} startDecorator={<Save />} onClick={handleSave}>Save Layout</Button>
                </>
            ) : (
                <Button variant="plain" color="neutral" startDecorator={<Settings />} onClick={() => setIsEditing(true)} id="tour-dashboard-customize">Customize</Button>
            )}
        </Box>
      </Stack>

      <ResponsiveGridLayout
          className="layout"
          layouts={Array.isArray(layouts[page]) ? { lg: layouts[page], md: layouts[page], sm: layouts[page] } : layouts[page]}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={setBreakpoint}
          margin={[24, 24]}
      >
          {gridItems.map(item => {
              const WidgetComponent = WIDGET_TYPES[item.type]?.component;
              return (
                  <Box key={item.i} data-grid={{ ...item, static: !isEditing }} sx={{ position: 'relative' }}>
                      {isEditing && (
                          <IconButton 
                              size="sm" variant="solid" color="danger"
                              onClick={() => handleRemoveWidget(item.i)}
                              sx={{ position: 'absolute', top: -14, right: -14, zIndex: 100, borderRadius: '50%' }}
                          >
                              <Close fontSize="small" />
                          </IconButton>
                      )}
                      <ErrorBoundary>
                          {WidgetComponent ? <WidgetComponent api={api} household={household} members={members} user={user} dates={dates} onUpdateProfile={onUpdateProfile} /> : <WidgetSkeleton />}
                      </ErrorBoundary>
                  </Box>
              );
          })}
      </ResponsiveGridLayout>

      <Menu
        anchorEl={addWidgetAnchor}
        open={Boolean(addWidgetAnchor)}
        onClose={() => setAddWidgetAnchor(null)}
        placement="bottom-end"
      >
        {Object.entries(WIDGET_TYPES).map(([key, config]) => (
            <MenuItem key={key} onClick={() => handleAddWidget(key)}>{config.label}</MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
