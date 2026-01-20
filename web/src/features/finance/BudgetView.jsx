import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, LinearProgress, Select, Option, Switch
} from '@mui/joy';
import { 
  AccountBalanceWallet, 
  CheckCircle, 
  RadioButtonUnchecked, 
  TrendingDown, 
  Event, 
  Payments,
  Savings as SavingsIcon,
  Home,
  DirectionsCar,
  CreditCard,
  Assignment,
  WaterDrop,
  ElectricBolt,
  AccountBalance,
  Add,
  Shield,
  HistoryEdu,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Person,
  Pets,
  Delete,
  PieChart
} from '@mui/icons-material';
import { format, addMonths, startOfMonth, setDate, differenceInDays, isSameDay, isAfter } from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BudgetView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification, members, setStatusBarData } = useOutletContext();
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
      recurring_costs: [], credit_cards: [], water: null, council: null, energy: [],
      pensions: [], vehicles: []
  });
  const [savingsPots, setSavingsPots] = useState([]);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [recurringAddOpen, setRecurringAddOpen] = useState(false);
  const [potAllocationOpen, setPotAllocationOpen] = useState(false);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
          incRes, progRes, cycleRes, mortRes, loanRes, agreeRes, carRes, costRes, ccRes, waterRes, councilRes, energyRes, pensionRes, potRes, holidayRes, vehRes
      ] = await Promise.all([
          api.get(`/households/${householdId}/finance/income`),
          api.get(`/households/${householdId}/finance/budget-progress`),
          api.get(`/households/${householdId}/finance/budget-cycles`),
          api.get(`/households/${householdId}/finance/mortgages`),
          api.get(`/households/${householdId}/finance/loans`),
          api.get(`/households/${householdId}/finance/agreements`),
          api.get(`/households/${householdId}/finance/vehicle-finance`),
          api.get(`/households/${householdId}/costs`),
          api.get(`/households/${householdId}/finance/credit-cards`),
          api.get(`/households/${householdId}/water`),
          api.get(`/households/${householdId}/council`),
          api.get(`/households/${householdId}/energy`),
          api.get(`/households/${householdId}/finance/pensions`),
          api.get(`/households/${householdId}/finance/savings/pots`),
          api.get(`/system/holidays`),
          api.get(`/households/${householdId}/vehicles`)
      ]);

      setIncomes(incRes.data || []);
      setProgress(progRes.data || []);
      setCycles(cycleRes.data || []);
      setLiabilities({
          mortgages: mortRes.data || [],
          loans: loanRes.data || [],
          agreements: agreeRes.data || [],
          vehicle_finance: carRes.data || [],
          recurring_costs: costRes.data || [],
          credit_cards: ccRes.data || [],
          water: waterRes.data,
          council: councilRes.data,
          energy: energyRes.data || [],
          pensions: pensionRes.data || [],
          vehicles: vehRes.data || []
      });
      setSavingsPots(potRes.data || []);
      setBankHolidays(holidayRes.data || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getPriorWorkingDay = useCallback((date) => {
      let d = new Date(date);
      const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
      const isHoliday = (day) => bankHolidays.includes(format(day, 'yyyy-MM-dd'));
      while (isWeekend(d) || isHoliday(d)) { d.setDate(d.getDate() - 1); }
      return d;
  }, [bankHolidays]);

  const getNextWorkingDay = useCallback((date) => {
      let d = new Date(date);
      const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
      const isHoliday = (day) => bankHolidays.includes(format(day, 'yyyy-MM-dd'));
      while (isWeekend(d) || isHoliday(d)) { d.setDate(d.getDate() + 1); }
      return d;
  }, [bankHolidays]);

  const getAdjustedDate = useCallback((day, useNwd, cycleStartDate) => {
      if (!day) return null;
      let d = setDate(startOfMonth(new Date(cycleStartDate)), parseInt(day));
      if (isAfter(cycleStartDate, d)) { d = addMonths(d, 1); }
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
      const label = format(startDate, 'MMM yyyy') + " Cycle";
      const cycleDuration = differenceInDays(endDate, startDate);

      const now = new Date();
      let progressPct = 0;
      if (isSameDay(now, startDate) || isAfter(now, startDate)) {
          progressPct = Math.min((differenceInDays(now, startDate) / cycleDuration) * 100, 100);
      }

      const expenses = [];
      const addExpense = (item, type, label, amount, day, icon, category, object = null) => {
          const key = `${type}_${item.id || 'fixed'}`;
          const progressItem = progress.find(p => p.item_key === key && p.cycle_start === cycleKey);
          if (item.frequency === 'one-off' && item.next_due !== cycleKey) return;

          const useNwd = item.nearest_working_day !== undefined ? !!item.nearest_working_day : true;
          const computedDate = getAdjustedDate(day, useNwd, startDate);

          expenses.push({
              key, type, label, amount: progressItem?.actual_amount || parseFloat(amount) || 0,
              day: parseInt(day) || 1, computedDate, icon, category,
              isPaid: !!progressItem, isDeletable: type === 'cost' && (item.frequency === 'one-off' || item.parent_type === 'general'),
              id: item.id, object
          });
      };

      liabilities.mortgages.forEach(m => addExpense(m, 'mortgage', m.lender, m.monthly_payment, m.payment_day, <Home />, 'Liability', { name: 'House', emoji: '🏠' }));
      liabilities.loans.forEach(l => addExpense(l, 'loan', `${l.lender} Loan`, l.monthly_payment, l.payment_day, <TrendingDown />, 'Liability', { name: 'Finance', emoji: '💰' }));
      liabilities.agreements.forEach(a => addExpense(a, 'agreement', a.agreement_name, a.monthly_payment, a.payment_day, <Assignment />, 'Agreement', { name: a.provider, emoji: '📄' }));
      liabilities.vehicle_finance.forEach(v => {
          const veh = liabilities.vehicles.find(vh => vh.id === v.vehicle_id);
          addExpense(v, 'car_finance', `Finance: ${v.provider}`, v.monthly_payment, v.payment_day, <DirectionsCar />, 'Liability', { name: veh ? `${veh.make} ${veh.model}` : 'Vehicle', emoji: veh?.emoji || '🚗' });
      });
      liabilities.pensions.forEach(p => addExpense(p, 'pension', p.plan_name, p.monthly_contribution, p.payment_day, <SavingsIcon />, 'Pension', { name: 'Retirement', emoji: '👴' }));
      liabilities.recurring_costs.forEach(c => {
          let icon = <Payments />; let object = { name: 'General', emoji: '💸' };
          if (c.parent_type === 'member') {
              const m = members.find(mem => mem.id === c.parent_id);
              object = { name: m ? (m.alias || m.name) : 'User', emoji: m?.emoji || '👤' }; icon = <Person />;
          } else if (c.parent_type === 'pet') {
              const p = members.find(mem => mem.id === c.parent_id);
              object = { name: p ? (p.alias || p.name) : 'Pet', emoji: p?.emoji || '🐾' }; icon = <Pets />;
          } else if (c.parent_type === 'vehicle') {
              const v = liabilities.vehicles.find(veh => veh.id === c.parent_id);
              object = { name: v ? `${v.make}` : 'Vehicle', emoji: v?.emoji || '🚗' }; icon = <DirectionsCar />;
          }
          if (c.category === 'insurance') icon = <Shield />;
          if (c.category === 'subscription') icon = <ShoppingBag />;
          if (c.category === 'service') icon = <HistoryEdu />;
          if (c.category === 'saving') icon = <SavingsIcon />;
          addExpense(c, 'cost', c.name, c.amount, c.payment_day, icon, c.category || 'Cost', object);
      });
      liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit', cc.card_name, 0, cc.payment_day, <CreditCard />, 'Credit Card', { name: cc.provider, emoji: cc.emoji || '💳' }));
      if (liabilities.water) addExpense(liabilities.water, 'water', 'Water Bill', liabilities.water.monthly_amount, liabilities.water.payment_day, <WaterDrop />, 'Utility', { name: 'House', emoji: '💧' });
      if (liabilities.council) addExpense(liabilities.council, 'council', 'Council Tax', liabilities.council.monthly_amount, liabilities.council.payment_day, <AccountBalance />, 'Utility', { name: 'House', emoji: '🏛️' });
      if (liabilities.energy) liabilities.energy.forEach(e => addExpense(e, 'energy', `${e.provider} (${e.type})`, e.monthly_amount, e.payment_day, <ElectricBolt />, 'Utility', { name: 'House', emoji: '⚡' }));

      return { startDate, endDate, label, cycleKey, progressPct, cycleDuration, expenses: expenses.sort((a, b) => (a.computedDate || 0) - (b.computedDate || 0)) };
  }, [incomes, liabilities, progress, viewDate, members, getPriorWorkingDay, getAdjustedDate]);

  const currentCycleRecord = useMemo(() => {
    return cycles.find(c => c.cycle_start === cycleData?.cycleKey);
  }, [cycles, cycleData]);

  const cycleEvents = useMemo(() => {
    if (!cycleData) return [];
    const events = [];

    bankHolidays.forEach(h => {
        const date = new Date(h);
        if (date >= cycleData.startDate && date <= cycleData.endDate) {
            events.push({ type: 'holiday', date, label: 'Bank Holiday', emoji: '🇬🇧' });
        }
    });

    members.forEach(m => {
        if (!m.dob) return;
        const dob = new Date(m.dob);
        const currentYearBirthday = new Date(cycleData.startDate.getFullYear(), dob.getMonth(), dob.getDate());
        const nextYearBirthday = new Date(cycleData.startDate.getFullYear() + 1, dob.getMonth(), dob.getDate());
        
        let targetDate = null;
        if (currentYearBirthday >= cycleData.startDate && currentYearBirthday <= cycleData.endDate) targetDate = currentYearBirthday;
        else if (nextYearBirthday >= cycleData.startDate && nextYearBirthday <= cycleData.endDate) targetDate = nextYearBirthday;

        if (targetDate) {
            events.push({ type: 'birthday', date: targetDate, label: `${m.name}'s Birthday`, emoji: '🎂' });
        }
    });

    return events.sort((a, b) => a.date - b.date);
  }, [cycleData, bankHolidays, members]);

  useEffect(() => {
      if (currentCycleRecord) {
          setActualPay(currentCycleRecord.actual_pay);
          setCurrentBalance(currentCycleRecord.current_balance);
      } else {
          setActualPay('');
          setCurrentBalance('');
      }
  }, [currentCycleRecord]);

  const handleRowClick = (e, index, key) => {
      const isShift = e.shiftKey; const isCtrl = e.metaKey || e.ctrlKey;
      if (isShift && lastSelectedIndex !== null) {
          const start = Math.min(lastSelectedIndex, index); const end = Math.max(lastSelectedIndex, index);
          const keysInRange = cycleData.expenses.filter((_, i) => i >= start && i <= end).map(exp => exp.key);
          setSelectedKeys(prev => Array.from(new Set([...prev, ...keysInRange])));
      } else if (isCtrl) {
          setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
          setLastSelectedIndex(index);
      } else {
          setSelectedKeys([key]); setLastSelectedIndex(index);
      }
  };

  const saveCycleData = async (pay, balance) => {
      if (!cycleData) return;
      try {
          await api.post(`/households/${householdId}/finance/budget-cycles`, {
              cycle_start: cycleData.cycleKey, actual_pay: parseFloat(pay) || 0, current_balance: parseFloat(balance) || 0
          });
          const res = await api.get(`/households/${householdId}/finance/budget-cycles`);
          setCycles(res.data || []);
      } catch (err) { console.error(err); }
  };

  const createCycle = async (copyPrevious = false) => {
      let pay = 0;
      let balance = 0;
      if (copyPrevious) {
          const prevDate = addMonths(cycleData.startDate, -1);
          const prevCycle = cycles.find(c => {
             const d = new Date(c.cycle_start);
             return d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
          });
          if (prevCycle) {
              pay = prevCycle.actual_pay;
              balance = prevCycle.current_balance;
          }
      }
      await saveCycleData(pay, balance);
  };

  const updateActualAmount = async (itemKey, amount) => {
      try {
          await api.post(`/households/${householdId}/finance/budget-progress`, {
              cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: 1, actual_amount: parseFloat(amount) || 0
          });
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) { console.error(err); }
  };

  const togglePaid = async (itemKey, amount = 0) => {
      setSavingProgress(true);
      try {
          const isCurrentlyPaid = progress.some(p => p.item_key === itemKey && p.cycle_start === cycleData.cycleKey);
          if (isCurrentlyPaid) {
              await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
          } else {
              await api.post(`/households/${householdId}/finance/budget-progress`, {
                  cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: 1, actual_amount: amount
              });
          }
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) { console.error(err); } finally { setSavingProgress(false); }
  };

  const handleRecurringAdd = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      const [type, id] = (data.assigned_to || 'general_1').split('_');
      data.parent_type = type; data.parent_id = id;
      data.nearest_working_day = data.nearest_working_day === "1" ? 1 : 0;
      delete data.assigned_to;
      try {
          await api.post(`/households/${householdId}/costs`, data);
          showNotification("Recurring expense added.", "success");
          fetchData(); setRecurringAddOpen(false);
      } catch { alert("Failed to add"); }
  };

  const handleQuickAdd = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      data.parent_type = 'general'; data.parent_id = 1; data.frequency = 'one-off'; 
      data.next_due = cycleData.cycleKey;
      data.nearest_working_day = data.nearest_working_day === "1" ? 1 : 0;
      try {
          await api.post(`/households/${householdId}/costs`, data);
          showNotification("One-off expense added.", "success");
          fetchData(); setQuickAddOpen(false);
      } catch { alert("Failed to add"); }
  };

  const handlePotAllocation = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      data.parent_type = 'general'; data.parent_id = 1; data.frequency = 'monthly'; data.category = 'saving';
      data.nearest_working_day = data.nearest_working_day === "1" ? 1 : 0;
      try {
          await api.post(`/households/${householdId}/costs`, data);
          showNotification("Savings allocation added.", "success");
          fetchData(); setPotAllocationOpen(false);
      } catch { alert("Failed to add"); }
  };

  const deleteExpense = async (id) => {
      if (!window.confirm("Remove this expense from recurring costs?")) return;
      try {
          await api.delete(`/households/${householdId}/costs/${id}`);
          fetchData();
      } catch (err) { console.error(err); }
  };

  const cycleTotals = useMemo(() => {
      if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
      const total = cycleData.expenses.reduce((sum, e) => sum + e.amount, 0);
      const paid = cycleData.expenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return { total, paid, unpaid: total - paid };
  }, [cycleData]);

  const totals = useMemo(() => {
      if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
      const filtered = cycleData.expenses.filter(exp => !hidePaid || !exp.isPaid);
      const total = filtered.reduce((sum, e) => sum + e.amount, 0);
      const paid = filtered.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return { total, paid, unpaid: total - paid };
  }, [cycleData, hidePaid]);

  const selectedTotals = useMemo(() => {
      if (!selectedKeys.length || !cycleData) return null;
      const selected = cycleData.expenses.filter(e => selectedKeys.includes(e.key));
      const total = selected.reduce((sum, e) => sum + e.amount, 0);
      const paid = selected.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return {
          count: selected.length,
          total,
          paid,
          unpaid: total - paid
      };
  }, [selectedKeys, cycleData]);
  
  useEffect(() => {
      setStatusBarData(selectedTotals);
      return () => setStatusBarData(null);
  }, [selectedTotals, setStatusBarData]);

  const trueDisposable = (parseFloat(currentBalance) || 0) - cycleTotals.unpaid;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!cycleData) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography level="h4">No Primary Income Set</Typography><Button sx={{ mt: 2 }} onClick={fetchData}>Refresh</Button></Box>;

  if (!currentCycleRecord) {
      return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography level="h2">{cycleData.label}</Typography>
                    <Typography level="body-md" color="neutral">{format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}</Typography>
                </Box>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton>
            </Box>

            <Card variant="outlined" sx={{ width: '100%', maxWidth: 500, p: 3, mb: 4, alignItems: 'center', textAlign: 'center', gap: 2 }}>
                <AccountBalanceWallet sx={{ fontSize: 48, color: 'primary.plainColor' }} />
                <Typography level="h3">Start a New Budget Cycle</Typography>
                <Typography level="body-md">This cycle has not been initialized yet. Choose how you want to start.</Typography>
                
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={() => createCycle(false)}>Create Blank</Button>
                    <Button variant="solid" onClick={() => createCycle(true)}>Copy Last Month</Button>
                </Stack>
            </Card>

            {cycleEvents.length > 0 && (
                <Card variant="soft" sx={{ width: '100%', maxWidth: 500, p: 2 }}>
                    <Typography level="title-md" startDecorator={<Event />} sx={{ mb: 2 }}>Events in this Cycle</Typography>
                    <Stack spacing={1}>
                        {cycleEvents.map((evt, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: 'background.surface', borderRadius: 'sm', border: '1px solid', borderColor: 'divider' }}>
                                <Avatar size="sm" sx={{ bgcolor: 'transparent' }}>{evt.emoji}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-sm">{evt.label}</Typography>
                                    <Typography level="body-xs">{format(evt.date, 'EEEE do MMMM')}</Typography>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Card>
            )}
        </Box>
      );
  }

  return (
    <Box sx={{ userSelect: 'none' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{cycleData.label}</Typography>
                        <Chip variant="soft" color="primary" size="sm">{cycleData.cycleDuration} Days</Chip>
                    </Box>
                    <Typography level="body-md" color="neutral">{format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}</Typography>
                </Box>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl orientation="horizontal" size="sm" sx={{ mr: 1 }}>
                    <FormLabel sx={{ mr: 1 }}>Hide Paid</FormLabel>
                    <Switch checked={hidePaid} onChange={(e) => setHidePaid(e.target.checked)} size="sm" />
                </FormControl>
                <Button variant="outlined" color="neutral" size="sm" onClick={() => setSelectedKeys([])}>Clear</Button>
                <Button variant="outlined" size="sm" startDecorator={<SavingsIcon />} onClick={() => setPotAllocationOpen(true)}>Pot</Button>
                <Button size="sm" startDecorator={<Add />} onClick={() => setRecurringAddOpen(true)}>Add Recurring</Button>
                <Button size="sm" startDecorator={<Add />} onClick={() => setQuickAddOpen(true)}>Add One-off</Button>
            </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                <Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Cycle Progress
                </Typography>
                <Typography level="body-xs" fontWeight="bold">
                    {Math.round(cycleData.progressPct)}% of cycle elapsed
                </Typography>
            </Box>
            <LinearProgress 
                determinate 
                value={cycleData.progressPct} 
                thickness={12}
                variant="soft"
                color="primary"
                sx={{ 
                    borderRadius: 'sm',
                    '--LinearProgress-radius': '4px',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                }} 
            />
        </Box>

        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                <Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Cycle Progress
                </Typography>
                <Typography level="body-xs" fontWeight="bold">
                    {Math.round(cycleData.progressPct)}% of cycle elapsed
                </Typography>
            </Box>
            <LinearProgress 
                determinate 
                value={cycleData.progressPct} 
                thickness={12}
                variant="soft"
                color="primary"
                sx={{ 
                    borderRadius: 'sm',
                    '--LinearProgress-radius': '4px',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                }} 
            />
        </Box>

        <Grid container spacing={3}>
            <Grid xs={12} md={3}>
                <Stack spacing={3}>
                    <Card variant="outlined" sx={{ p: 3 }}>
                        <Typography level="title-lg" sx={{ mb: 2 }} startDecorator={<AccountBalanceWallet />}>Cycle Entry</Typography>
                        <Stack spacing={2}>
                            <FormControl><FormLabel>Pay (£)</FormLabel><Input type="number" value={actualPay} onChange={(e) => setActualPay(e.target.value)} onBlur={(e) => saveCycleData(e.target.value, currentBalance)} slotProps={{ input: { step: '0.01' } }} /></FormControl>
                            <FormControl><FormLabel>Balance (£)</FormLabel><Input type="number" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} onBlur={(e) => saveCycleData(actualPay, e.target.value)} autoFocus slotProps={{ input: { step: '0.01' } }} /></FormControl>
                        </Stack>
                    </Card>

                    <Card variant="outlined" sx={{ p: 3, boxShadow: 'sm' }}>
                        <Typography level="title-lg" startDecorator={<AccountBalanceWallet />} sx={{ mb: 2 }}>Cycle Overview</Typography>
                        
                        <Stack spacing={1} sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography level="body-md" color="neutral">Current Balance</Typography>
                                <Typography level="body-md" fontWeight="lg">{formatCurrency(parseFloat(currentBalance) || 0)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography level="body-md" color="danger">Left to Pay</Typography>
                                <Typography level="body-md" fontWeight="lg" color="danger">- {formatCurrency(cycleTotals.unpaid)}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                                <Typography level="title-md">Safe to Spend</Typography>
                                <Typography level="h2" color={trueDisposable >= 0 ? 'success' : 'danger'}>
                                    {formatCurrency(trueDisposable)}
                                </Typography>
                            </Box>
                        </Stack>

                        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'md' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography level="body-xs" fontWeight="bold">Bills Paid</Typography>
                                <Typography level="body-xs">{Math.round((cycleTotals.paid / (cycleTotals.total || 1)) * 100)}%</Typography>
                            </Box>
                            <LinearProgress 
                                determinate 
                                value={(cycleTotals.paid / (cycleTotals.total || 1)) * 100} 
                                thickness={6}
                                color="success"
                                sx={{ bgcolor: 'background.level2' }} 
                            />
                            <Typography level="body-xs" sx={{ mt: 1, textAlign: 'center', color: 'neutral.500' }}>
                                {formatCurrency(cycleTotals.paid)} paid of {formatCurrency(cycleTotals.total)} total
                            </Typography>
                        </Box>
                    </Card>
                </Stack>
            </Grid>

            <Grid xs={12} md={9}>
                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                    <Table hoverRow stickyHeader>
                        <thead>
                            <tr>
                                <th>Expense</th>
                                <th style={{ width: 100, textAlign: 'center' }}>Date</th>
                                <th style={{ width: 120 }}>Amount</th>
                                <th style={{ width: 48, textAlign: 'center' }}>Paid</th>
                                <th style={{ width: 48 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cycleData.expenses.filter(exp => !hidePaid || !exp.isPaid).map((exp, index) => (
                                <tr key={exp.key} onClick={(e) => handleRowClick(e, index, exp.key)} style={{ cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent', opacity: exp.isPaid ? 0.6 : 1 }}>
                                    <td>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar size="sm" sx={{ bgcolor: getEmojiColor(exp.label, isDark), color: '#fff' }}>{exp.icon}</Avatar>
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography level="title-sm">{exp.label}</Typography>
                                                    {exp.object && <Chip size="sm" variant="soft" startDecorator={exp.object.emoji}>{exp.object.name}</Chip>}
                                                </Box>
                                                <Typography level="body-xs" color="neutral">{exp.category.toUpperCase()}</Typography>
                                            </Box>
                                        </Box>
                                    </td>
                                    <td><Box sx={{ textAlign: 'center' }}><Typography level="body-sm" fontWeight="lg">{exp.day}</Typography>{exp.computedDate && <Typography level="body-xs" color="neutral">{format(exp.computedDate, 'EEE do')}</Typography>}</Box></td>
                                    <td><Input size="sm" type="number" variant="soft" defaultValue={Number(exp.amount).toFixed(2)} onBlur={(e) => updateActualAmount(exp.key, e.target.value)} slotProps={{ input: { step: '0.01' } }} /></td>
                                    <td style={{ textAlign: 'center' }}><Checkbox variant="plain" checked={exp.isPaid} onChange={() => togglePaid(exp.key, exp.amount)} disabled={savingProgress} uncheckedIcon={<RadioButtonUnchecked />} checkedIcon={<CheckCircle color="success" />} sx={{ bgcolor: 'transparent' }} /></td>
                                    <td>{exp.isDeletable && <IconButton size="sm" color="danger" variant="plain" onClick={() => deleteExpense(exp.id)}><Delete /></IconButton>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Sheet>
            </Grid>
        </Grid>

        <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)}>
            <ModalDialog sx={{ maxWidth: 400, width: '100%', overflow: 'hidden' }}>
                <DialogTitle>Add One-off Expense</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleQuickAdd}>
                        <Stack spacing={2}>
                            <FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl>
                            <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: '0.01' } }} /></FormControl>
                            <FormControl required><FormLabel>Due Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={new Date().getDate()} /></FormControl>
                            <Checkbox label="Nearest Working Day (Next)" name="nearest_working_day" defaultChecked value="1" />
                            <AppSelect label="Category" name="category" defaultValue="other" options={[{ value: 'subscription', label: 'Subscription' }, { value: 'utility', label: 'Utility' }, { value: 'insurance', label: 'Insurance' }, { value: 'service', label: 'Service' }, { value: 'other', label: 'Other' }]} />
                            <Button type="submit">Add to Cycle</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={recurringAddOpen} onClose={() => setRecurringAddOpen(false)}>
            <ModalDialog sx={{ maxWidth: 400, width: '100%', overflow: 'hidden' }}>
                <DialogTitle>Add Recurring Expense</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleRecurringAdd}>
                        <Stack spacing={2}>
                            <FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl>
                            <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" step="0.01" /></FormControl>
                            <FormControl required><FormLabel>Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={1} /></FormControl>
                            <Checkbox label="Nearest Working Day (Next)" name="nearest_working_day" defaultChecked value="1" />
                            <FormControl>
                                <FormLabel>Assign To</FormLabel>
                                <Select name="assigned_to" defaultValue="general_1">
                                    <Option value="general_1">🏠 General</Option>
                                    <Divider>Members</Divider>
                                    {members.filter(m => m.type !== 'pet').map(m => <Option key={m.id} value={`member_${m.id}`}>{m.emoji} {m.name}</Option>)}
                                    <Divider>Pets</Divider>
                                    {members.filter(m => m.type === 'pet').map(p => <Option key={p.id} value={`pet_${p.id}`}>{p.emoji} {p.name}</Option>)}
                                    <Divider>Vehicles</Divider>
                                    {liabilities.vehicles.map(v => <Option key={v.id} value={`vehicle_${v.id}`}>{v.emoji || '🚗'} {v.make}</Option>)}
                                </Select>
                            </FormControl>
                            <AppSelect label="Category" name="category" defaultValue="other" options={[{ value: 'subscription', label: 'Subscription' }, { value: 'utility', label: 'Utility' }, { value: 'insurance', label: 'Insurance' }, { value: 'service', label: 'Service' }, { value: 'other', label: 'Other' }]} />
                            <Button type="submit">Add Recurring</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={potAllocationOpen} onClose={() => setPotAllocationOpen(false)}>
            <ModalDialog sx={{ maxWidth: 400, width: '100%', overflow: 'hidden' }}>
                <DialogTitle>Allocate to Pot</DialogTitle>
                <DialogContent>
                    <form onSubmit={handlePotAllocation}>
                        <Stack spacing={2}>
                            <FormControl required>
                                <FormLabel>Target Pot</FormLabel>
                                <Select name="name">
                                    {savingsPots.map(p => (
                                        <Option key={p.id} value={`Pot: ${p.name}`}>{p.emoji} {p.name}</Option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: '0.01' } }} /></FormControl>
                            <FormControl required><FormLabel>Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={new Date().getDate()} /></FormControl>
                            <Checkbox label="Nearest Working Day (Next)" name="nearest_working_day" defaultChecked value="1" />
                            <Button type="submit" color="success">Save Allocation</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>
    </Box>
  );
}
