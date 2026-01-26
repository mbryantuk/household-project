import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, LinearProgress, Switch,
  Dropdown, Menu, MenuButton, MenuItem
} from '@mui/joy';
import { 
  AccountBalanceWallet, CheckCircle, RadioButtonUnchecked, TrendingDown, 
  Event, Payments, Savings as SavingsIcon, Home, CreditCard, 
  Assignment, WaterDrop, ElectricBolt, AccountBalance, Add, Shield, 
  ShoppingBag, ChevronLeft, ChevronRight, Lock, LockOpen, ArrowDropDown, RestartAlt, Receipt,
  DirectionsCar
} from '@mui/icons-material';
import { 
  format, addMonths, startOfMonth, setDate, differenceInDays, 
  isSameDay, isAfter, startOfDay, isWithinInterval, 
  parseISO, getDay, addDays 
} from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BudgetView() {
  const { api, id: householdId, isDark, showNotification, members = [], setStatusBarData, confirmAction } = useOutletContext();
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
      charges: [], credit_cards: [], water: null, council: null, energy: [],
      pensions: [], vehicles: [], assets: []
  });
  const [savingsPots, setSavingsPots] = useState([]);

  const [selectedKeys, setSelectedKeys] = useState([]);
  
  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [recurringAddOpen, setRecurringAddOpen] = useState(false);

  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [isPayLocked, setIsPayLocked] = useState(true);

  const playDing = useCallback(() => {
      try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) { console.warn("Audio feedback failed", e); }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
          incRes, progRes, cycleRes, mortRes, loanRes, agreeRes, carRes, chargeRes, ccRes, waterRes, councilRes, energyRes, pensionRes, potRes, holidayRes, vehRes, assetRes
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
          api.get(`/households/${householdId}/water`),
          api.get(`/households/${householdId}/council`),
          api.get(`/households/${householdId}/energy`),
          api.get(`/households/${householdId}/finance/pensions`),
          api.get(`/households/${householdId}/finance/savings/pots`),
          api.get(`/system/holidays`),
          api.get(`/households/${householdId}/vehicles`),
          api.get(`/households/${householdId}/assets`)
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
          water: waterRes.data,
          council: councilRes.data,
          energy: energyRes.data || [],
          pensions: pensionRes.data || [],
          vehicles: vehRes.data || [],
          assets: assetRes.data || []
      });
      setSavingsPots(potRes.data || []);
      setBankHolidays(holidayRes.data || []);
    } catch (err) { console.error("Failed to fetch budget data", err); } finally { setLoading(false); }
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

      const expenses = [];
      
      const addExpense = (item, type, label, amount, dateObj, icon, category, object = null, memberId = null) => {
          const key = `${type}_${item.id || 'fixed'}_${format(dateObj, 'ddMM')}`; 
          const progressItem = progress.find(p => p.item_key === key && p.cycle_start === cycleKey);
          if (progressItem?.is_paid === -1) return;

          expenses.push({
              key, type, label: label || 'Unnamed Expense', amount: progressItem?.actual_amount || parseFloat(amount) || 0,
              day: dateObj.getDate(), computedDate: dateObj,
              icon, category, isPaid: progressItem?.is_paid === 1,
              isDeletable: !['pot', 'pension', 'investment'].includes(type),
              id: item.id, object, frequency: item.frequency?.toLowerCase() || 'monthly', 
              memberId: (memberId != null && String(memberId).length > 0) ? String(memberId) : null
          });
      };

      const getLinkedObject = (type, id) => {
          if (type === 'member') {
              const m = members.find(mem => String(mem.id) === String(id));
              return m ? { name: m.alias || m.name, emoji: m.emoji || '👤' } : null;
          }
          if (type === 'vehicle') {
              const v = liabilities.vehicles.find(veh => String(veh.id) === String(id));
              return v ? { name: `${v.make} ${v.model}`, emoji: v.emoji || '🚗' } : null;
          }
          if (type === 'asset') {
              const a = liabilities.assets.find(ast => String(ast.id) === String(id));
              return a ? { name: a.name, emoji: a.emoji || '📦' } : null;
          }
          return null;
      };

      liabilities.mortgages.forEach(m => addExpense(m, 'mortgage', m.lender, m.monthly_payment, getAdjustedDate(m.payment_day, true, startDate), <Home />, 'Mortgage', { name: 'House', emoji: '🏠' }));
      liabilities.loans.forEach(l => addExpense(l, 'loan', `${l.lender} Loan`, l.monthly_payment, getAdjustedDate(l.payment_day, true, startDate), <TrendingDown />, 'Liability', { name: 'Finance', emoji: '💰' }));
      
      liabilities.charges.forEach(charge => {
          let datesToAdd = [];
          if (charge.frequency === 'monthly') {
             datesToAdd.push(getAdjustedDate(charge.day_of_month, charge.adjust_for_working_day, startDate));
          } else if (charge.frequency === 'yearly') {
             const currentYearDate = new Date(startDate.getFullYear(), (charge.month_of_year || 1) - 1, charge.day_of_month || 1);
             const nextYearDate = new Date(startDate.getFullYear() + 1, (charge.month_of_year || 1) - 1, charge.day_of_month || 1);
             if (isWithinInterval(currentYearDate, { start: startDate, end: endDate })) {
                 datesToAdd.push(charge.adjust_for_working_day ? getNextWorkingDay(currentYearDate) : currentYearDate);
             } else if (isWithinInterval(nextYearDate, { start: startDate, end: endDate })) {
                 datesToAdd.push(charge.adjust_for_working_day ? getNextWorkingDay(nextYearDate) : nextYearDate);
             }
          } else if (charge.frequency === 'one_off') {
             const oneOffDate = parseISO(charge.exact_date);
             if (isWithinInterval(oneOffDate, { start: startDate, end: endDate })) datesToAdd.push(oneOffDate);
          } else if (charge.frequency === 'weekly') {
             let iter = new Date(startDate);
             while (iter <= endDate) {
                 if (getDay(iter) === (charge.day_of_week === 7 ? 0 : charge.day_of_week)) { 
                      datesToAdd.push(new Date(iter));
                 }
                 iter = addDays(iter, 1);
             }
          }

          const linkedObj = getLinkedObject(charge.linked_entity_type, charge.linked_entity_id);
          datesToAdd.forEach(d => {
             let icon = <Receipt />;
             if (charge.segment === 'insurance') icon = <Shield />;
             else if (charge.segment === 'subscription') icon = <ShoppingBag />;
             else if (charge.segment === 'utility') icon = <ElectricBolt />;
             else if (charge.segment?.startsWith('vehicle')) icon = <DirectionsCar />;
             addExpense(charge, 'charge', charge.name, charge.amount, d, icon, charge.segment, linkedObj, charge.linked_entity_type === 'member' ? charge.linked_entity_id : null);
          });
      });

      savingsPots.forEach(pot => addExpense(pot, 'pot', pot.name, 0, getAdjustedDate(pot.deposit_day || 1, false, startDate), <SavingsIcon />, 'Saving', { name: pot.account_name, emoji: pot.account_emoji || '💰' }));

      return { startDate, endDate, label, cycleKey, progressPct, daysRemaining, cycleDuration, expenses: expenses.sort((a, b) => (a.computedDate || 0) - (b.computedDate || 0)) };
  }, [incomes, liabilities, progress, viewDate, getPriorWorkingDay, getAdjustedDate, savingsPots, getNextWorkingDay, members]);

  const currentCycleRecord = useMemo(() => cycles.find(c => c.cycle_start === cycleData?.cycleKey), [cycles, cycleData]);

  useEffect(() => {
      if (currentCycleRecord) { setActualPay(currentCycleRecord.actual_pay); setCurrentBalance(currentCycleRecord.current_balance); }
      else { setActualPay(''); setCurrentBalance(''); }
  }, [currentCycleRecord]);

  const handleSelectToggle = (key) => setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const saveCycleData = async (pay, balance) => {
      if (!cycleData) return;
      try {
          await api.post(`/households/${householdId}/finance/budget-cycles`, { cycle_start: cycleData.cycleKey, actual_pay: parseFloat(pay) || 0, current_balance: parseFloat(balance) || 0 });
          const res = await api.get(`/households/${householdId}/finance/budget-cycles`);
          setCycles(res.data || []);
      } catch (err) { console.error("Failed to save cycle data", err); }
  };

  const handleResetCycle = () => {
      confirmAction(
          "Reset Month?", 
          "Are you sure you want to reset this month's budget? This will clear all progress, payments, and actual amounts for this cycle. This cannot be undone.",
          async () => {
              try {
                  await api.delete(`/households/${householdId}/finance/budget-cycles/${cycleData.cycleKey}`);
                  showNotification("Budget cycle reset.", "success");
                  fetchData();
              } catch { showNotification("Failed to reset cycle.", "danger"); }
          }
      );
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
          const isCurrentlyPaid = progress.some(p => p.item_key === itemKey && p.cycle_start === cycleData.cycleKey);
          if (isCurrentlyPaid) await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
          else { playDing(); await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: 1, actual_amount: amount }); }
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) { console.error("Failed to toggle paid status", err); } finally { setSavingProgress(false); }
  };

  const handleQuickAdd = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      data.frequency = 'one_off'; 
      data.segment = 'other';
      data.adjust_for_working_day = data.nearest_working_day === "1" ? 1 : 0;
      if (cycleData) {
          const d = setDate(cycleData.startDate, parseInt(data.payment_day));
          data.exact_date = format(d, 'yyyy-MM-dd');
      }
      try {
          await api.post(`/households/${householdId}/finance/charges`, data);
          showNotification("One-off expense added.", "success");
          fetchData(); setQuickAddOpen(false);
      } catch { alert("Failed to add one-off expense"); }
  };

  const handleRecurringAdd = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      data.adjust_for_working_day = data.nearest_working_day === "1" ? 1 : 0;
      data.day_of_month = parseInt(data.payment_day);
      data.frequency = 'monthly';
      data.segment = data.category || 'other';
      try {
          await api.post(`/households/${householdId}/finance/charges`, data);
          showNotification("Recurring expense added.", "success");
          fetchData(); setRecurringAddOpen(false);
      } catch { alert("Failed to add recurring expense"); }
  };

  const cycleTotals = useMemo(() => {
      if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
      const activeExpenses = cycleData.expenses.filter(e => e.isPaid || e.amount > 0);
      const total = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
      const paid = activeExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return { total, paid, unpaid: total - paid };
  }, [cycleData]);

  const savingsTotal = useMemo(() => savingsPots.reduce((sum, pot) => sum + (parseFloat(pot.current_amount) || 0), 0), [savingsPots]);

  const selectedTotals = useMemo(() => {
      if (!selectedKeys.length || !cycleData) return null;
      const selected = cycleData.expenses.filter(e => selectedKeys.includes(e.key));
      const total = selected.reduce((sum, e) => sum + e.amount, 0);
      const paid = selected.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return { count: selected.length, total, paid, unpaid: total - paid };
  }, [selectedKeys, cycleData]);
  
  useEffect(() => { setStatusBarData(selectedTotals); return () => setStatusBarData(null); }, [selectedTotals, setStatusBarData]);

  const trueDisposable = (parseFloat(currentBalance) || 0) - cycleTotals.unpaid;

  const groupedPots = useMemo(() => {
      const groups = {};
      savingsPots.forEach(pot => {
          if (!groups[pot.savings_id]) {
              groups[pot.savings_id] = { name: pot.account_name, institution: pot.institution, emoji: pot.account_emoji || '💰', balance: pot.current_balance || 0, pots: [] };
          }
          groups[pot.savings_id].pots.push(pot);
      });
      return groups;
  }, [savingsPots]);

  const groupedRecurring = useMemo(() => {
      if (!cycleData) return {};
      const groups = {};
      cycleData.expenses.filter(exp => exp.type === 'charge' || exp.type === 'mortgage' || exp.type === 'loan').forEach(exp => {
          const freq = exp.frequency || 'monthly';
          const normalized = freq.toLowerCase();
          if (!groups[normalized]) groups[normalized] = [];
          groups[normalized].push(exp);
      });
      return groups;
  }, [cycleData]);

  const getVisibleItems = useCallback((items) => {
      return items.filter(exp => !hidePaid || !exp.isPaid);
  }, [hidePaid]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!cycleData) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography level="h4">No Primary Income Set</Typography><Button sx={{ mt: 2 }} onClick={fetchData}>Refresh</Button></Box>;

  const renderTableRows = (items, cols = 7, hidePill = false) => {
    return items.map((exp) => (
        <tr 
          key={exp.key} 
          onClick={() => handleSelectToggle(exp.key)} 
          style={{ cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent', opacity: exp.isPaid ? 0.6 : 1 }}
        >
            <td style={{ textAlign: 'center' }}><Checkbox size="sm" checked={selectedKeys.includes(exp.key)} onChange={() => handleSelectToggle(exp.key)} onClick={(e) => e.stopPropagation()} /></td>
            <td>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar size="sm" sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: getEmojiColor(exp.label || '?', isDark), color: '#fff' }}>{exp.icon}</Avatar>
                    <Box>
                        <Typography level="body-xs" fontWeight="bold">{exp.label}</Typography>
                        {!hidePill && exp.object && (
                            <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {exp.object.emoji} {exp.object.name}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </td>
            <td>
                <Chip size="sm" variant="soft" color="neutral" sx={{ fontSize: '0.65rem', minHeight: '16px', px: 0.5, maxWidth: '100%' }}>
                    <Typography noWrap sx={{ maxWidth: '120px', textTransform: 'capitalize' }}>{exp.category}</Typography>
                </Chip>
            </td>
            {cols >= 7 ? (<td><Box sx={{ textAlign: 'center' }}><Typography level="body-xs" fontWeight="bold">{exp.day}</Typography>{exp.computedDate && <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>{format(exp.computedDate, 'EEE do MMM')}</Typography>}</Box></td>) : <td />}
            <td style={{ textAlign: 'right' }}><Input size="sm" type="number" variant="soft" sx={{ fontSize: '0.75rem', '--Input-minHeight': '24px', textAlign: 'right', '& input': { textAlign: 'right' } }} defaultValue={Number(exp.amount).toFixed(2)} onBlur={(e) => updateActualAmount(exp.key, e.target.value)} onClick={(e) => e.stopPropagation()} slotProps={{ input: { step: '0.01' } }} /></td>
            <td style={{ textAlign: 'center' }}><Checkbox size="sm" variant="plain" checked={exp.isPaid} onChange={() => togglePaid(exp.key, exp.amount)} disabled={savingProgress} uncheckedIcon={<RadioButtonUnchecked sx={{ fontSize: '1.2rem' }} />} checkedIcon={<CheckCircle color="success" sx={{ fontSize: '1.2rem' }} />} onClick={(e) => e.stopPropagation()} sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent' } }} /></td>
            {cols >= 7 ? <td></td> : <td />}
        </tr>
    ));
  };

  const renderSection = (items, cols = 7, hidePill = false) => {
    const visible = getVisibleItems(items);
    if (visible.length === 0) return null;
    return (
        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
            <Table hoverRow stickyHeader size="sm" sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '4px' }}>
                <thead>
                    <tr>
                        <th style={{ width: 40, textAlign: 'center' }}><Checkbox size="sm" onChange={(e) => {
                            const keys = visible.map(exp => exp.key);
                            if (e.target.checked) setSelectedKeys(prev => Array.from(new Set([...prev, ...keys])));
                            else setSelectedKeys(prev => prev.filter(k => !keys.includes(k)));
                        }} /></th>
                        <th>Expense</th>
                        <th style={{ width: 140 }}>Category</th> 
                        {cols >= 7 ? <th style={{ width: 100, textAlign: 'center' }}>Date</th> : <th style={{ width: 80 }}></th>}
                        <th style={{ width: 100, textAlign: 'right' }}>Amount</th>
                        <th style={{ width: 40, textAlign: 'center' }}>Paid</th>
                        {cols >= 7 ? <th style={{ width: 80 }}></th> : <th style={{ width: 80 }}></th>}
                    </tr>
                </thead>
                <tbody>{renderTableRows(visible, cols, hidePill)}</tbody>
            </Table>
        </Sheet>
    );
  };

  return (
    <Box sx={{ userSelect: 'none', pb: 10 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton><Box><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{cycleData.label}</Typography><Chip variant="soft" color="primary" size="sm">{cycleData.cycleDuration} Days</Chip></Box><Typography level="body-md" color="neutral">{format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}</Typography></Box><IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton></Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><FormControl orientation="horizontal" size="sm" sx={{ mr: 1 }}><FormLabel sx={{ mr: 1 }}>Hide Paid</FormLabel><Switch checked={hidePaid} onChange={(e) => setHidePaid(e.target.checked)} size="sm" /></FormControl>
                {currentCycleRecord && (
                    <Button variant="outlined" color="danger" size="sm" startDecorator={<RestartAlt />} onClick={handleResetCycle}>Reset Month</Button>
                )}
                {selectedKeys.length > 0 && (<Button variant="outlined" color="neutral" size="sm" onClick={() => setSelectedKeys([])}>Clear</Button>)}
                <Dropdown><MenuButton variant="solid" color="primary" size="sm" startDecorator={<Add />} endDecorator={<ArrowDropDown />}>Add</MenuButton><Menu placement="bottom-end" size="sm"><MenuItem onClick={() => setQuickAddOpen(true)}>Add One-off</MenuItem><MenuItem onClick={() => setRecurringAddOpen(true)}>Add Recurring</MenuItem></Menu></Dropdown>
            </Box>
        </Box>

        <Box sx={{ mb: 2 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}><Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Days Left</Typography><Typography level="body-xs" fontWeight="bold">{cycleData.daysRemaining} days to go</Typography></Box><LinearProgress determinate value={cycleData.progressPct} thickness={6} variant="soft" color="primary" sx={{ borderRadius: 'sm', '--LinearProgress-radius': '4px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }} /></Box>

        <Grid container spacing={3}>
            <Grid xs={12} md={3}>
                <Stack spacing={3}>
                    <Card variant="outlined" sx={{ p: 3 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography level="title-lg" startDecorator={<AccountBalanceWallet />}>Budget Entry</Typography><IconButton size="sm" variant={isPayLocked ? "plain" : "soft"} color={isPayLocked ? "neutral" : "warning"} onClick={() => setIsPayLocked(!isPayLocked)}>{isPayLocked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}</IconButton></Box>
                        <Stack spacing={2}><FormControl><FormLabel>Pay (£)</FormLabel><Input type="number" value={actualPay} disabled={isPayLocked} onChange={(e) => setActualPay(e.target.value)} onBlur={(e) => saveCycleData(e.target.value, currentBalance)} slotProps={{ input: { step: '0.01' } }} /></FormControl><FormControl><FormLabel>Balance (£)</FormLabel><Input type="number" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} onBlur={(e) => saveCycleData(actualPay, e.target.value)} autoFocus slotProps={{ input: { step: '0.01' } }} /></FormControl></Stack>
                    </Card>
                    <Card variant="outlined" sx={{ p: 3, boxShadow: 'sm' }}><Typography level="title-lg" startDecorator={<AccountBalanceWallet />} sx={{ mb: 2 }}>Budget Overview</Typography>
                        <Stack spacing={1} sx={{ mb: 3 }}><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-md" color="neutral">Current Balance</Typography><Typography level="body-md" fontWeight="lg">{formatCurrency(parseFloat(currentBalance) || 0)}</Typography></Box><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-md" color="danger">Left to Pay</Typography><Typography level="body-md" fontWeight="lg" color="danger">- {formatCurrency(cycleTotals.unpaid)}</Typography></Box><Divider /><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}><Typography level="title-md">Safe to Spend</Typography><Typography level="h2" color={trueDisposable >= 0 ? 'success' : 'danger'}>{formatCurrency(trueDisposable)}</Typography></Box><Divider sx={{ my: 1 }} /><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography level="body-sm" color="neutral">Total Savings</Typography><Typography level="title-md" color="success">{formatCurrency(savingsTotal)}</Typography></Box></Stack>
                        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'md' }}><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography level="body-xs" fontWeight="bold">Bills Paid</Typography><Typography level="body-xs">{Math.round((cycleTotals.paid / (cycleTotals.total || 1)) * 100)}%</Typography></Box><LinearProgress determinate value={(cycleTotals.paid / (cycleTotals.total || 1)) * 100} thickness={6} color="success" sx={{ bgcolor: 'background.level2' }} /><Typography level="body-xs" sx={{ mt: 1, textAlign: 'center', color: 'neutral.500' }}>{formatCurrency(cycleTotals.paid)} paid of {formatCurrency(cycleTotals.total)} total</Typography></Box>
                    </Card>
                </Stack>
            </Grid>

            <Grid xs={12} md={9}>
                <Stack spacing={4}>
                    {Object.keys(groupedRecurring).map(freq => {
                        const items = groupedRecurring[freq] || [];
                        if (getVisibleItems(items).length === 0) return null;
                        return (
                            <Box key={freq}>
                                <Typography level="title-md" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'capitalize' }}><Payments fontSize="small" /> {freq} Expenses</Typography>
                                {renderSection(items, 6, false)}
                            </Box>
                        );
                    })}

                    {(() => {
                        const visibleAccountGroups = Object.entries(groupedPots).map(([accId, group]) => {
                            const potItems = group.pots.map(p => cycleData.expenses.find(e => e.key === `pot_${p.id}`)).filter(Boolean);
                            const visiblePots = getVisibleItems(potItems);
                            if (visiblePots.length === 0) return null;
                            return { accId, group, visiblePots, potItems };
                        }).filter(Boolean);

                        if (visibleAccountGroups.length === 0) return null;

                        return (
                            <Box>
                                <Typography level="title-md" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}><SavingsIcon fontSize="small" /> Savings & Goals</Typography>
                                <Stack spacing={3}>
                                    {visibleAccountGroups.map(({ accId, group, potItems }) => (
                                        <Box key={accId}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(group.emoji, isDark) }}>{group.emoji}</Avatar><Box><Typography level="title-sm">{group.name}</Typography><Typography level="body-xs" color="neutral">{group.institution}</Typography></Box></Box>
                                                <Box sx={{ textAlign: 'right' }}><Typography level="title-sm" color="success">{formatCurrency(group.balance)}</Typography><Typography level="body-xs">Balance</Typography></Box>
                                            </Box>
                                            {renderSection(potItems, 4, true)}
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        );
                    })()}
                </Stack>
            </Grid>
        </Grid>

        <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)}><ModalDialog sx={{ maxWidth: 400, width: '100%' }}><DialogTitle>Add One-off Expense</DialogTitle><DialogContent><form onSubmit={handleQuickAdd}><Stack spacing={2}><FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl><FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: '0.01' } }} /></FormControl><FormControl required><FormLabel>Due Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={new Date().getDate()} /></FormControl><Checkbox label="Nearest Working Day (Next)" name="nearest_working_day" defaultChecked value="1" /><AppSelect label="Category" name="category" defaultValue="other" options={[{ value: 'subscription', label: 'Subscription' }, { value: 'utility', label: 'Utility' }, { value: 'insurance', label: 'Insurance' }, { value: 'service', label: 'Service' }, { value: 'other', label: 'Other' }]} /><Button type="submit">Add to Cycle</Button></Stack></form></DialogContent></ModalDialog></Modal>
        <Modal open={recurringAddOpen} onClose={() => setRecurringAddOpen(false)}><ModalDialog sx={{ maxWidth: 400, width: '100%' }}><DialogTitle>Add Recurring Expense</DialogTitle><DialogContent><form onSubmit={handleRecurringAdd}><Stack spacing={2}><FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl><FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" step="0.01" /></FormControl><FormControl required><FormLabel>Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={1} /></FormControl><Checkbox label="Nearest Working Day (Next)" name="nearest_working_day" defaultChecked value="1" /><AppSelect label="Category" name="category" defaultValue="other" options={[{ value: 'subscription', label: 'Subscription' }, { value: 'utility', label: 'Utility' }, { value: 'insurance', label: 'Insurance' }, { value: 'service', label: 'Service' }, { value: 'saving', label: 'Saving' }, { value: 'other', label: 'Other' }]} /><Button type="submit">Add Recurring</Button></Stack></form></DialogContent></ModalDialog></Modal>
    </Box>
  );
}