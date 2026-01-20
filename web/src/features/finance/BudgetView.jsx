import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, Tooltip, LinearProgress, Select, Option
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
  PriceCheck,
  ChevronLeft,
  ChevronRight,
  Person,
  Pets,
  Delete
} from '@mui/icons-material';
import { format, addMonths, startOfMonth, endOfMonth, setDate, differenceInDays, isSameDay, isAfter } from 'date-fns';
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
  
  // Data State
  const [incomes, setIncomes] = useState([]);
  const [progress, setProgress] = useState([]); 
  const [cycles, setCycles] = useState([]); 
  const [liabilities, setLiabilities] = useState({
      mortgages: [], loans: [], agreements: [], vehicle_finance: [], 
      recurring_costs: [], credit_cards: [], water: null, council: null, energy: [],
      pensions: [], vehicles: []
  });
  const [savingsPots, setSavingsPots] = useState([]);

  // Selection State
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  // User Inputs
  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');

  // Modal State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [potAllocationOpen, setPotAllocationOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

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

  // --- LOGIC: WORKING DAYS ---
  const getPriorWorkingDay = (date) => {
      let d = new Date(date);
      const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
      const isHoliday = (day) => bankHolidays.includes(format(day, 'yyyy-MM-dd'));
      
      while (isWeekend(d) || isHoliday(d)) {
          d.setDate(d.getDate() - 1);
      }
      return d;
  };

  const getNextWorkingDay = (date) => {
      let d = new Date(date);
      const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
      const isHoliday = (day) => bankHolidays.includes(format(day, 'yyyy-MM-dd'));
      
      while (isWeekend(d) || isHoliday(d)) {
          d.setDate(d.getDate() + 1);
      }
      return d;
  };

  // --- LOGIC: PAYCHECK TO PAYCHECK ---
  const cycleData = useMemo(() => {
      const primaryIncome = incomes.find(i => i.is_primary === 1) || incomes.find(i => i.payment_day > 0);
      if (!primaryIncome || !primaryIncome.payment_day) return null;

      const payday = parseInt(primaryIncome.payment_day);
      let rawStartDate;
      
      if (viewDate.getDate() >= payday) {
          rawStartDate = setDate(startOfMonth(viewDate), payday);
      } else {
          rawStartDate = setDate(startOfMonth(addMonths(viewDate, -1)), payday);
      }

      // Apply Working Day Logic to Income/Cycle Start
      const startDate = getPriorWorkingDay(rawStartDate);
      const endDate = addMonths(startDate, 1);
      const cycleKey = format(startDate, 'yyyy-MM-dd');
      const label = format(startDate, 'MMM yyyy') + " Cycle";

      // Progress through cycle
      const now = new Date();
      let progressPct = 0;
      if (isSameDay(now, startDate) || isAfter(now, startDate)) {
          const totalDays = differenceInDays(endDate, startDate);
          const daysPassed = differenceInDays(now, startDate);
          progressPct = Math.min((daysPassed / totalDays) * 100, 100);
      }

      const expenses = [];

      const addExpense = (item, type, label, amount, day, icon, category, object = null) => {
          const key = `${type}_${item.id || 'fixed'}`;
          const progressItem = progress.find(p => p.item_key === key && p.cycle_start === cycleKey);
          
          // Filter one-off costs to ONLY show in their assigned cycle
          if (item.frequency === 'one-off' && item.next_due !== cycleKey) return;

          let actualDate = null;
          if (day) {
              const d = parseInt(day);
              let candidate = setDate(startDate, d);
              // if day is less than payday day, it's likely next month
              if (d < payday) {
                  candidate = addMonths(candidate, 1);
              }
              
              // Apply NWD logic
              // For recurring costs, respect item.nearest_working_day (Next)
              // For others, default to true (bills)
              const useNwd = type === 'cost' ? !!item.nearest_working_day : true;
              actualDate = useNwd ? getNextWorkingDay(candidate) : candidate;
          }

          expenses.push({
              key,
              type,
              label,
              amount: progressItem?.actual_amount || parseFloat(amount) || 0,
              baseAmount: parseFloat(amount) || 0,
              day: type === 'pot' ? null : (parseInt(day) || 1),
              actualDate,
              icon,
              category,
              isPaid: !!progressItem,
              isPot: type === 'pot',
              isDeletable: type === 'cost' && (item.frequency === 'one-off' || item.parent_type === 'general'),
              id: item.id,
              object // { name, emoji }
          });
      };

      liabilities.mortgages.forEach(m => addExpense(m, 'mortgage', `${m.lender}`, m.monthly_payment, m.payment_day, <Home />, 'Liability', { name: 'House', emoji: '🏠' }));
      liabilities.loans.forEach(l => addExpense(l, 'loan', `${l.lender} Loan`, l.monthly_payment, l.payment_day, <TrendingDown />, 'Liability', { name: 'Finance', emoji: '💰' }));
      liabilities.agreements.forEach(a => addExpense(a, 'agreement', a.agreement_name, a.monthly_payment, a.payment_day, <Assignment />, 'Agreement', { name: a.provider, emoji: '📄' }));
      liabilities.vehicle_finance.forEach(v => {
          const veh = liabilities.vehicles.find(vh => vh.id === v.vehicle_id);
          addExpense(v, 'car_finance', `Finance: ${v.provider}`, v.monthly_payment, v.payment_day, <DirectionsCar />, 'Liability', { name: veh ? `${veh.make} ${veh.model}` : 'Vehicle', emoji: veh?.emoji || '🚗' });
      });
      liabilities.pensions.forEach(p => addExpense(p, 'pension', p.plan_name, p.monthly_contribution, p.payment_day, <SavingsIcon />, 'Pension', { name: 'Retirement', emoji: '👴' }));
      
      liabilities.recurring_costs.forEach(c => {
          let icon = <Payments />;
          let object = { name: 'General', emoji: '💸' };

          if (c.parent_type === 'member') {
              const m = members.find(mem => mem.id === c.parent_id);
              object = { name: m ? (m.alias || m.name) : 'User', emoji: m?.emoji || '👤' };
              icon = <Person />;
          } else if (c.parent_type === 'pet') {
              const p = members.find(mem => mem.id === c.parent_id);
              object = { name: p ? (p.alias || p.name) : 'Pet', emoji: p?.emoji || '🐾' };
              icon = <Pets />;
          } else if (c.parent_type === 'vehicle') {
              const v = liabilities.vehicles.find(veh => veh.id === c.parent_id);
              object = { name: v ? `${v.make}` : 'Vehicle', emoji: v?.emoji || '🚗' };
              icon = <DirectionsCar />;
          }

          if (c.category === 'insurance') icon = <Shield />;
          if (c.category === 'subscription') icon = <ShoppingBag />;
          if (c.category === 'service') icon = <HistoryEdu />;
          if (c.category === 'saving') icon = <SavingsIcon />;

          addExpense(c, 'cost', c.name, c.amount, c.payment_day, icon, c.category || 'Cost', object);
      });

      liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit', `${cc.card_name}`, 0, cc.payment_day, <CreditCard />, 'Credit Card', { name: cc.provider, emoji: cc.emoji || '💳' }));
      if (liabilities.water) addExpense(liabilities.water, 'water', 'Water Bill', liabilities.water.monthly_amount, liabilities.water.payment_day, <WaterDrop />, 'Utility', { name: 'House', emoji: '💧' });
      if (liabilities.council) addExpense(liabilities.council, 'council', 'Council Tax', liabilities.council.monthly_amount, liabilities.council.payment_day, <AccountBalance />, 'Utility', { name: 'House', emoji: '🏛️' });
      liabilities.energy.forEach(e => addExpense(e, 'energy', `${e.provider} (${e.type})`, e.monthly_amount, e.payment_day, <ElectricBolt />, 'Utility', { name: 'House', emoji: '⚡' }));

      return { startDate, endDate, label, cycleKey, progressPct, expenses: expenses.sort((a, b) => (a.day || 99) - (b.day || 99)) };
  }, [incomes, liabilities, progress, viewDate, members, bankHolidays]);

  // --- SELECTION ENGINE ---
  const handleRowClick = (e, index, key) => {
      const isShift = e.shiftKey;
      const isCtrl = e.metaKey || e.ctrlKey;

      if (isShift && lastSelectedIndex !== null) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          const keysInRange = cycleData.expenses.slice(start, end + 1).map(exp => exp.key);
          setSelectedKeys(prev => Array.from(new Set([...prev, ...keysInRange])));
      } else if (isCtrl) {
          setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
          setLastSelectedIndex(index);
      } else {
          setSelectedKeys([key]);
          setLastSelectedIndex(index);
      }
  };

  // Sync Status Bar Summary
  useEffect(() => {
      if (selectedKeys.length > 0 && cycleData) {
          const selectedItems = cycleData.expenses.filter(e => selectedKeys.includes(e.key));
          const totalSelected = selectedItems.reduce((sum, e) => sum + e.amount, 0);
          const paidSelected = selectedItems.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
          const unpaidSelected = totalSelected - paidSelected;

          setStatusBarData({
              count: selectedKeys.length,
              total: totalSelected,
              paid: paidSelected,
              unpaid: unpaidSelected
          });
      } else {
          setStatusBarData(null);
      }
      return () => setStatusBarData(null);
  }, [selectedKeys, cycleData, setStatusBarData]);

  // Sync cycle inputs
  useEffect(() => {
      if (cycleData) {
          const existing = cycles.find(c => c.cycle_start === cycleData.cycleKey);
          if (existing) {
              setActualPay(existing.actual_pay || '');
              setCurrentBalance(existing.current_balance || '');
          } else {
              const primary = incomes.find(i => i.is_primary);
              setActualPay(primary ? primary.amount : '');
              setCurrentBalance('');
          }
      }
  }, [cycleData, cycles, incomes]);

  const saveCycleData = async (pay, balance) => {
      if (!cycleData) return;
      try {
          await api.post(`/households/${householdId}/finance/budget-cycles`, {
              cycle_start: cycleData.cycleKey,
              actual_pay: parseFloat(pay) || 0,
              current_balance: parseFloat(balance) || 0
          });
          const res = await api.get(`/households/${householdId}/finance/budget-cycles`);
          setCycles(res.data || []);
      } catch (err) { console.error(err); }
  };

  const updateActualAmount = async (itemKey, amount) => {
      const cycleStart = cycleData.cycleKey;
      try {
          await api.post(`/households/${householdId}/finance/budget-progress`, {
              cycle_start: cycleStart,
              item_key: itemKey,
              is_paid: 1,
              actual_amount: parseFloat(amount) || 0
          });
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) { console.error(err); }
  };

  const togglePaid = async (itemKey, amount = 0) => {
      if (!cycleData) return;
      setSavingProgress(true);
      const cycleStart = cycleData.cycleKey;
      try {
          const isCurrentlyPaid = progress.some(p => p.item_key === itemKey && p.cycle_start === cycleStart);
          if (isCurrentlyPaid) {
              await api.delete(`/households/${householdId}/finance/budget-progress/${cycleStart}/${itemKey}`);
          } else {
              await api.post(`/households/${householdId}/finance/budget-progress`, {
                  cycle_start: cycleStart,
                  item_key: itemKey,
                  is_paid: 1,
                  actual_amount: amount
              });
          }
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) { console.error(err); } finally { setSavingProgress(false); }
  };

  const handleQuickAdd = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      data.parent_type = 'general';
      data.parent_id = 1;
      data.frequency = 'one-off'; 
      data.next_due = cycleData.cycleKey;

      try {
          await api.post(`/households/${householdId}/costs`, data);
          showNotification("One-off expense added.", "success");
          fetchData();
          setQuickAddOpen(false);
      } catch (err) { alert("Failed to add"); }
  };

  const handlePotAllocation = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      data.parent_type = 'general';
      data.parent_id = 1;
      data.frequency = 'monthly';
      data.category = 'saving';

      try {
          await api.post(`/households/${householdId}/costs`, data);
          showNotification("Savings allocation added.", "success");
          fetchData();
          setPotAllocationOpen(false);
      } catch (err) { alert("Failed to add"); }
  };

  const deleteExpense = async (id) => {
      if (!window.confirm("Remove this expense from recurring costs?")) return;
      try {
          await api.delete(`/households/${householdId}/costs/${id}`);
          fetchData();
      } catch (err) { console.error(err); }
  };

  const totals = useMemo(() => {
      if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
      const total = cycleData.expenses.reduce((sum, e) => sum + e.amount, 0);
      const paid = cycleData.expenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      const unpaid = total - paid;
      return { total, paid, unpaid };
  }, [cycleData]);

  const trueDisposable = (parseFloat(currentBalance) || 0) - totals.unpaid;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  if (!cycleData) {
      return (
          <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography level="h4">No Primary Income Set</Typography>
              <Typography level="body-md">Please flag an income source as 'Primary' to drive the budget cycle.</Typography>
              <Button sx={{ mt: 2 }} onClick={() => fetchData()}>Refresh</Button>
          </Box>
      );
  }

  return (
    <Box sx={{ userSelect: 'none' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton>
                <Box>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{cycleData.label}</Typography>
                    <Typography level="body-md" color="neutral">
                        {format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}
                    </Typography>
                </Box>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" color="neutral" size="sm" onClick={() => setSelectedKeys([])}>Clear Selection</Button>
                <Button variant="outlined" startDecorator={<SavingsIcon />} onClick={() => setPotAllocationOpen(true)}>Allocate Pot</Button>
                <Button startDecorator={<Add />} onClick={() => setQuickAddOpen(true)}>Add One-off Expense</Button>
            </Box>
        </Box>

        <Grid container spacing={3}>
            <Grid xs={12} md={4}>
                <Stack spacing={3}>
                    <Card variant="outlined" sx={{ p: 3, bgcolor: 'background.surface' }}>
                        <Typography level="title-lg" sx={{ mb: 2 }} startDecorator={<AccountBalanceWallet />}>Cycle Entry</Typography>
                        <Stack spacing={2}>
                            <FormControl>
                                <FormLabel>Actual Pay Received (£)</FormLabel>
                                <Input 
                                    type="number" 
                                    value={actualPay} 
                                    onChange={(e) => setActualPay(e.target.value)}
                                    onBlur={(e) => saveCycleData(e.target.value, currentBalance)}
                                    slotProps={{ input: { step: 'any' } }}
                                    placeholder="0.00"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Current Bank Balance (£)</FormLabel>
                                <Input 
                                    type="number" 
                                    value={currentBalance} 
                                    onChange={(e) => setCurrentBalance(e.target.value)}
                                    onBlur={(e) => saveCycleData(actualPay, e.target.value)}
                                    slotProps={{ input: { step: 'any' } }}
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </FormControl>
                        </Stack>
                    </Card>

                    <Card variant="solid" color={trueDisposable < 0 ? 'danger' : 'primary'} invertedColors sx={{ p: 3 }}>
                        <Typography level="title-md">True Disposable Income</Typography>
                        <Typography level="h1">{formatCurrency(trueDisposable)}</Typography>
                        <Typography level="body-xs" sx={{ opacity: 0.8 }}>
                            Balance minus remaining bills (£{totals.unpaid.toFixed(2)})
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography level="body-xs">Bill Progress</Typography>
                                <Typography level="body-xs">{((totals.paid / totals.total) * 100).toFixed(0)}%</Typography>
                            </Box>
                            <LinearProgress determinate value={Math.min((totals.paid / totals.total) * 100, 100)} sx={{ height: 8, borderRadius: 4 }} />
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography level="body-xs">Month Progress</Typography>
                                <Typography level="body-xs">{cycleData.progressPct.toFixed(0)}%</Typography>
                            </Box>
                            <LinearProgress color="neutral" determinate value={cycleData.progressPct} sx={{ height: 8, borderRadius: 4, opacity: 0.5 }} />
                        </Box>
                    </Card>

                    <Card variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-sm">Total Cycle Expenses</Typography><Typography level="body-sm" fontWeight="bold">{formatCurrency(totals.total)}</Typography></Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-sm">Paid So Far</Typography><Typography level="body-sm" fontWeight="bold" color="success">{formatCurrency(totals.paid)}</Typography></Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-sm" color="neutral">Remaining Commitments</Typography><Typography level="body-sm" fontWeight="bold" color="warning">{formatCurrency(totals.unpaid)}</Typography></Box>
                        </Stack>
                    </Card>
                </Stack>
            </Grid>

            <Grid xs={12} md={8}>
                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
                    <Table hoverRow sx={{ '& tr > *:last-child': { textAlign: 'right' } }}>
                        <thead>
                            <tr>
                                <th style={{ width: 48 }}>Paid</th>
                                <th>Expense</th>
                                <th style={{ width: 100, textAlign: 'center' }}>Date</th>
                                <th style={{ width: 150 }}>Amount (£)</th>
                                <th style={{ width: 48 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cycleData.expenses.map((exp, index) => {
                                const isSelected = selectedKeys.includes(exp.key);
                                return (
                                <tr 
                                    key={exp.key} 
                                    onClick={(e) => handleRowClick(e, index, exp.key)}
                                    style={{ 
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? 'var(--joy-palette-primary-softBg)' : (exp.isPaid ? 'var(--joy-palette-background-level1)' : 'transparent'),
                                        opacity: exp.isPaid && !isSelected ? 0.6 : 1
                                    }}
                                >
                                    <td>
                                        <Checkbox 
                                            size="lg"
                                            checked={exp.isPaid}
                                            onChange={(e) => { e.stopPropagation(); togglePaid(exp.key, exp.amount); }}
                                            disabled={savingProgress}
                                            uncheckedIcon={<RadioButtonUnchecked />}
                                            checkedIcon={<CheckCircle color="success" />}
                                        />
                                    </td>
                                    <td>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar size="sm" sx={{ bgcolor: isSelected ? 'primary.solidBg' : 'background.level2' }}>{exp.icon}</Avatar>
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography level="title-sm">{exp.label}</Typography>
                                                    {exp.object && (
                                                        <Chip size="sm" variant="soft" color="neutral" startDecorator={exp.object.emoji}>
                                                            {exp.object.name}
                                                        </Chip>
                                                    )}
                                                </Box>
                                                <Typography level="body-xs" color="neutral">{exp.category.toUpperCase()}</Typography>
                                            </Box>
                                        </Box>
                                    </td>
                                    <td>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography level="body-sm" fontWeight="lg">{exp.day || '-'}</Typography>
                                            {exp.actualDate && (
                                                <Typography level="body-xs" color="neutral">
                                                    {format(exp.actualDate, 'EEE do')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </td>
                                    <td>
                                        <Input 
                                            size="sm"
                                            type="number"
                                            variant="soft"
                                            defaultValue={exp.amount}
                                            onClick={(e) => e.stopPropagation()}
                                            onBlur={(e) => updateActualAmount(exp.key, e.target.value)}
                                            slotProps={{ input: { step: 'any' } }}
                                            sx={{ maxWidth: 100, ml: 'auto' }}
                                            endDecorator={exp.isPaid && <PriceCheck color="success" sx={{ fontSize: '1rem' }}/>}
                                        />
                                    </td>
                                    <td>
                                        {exp.isDeletable && (
                                            <IconButton size="sm" color="danger" variant="plain" onClick={(e) => { e.stopPropagation(); deleteExpense(exp.id); }}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        )}
                                    </td>
                                </tr>
                            );})}
                        </tbody>
                    </Table>
                </Sheet>
            </Grid>
        </Grid>

        {/* MODALS */}
        <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)}>
            <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
                <DialogTitle>Add One-off Expense</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleQuickAdd}>
                        <Stack spacing={2}>
                            <FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl>
                            <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: 'any' } }} /></FormControl>
                            <FormControl required><FormLabel>Due Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={new Date().getDate()} /></FormControl>
                            <AppSelect label="Category" name="category" defaultValue="other" options={[{ value: 'subscription', label: 'Subscription' }, { value: 'utility', label: 'Utility' }, { value: 'insurance', label: 'Insurance' }, { value: 'service', label: 'Warranty/Service' }, { value: 'other', label: 'Other' }]} />
                            <Button type="submit">Add to Cycle</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={potAllocationOpen} onClose={() => setPotAllocationOpen(false)}>
            <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
                <DialogTitle>Allocate to Savings Pot</DialogTitle>
                <DialogContent>
                    <form onSubmit={handlePotAllocation}>
                        <Stack spacing={2}>
                            <FormControl required>
                                <FormLabel>Target Pot</FormLabel>
                                <Select name="name">
                                    {savingsPots.map(p => (
                                        <Option key={p.id} value={`Pot: ${p.name}`}>{p.emoji} {p.name} ({p.account_name})</Option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl required><FormLabel>Monthly Allocation (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: 'any' } }} /></FormControl>
                            <FormControl required><FormLabel>Transfer Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={new Date().getDate()} /></FormControl>
                            <Button type="submit" color="success">Save Allocation</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>
    </Box>
  );
}