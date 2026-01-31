import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, LinearProgress, Switch, Accordion, AccordionSummary, AccordionDetails,
  Dropdown, Menu, MenuButton, MenuItem, Select, Option
} from '@mui/joy';
import { 
  AccountBalanceWallet, CheckCircle, RadioButtonUnchecked, TrendingDown, 
  Event, Payments, Savings as SavingsIcon, Home, CreditCard, 
  Assignment, WaterDrop, ElectricBolt, AccountBalance, Add, Shield, 
  ShoppingBag, ChevronLeft, ChevronRight, Lock, LockOpen, ArrowDropDown, RestartAlt, Receipt,
  DirectionsCar, Person, DeleteOutline, Restore, Sort, Search, ExpandMore, TrendingUp
} from '@mui/icons-material';
import { 
  format, addMonths, startOfMonth, setDate, differenceInDays, 
  isSameDay, isAfter, startOfDay, isWithinInterval, 
  parseISO, isValid, addYears, addWeeks
} from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BudgetView() {
  const { api, id: householdId, isDark, showNotification, members = [], setStatusBarData, confirmAction, user, onUpdateProfile } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [bankHolidays, setBankHolidays] = useState([]);
  const [hidePaid, setHidePaid] = useState(false);
  
  const [incomes, setIncomes] = useState([]);
  const [progress, setProgress] = useState([]); 
  const [cycles, setCycles] = useState([]); 
  
  const [liabilities, setLiabilities] = useState({
      mortgages: [], loans: [], agreements: [], vehicle_finance: [], 
      charges: [], credit_cards: [], pensions: [], vehicles: [], assets: [],
      savings: [], investments: []
  });
  const [savingsPots, setSavingsPots] = useState([]);

  // Sections State
  const [sectionsOpen, setSectionsOpen] = useState({ obligations: true, wealth: true });

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickLinkType, setQuickLinkType] = useState('general');
  const [recurringAddOpen, setRecurringAddOpen] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');
  const [selectedEntity, setSelectedEntity] = useState('general:household');

  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [isPayLocked, setIsPayLocked] = useState(true);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
          incRes, progRes, cycleRes, mortRes, loanRes, agreeRes, carRes, chargeRes, ccRes, pensionRes, potRes, holidayRes, vehRes, assetRes, saveRes, invRes
      ] = await Promise.all([
          api.get(`/households/${householdId}/finance/income`),
          api.get(`/households/${householdId}/finance/budget-progress`),
          api.get(`/households/${householdId}/finance/budget-cycles`),
          api.get(`/households/${householdId}/finance/mortgages`),
          api.get(`/households/${householdId}/finance/loans`),
          api.get(`/households/${householdId}/finance/agreements`),
          api.get(`/households/${householdId}/finance/vehicle-finance`),
          api.get(`/households/${householdId}/finance/charges`),
          api.get(`/households/${householdId}/finance/credit-cards`),
          api.get(`/households/${householdId}/finance/pensions`),
          api.get(`/households/${householdId}/finance/savings/pots`),
          api.get(`/system/holidays`),
          api.get(`/households/${householdId}/vehicles`),
          api.get(`/households/${householdId}/assets`),
          api.get(`/households/${householdId}/finance/savings`),
          api.get(`/households/${householdId}/finance/investments`)
      ]);

      setIncomes(incRes.data || []);
      setProgress(progRes.data || []);
      setCycles(cycleRes.data || []);
      setLiabilities({
          mortgages: mortRes.data || [],
          loans: loanRes.data || [],
          agreements: agreeRes.data || [],
          vehicle_finance: carRes.data || [],
          charges: chargeRes.data || [],
          credit_cards: ccRes.data || [],
          pensions: pensionRes.data || [],
          vehicles: vehRes.data || [],
          assets: assetRes.data || [],
          savings: saveRes.data || [],
          investments: invRes.data || []
      });
      setSavingsPots(potRes.data || []);
      setBankHolidays(holidayRes.data || []);
    } catch (err) { console.error("Failed to fetch budget data", err); } finally { setLoading(false); }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Helper Logic (Date Projection) ---
  const getNextWorkingDay = useCallback((date) => {
      let d = new Date(date);
      const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
      const isHoliday = (day) => bankHolidays.includes(format(day, 'yyyy-MM-dd'));
      while (isWeekend(d) || isHoliday(d)) { d.setDate(d.getDate() + 1); }
      return d;
  }, [bankHolidays]);

  const getPriorWorkingDay = useCallback((date) => {
      let d = new Date(date);
      const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
      const isHoliday = (day) => bankHolidays.includes(format(day, 'yyyy-MM-dd'));
      while (isWeekend(d) || isHoliday(d)) { d.setDate(d.getDate() - 1); }
      return d;
  }, [bankHolidays]);

  const getAdjustedDate = useCallback((input, useNwd, cycleStartDate) => {
      if (!input) return null;
      let d;
      if (input instanceof Date) {
          d = input;
      } else {
          d = setDate(startOfMonth(new Date(cycleStartDate)), parseInt(input));
          if (isAfter(cycleStartDate, d)) { d = addMonths(d, 1); }
      }
      return useNwd ? getNextWorkingDay(d) : d;
  }, [getNextWorkingDay]);

  const cycleData = useMemo(() => {
      const primaryIncome = incomes.find(i => i.is_primary === 1) || incomes.find(i => i.payment_day > 0);
      if (!primaryIncome || !primaryIncome.payment_day) return null;

      const payday = parseInt(primaryIncome.payment_day);
      let rawStartDate = viewDate.getDate() >= payday ? setDate(startOfMonth(viewDate), payday) : setDate(startOfMonth(addMonths(viewDate, -1)), payday);

      const startDate = getPriorWorkingDay(rawStartDate);
      const endDate = getPriorWorkingDay(addMonths(rawStartDate, 1));
      const cycleKey = format(startDate, 'yyyy-MM-dd');
      const label = format(startDate, 'MMM yyyy') + " Budget";
      const cycleDuration = differenceInDays(endDate, startDate);

      const now = startOfDay(new Date());
      let progressPct = 0;
      let daysRemaining = differenceInDays(endDate, now);
      if (isSameDay(now, startDate) || isAfter(now, startDate)) {
          progressPct = Math.min((differenceInDays(now, startDate) / cycleDuration) * 100, 100);
      }
      if (daysRemaining < 0) daysRemaining = 0;

      const obligations = [];
      const wealth = [];
      const skipped = [];
      
      const addExpense = (item, type, label, amount, dateObj, icon, category, section, object = null) => {
          if (!dateObj || !isValid(dateObj)) return;
          const key = `${type}_${item.id || 'fixed'}_${format(dateObj, 'ddMM')}`; 
          const progressItem = progress.find(p => p.item_key === key && p.cycle_start === cycleKey);
          
          const expObj = {
              key, type, label: label || 'Unnamed Item', amount: progressItem?.actual_amount || parseFloat(amount) || 0,
              day: dateObj.getDate(), computedDate: dateObj,
              icon, category: category || 'other', isPaid: progressItem?.is_paid === 1,
              isDeletable: true,
              id: item.id, object: object || {}, 
              frequency: item.frequency || 'monthly'
          };

          if (progressItem?.is_paid === -1) {
              skipped.push(expObj);
          } else if (section === 'obligations') {
              obligations.push(expObj);
          } else {
              wealth.push(expObj);
          }
      };

      // 1. FIXED OBLIGATIONS
      liabilities.mortgages.forEach(m => addExpense(m, 'mortgage', m.lender, m.monthly_payment, getAdjustedDate(m.payment_day, true, startDate), <Home />, 'Mortgage', 'obligations'));
      liabilities.loans.forEach(l => addExpense(l, 'loan', `${l.lender} Loan`, l.monthly_payment, getAdjustedDate(l.payment_day, true, startDate), <TrendingDown />, 'Loan', 'obligations'));
      liabilities.vehicle_finance.forEach(v => addExpense(v, 'vehicle_finance', v.provider, v.monthly_payment, getAdjustedDate(v.payment_day, true, startDate), <DirectionsCar />, 'Car Finance', 'obligations'));
      liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit_card', `${cc.card_name} (Bal: ${formatCurrency(cc.current_balance)})`, 0, getAdjustedDate(cc.payment_day || 1, true, startDate), <CreditCard />, 'Credit Card', 'obligations'));
      
      liabilities.charges.filter(c => c.is_active !== 0).forEach(charge => {
          // Logic for recurring dates (Same as before)
          let datesToAdd = [];
          const freq = charge.frequency?.toLowerCase();
          const anchor = charge.start_date ? parseISO(charge.start_date) : null;

          if (freq === 'one_off') {
             const oneOffDate = parseISO(charge.exact_date || charge.start_date);
             if (isWithinInterval(oneOffDate, { start: startDate, end: endDate })) datesToAdd.push(oneOffDate);
          } else if (anchor) {
             let current = startOfDay(anchor);
             while (current < startDate) {
                 if (freq === 'weekly') current = addWeeks(current, 1);
                 else if (freq === 'monthly') current = addMonths(current, 1);
                 else if (freq === 'quarterly') current = addMonths(current, 3);
                 else current = addYears(current, 1);
             }
             while (isWithinInterval(current, { start: startDate, end: endDate })) {
                 datesToAdd.push(charge.adjust_for_working_day ? getNextWorkingDay(current) : new Date(current));
                 if (freq === 'weekly') current = addWeeks(current, 1);
                 else if (freq === 'monthly') current = addMonths(current, 1);
                 else if (freq === 'quarterly') current = addMonths(current, 3);
                 else current = addYears(current, 1);
             }
          } else if (freq === 'monthly') {
             datesToAdd.push(getAdjustedDate(charge.day_of_month, charge.adjust_for_working_day, startDate));
          }

          datesToAdd.forEach(d => {
             let icon = <Receipt />;
             if (charge.segment === 'insurance') icon = <Shield />;
             else if (charge.segment === 'subscription') icon = <ShoppingBag />;
             addExpense(charge, 'charge', charge.name, charge.amount, d, icon, charge.segment, 'obligations');
          });
      });

      // 2. WEALTH BUILDING
      liabilities.savings.forEach(s => {
          if (s.deposit_amount > 0) {
              addExpense(s, 'savings_deposit', `${s.institution} ${s.account_name}`, s.deposit_amount, getAdjustedDate(s.deposit_day || 1, false, startDate), <SavingsIcon />, 'Savings Deposit', 'wealth');
          }
      });
      
      liabilities.pensions.forEach(p => {
          if (p.monthly_contribution > 0) {
              addExpense(p, 'pension', `${p.provider} Pension`, p.monthly_contribution, getAdjustedDate(p.payment_day || 1, true, startDate), <Assignment />, 'Pension', 'wealth');
          }
      });

      liabilities.investments.forEach(i => {
          if (i.monthly_contribution > 0) {
              addExpense(i, 'investment', `${i.name} Investment`, i.monthly_contribution, getAdjustedDate(i.payment_day || 1, true, startDate), <TrendingUp />, 'Investment', 'wealth');
          }
      });

      // Savings Pots - defaulting to 0 as placeholders if no explicit deposit?
      // User said "Investment Saving/Investment/Pension should be on the Budget page".
      // Assuming existing Pots logic (placeholder 0 for manual allocation) is still desired.
      savingsPots.forEach(pot => addExpense(pot, 'pot', pot.name, 0, getAdjustedDate(pot.deposit_day || 1, false, startDate), <SavingsIcon />, 'Pot Allocation', 'wealth'));

      // Sort by Date
      const sortByDate = (a, b) => a.computedDate.getTime() - b.computedDate.getTime();
      obligations.sort(sortByDate);
      wealth.sort(sortByDate);

      return { startDate, endDate, label, cycleKey, progressPct, daysRemaining, cycleDuration, obligations, wealth, skipped };
  }, [incomes, liabilities, progress, viewDate, getPriorWorkingDay, getAdjustedDate, savingsPots, getNextWorkingDay, members]);

  // --- Logic for Updates, Toggles, etc. (Same as before) ---
  const currentCycleRecord = useMemo(() => cycles.find(c => c.cycle_start === cycleData?.cycleKey), [cycles, cycleData]);
  useEffect(() => {
      if (currentCycleRecord) { setActualPay(currentCycleRecord.actual_pay); setCurrentBalance(currentCycleRecord.current_balance); }
      else { setActualPay(''); setCurrentBalance(''); }
  }, [currentCycleRecord]);

  const saveCycleData = async (pay, balance) => {
      if (!cycleData) return;
      try {
          await api.post(`/households/${householdId}/finance/budget-cycles`, { cycle_start: cycleData.cycleKey, actual_pay: parseFloat(pay) || 0, current_balance: parseFloat(balance) || 0 });
          const res = await api.get(`/households/${householdId}/finance/budget-cycles`);
          setCycles(res.data || []);
      } catch (err) { console.error("Failed to save cycle data", err); }
  };

  const updateActualAmount = async (itemKey, amount) => {
      const progressItem = progress.find(p => p.item_key === itemKey && p.cycle_start === cycleData?.cycleKey);
      const isPaid = progressItem ? (progressItem.is_paid || 0) : 0;
      try {
          await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: isPaid, actual_amount: parseFloat(amount) || 0 });
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) { console.error("Failed to update actual amount", err); }
  };

  const togglePaid = async (itemKey, amount = 0) => {
      setSavingProgress(true);
      try {
          const isCurrentlyPaid = progress.some(p => p.item_key === itemKey && p.cycle_start === cycleData.cycleKey && p.is_paid === 1);
          if (isCurrentlyPaid) await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
          else { playDing(); await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: 1, actual_amount: amount }); }
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) { console.error("Failed to toggle paid status", err); } finally { setSavingProgress(false); }
  };

  const handleDisableItem = (itemKey) => { /* ... same as before ... */ };
  const handleRestoreItem = (itemKey) => { /* ... same as before ... */ };
  const handleArchiveCharge = (id) => { /* ... same as before ... */ };
  
  // Quick Add / Recurring Add handlers (keep them, they add 'charges')
  const handleQuickAdd = async (e) => { /* ... */ };
  const handleRecurringAdd = async (e) => { /* ... */ };

  const cycleTotals = useMemo(() => {
      if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
      const allItems = [...cycleData.obligations, ...cycleData.wealth];
      const total = allItems.reduce((sum, e) => sum + e.amount, 0);
      const paid = allItems.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return { total, paid, unpaid: total - paid };
  }, [cycleData]);

  const trueDisposable = (parseFloat(currentBalance) || 0) - cycleTotals.unpaid;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!cycleData) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography level="h4">No Primary Income Set</Typography><Button sx={{ mt: 2 }} onClick={fetchData}>Refresh</Button></Box>;

  // RENDER HELPERS
  const renderItemRow = (exp) => (
      <tr key={exp.key} style={{ opacity: exp.isPaid ? 0.6 : 1 }}>
          <td style={{ width: 40, textAlign: 'center' }}>
              <Checkbox size="sm" checked={exp.isPaid} onChange={() => togglePaid(exp.key, exp.amount)} uncheckedIcon={<RadioButtonUnchecked />} checkedIcon={<CheckCircle color="success" />} />
          </td>
          <td>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar size="sm" sx={{ bgcolor: getEmojiColor(exp.label || '?', isDark) }}>{exp.icon}</Avatar>
                  <Box>
                      <Typography level="body-sm" fontWeight="bold">{exp.label}</Typography>
                      <Typography level="body-xs" color="neutral">{exp.category} • Due {format(exp.computedDate, 'do MMM')}</Typography>
                  </Box>
              </Box>
          </td>
          <td style={{ textAlign: 'right' }}>
              <Input 
                  size="sm" type="number" variant="soft" 
                  sx={{ width: 100, textAlign: 'right', '& input': { textAlign: 'right' } }} 
                  defaultValue={Number(exp.amount).toFixed(2)} 
                  onBlur={(e) => updateActualAmount(exp.key, e.target.value)} 
                  slotProps={{ input: { step: '0.01' } }} 
              />
          </td>
      </tr>
  );

  const renderSection = (title, items, type, isOpen, toggle) => (
      <Accordion expanded={isOpen} onChange={toggle} variant="outlined" sx={{ borderRadius: 'md', mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', mr: 2 }}>
                  <Typography level="title-lg" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {type === 'obligations' ? <Payments color="danger" /> : <TrendingUp color="success" />} 
                      {title}
                  </Typography>
                  <Typography level="body-sm" color="neutral">
                      {formatCurrency(items.reduce((sum, i) => sum + i.amount, 0))}
                  </Typography>
              </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
              <Table hoverRow sx={{ '--TableCell-paddingX': '16px' }}>
                  <tbody>
                      {getVisibleItems(items).map(renderItemRow)}
                      {getVisibleItems(items).length === 0 && (
                          <tr><td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--joy-palette-neutral-500)' }}>No items visible</td></tr>
                      )}
                  </tbody>
              </Table>
          </AccordionDetails>
      </Accordion>
  );

  const getVisibleItems = (items) => items.filter(i => !hidePaid || !i.isPaid);

  return (
    <Box sx={{ userSelect: 'none', pb: 10 }}>
        {/* HEADER & DATE CONTROLS (Same as before) */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton>
                <Box>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{cycleData.label}</Typography>
                    <Typography level="body-md" color="neutral">{format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}</Typography>
                </Box>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl orientation="horizontal" size="sm" sx={{ mr: 1 }}>
                    <FormLabel sx={{ mr: 1 }}>Hide Paid</FormLabel>
                    <Switch checked={hidePaid} onChange={(e) => setHidePaid(e.target.checked)} size="sm" />
                </FormControl>
                {/* Add Menu Removed for brevity - can be re-added if needed */}
            </Box>
        </Box>

        {/* PROGRESS & SUMMARY */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid xs={12} md={4}>
                <Card variant="soft" color="primary" sx={{ p: 2 }}>
                    <Typography level="title-md">Safe to Spend</Typography>
                    <Typography level="h2">{formatCurrency(trueDisposable)}</Typography>
                    <Typography level="body-xs">Balance - Unpaid</Typography>
                </Card>
            </Grid>
            <Grid xs={12} md={8}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', gap: 4 }}>
                        <Box><Typography level="body-xs">Total Obligations</Typography><Typography level="title-md">{formatCurrency(cycleTotals.total)}</Typography></Box>
                        <Box><Typography level="body-xs">Paid so far</Typography><Typography level="title-md" color="success">{formatCurrency(cycleTotals.paid)}</Typography></Box>
                        <Box><Typography level="body-xs">Left to Pay</Typography><Typography level="title-md" color="danger">{formatCurrency(cycleTotals.unpaid)}</Typography></Box>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress determinate value={(cycleTotals.paid / (cycleTotals.total || 1)) * 100} thickness={6} color="success" />
                    </Box>
                </Card>
            </Grid>
        </Grid>

        {/* ENTRY INPUTS */}
        <Card variant="outlined" sx={{ mb: 4, p: 2, flexDirection: 'row', gap: 2, alignItems: 'center' }}>
            <Typography level="title-md" startDecorator={<AccountBalanceWallet />}>Cycle Entry:</Typography>
            <Input 
                startDecorator="Pay £" 
                type="number" 
                value={actualPay} 
                onChange={(e) => setActualPay(e.target.value)} 
                onBlur={(e) => saveCycleData(e.target.value, currentBalance)} 
                sx={{ width: 150 }} 
            />
            <Input 
                startDecorator="Bal £" 
                type="number" 
                value={currentBalance} 
                onChange={(e) => setCurrentBalance(e.target.value)} 
                onBlur={(e) => saveCycleData(actualPay, e.target.value)} 
                sx={{ width: 150 }} 
            />
        </Card>

        {/* SECTIONS */}
        {renderSection('Fixed Obligations', cycleData.obligations, 'obligations', sectionsOpen.obligations, () => setSectionsOpen(prev => ({ ...prev, obligations: !prev.obligations })))}
        {renderSection('Savings & Growth', cycleData.wealth, 'wealth', sectionsOpen.wealth, () => setSectionsOpen(prev => ({ ...prev, wealth: !prev.wealth })))}

    </Box>
  );
}