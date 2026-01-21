import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, LinearProgress, Select, Option, Switch,
  Dropdown, Menu, MenuButton, MenuItem
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
  Inventory,
  ChevronLeft,
  ChevronRight,
  Person,
  Pets,
  Delete,
  Lock,
  LockOpen,
  ArrowDropDown
} from '@mui/icons-material';
import { format, addMonths, startOfMonth, setDate, differenceInDays, isSameDay, isAfter } from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BudgetView() {
  const { api, id: householdId, isDark, showNotification, members, setStatusBarData } = useOutletContext();
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
      pensions: [], vehicles: [], assets: []
  });
  const [savingsPots, setSavingsPots] = useState([]);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [recurringAddOpen, setRecurringAddOpen] = useState(false);
  const [familyExpenseOpen, setFamilyExpenseOpen] = useState(false);

  const [selectedKeys, setSelectedKeys] = useState([]);

  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [isPayLocked, setIsPayLocked] = useState(true);

  const playDing = useCallback(() => {
      try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); // E6

          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
          console.warn("Audio feedback failed", e);
      }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
          incRes, progRes, cycleRes, mortRes, loanRes, agreeRes, carRes, costRes, ccRes, waterRes, councilRes, energyRes, pensionRes, potRes, holidayRes, vehRes, assetRes
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
          recurring_costs: costRes.data || [],
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

    } catch (err) {
      console.error("Failed to fetch budget data", err);
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
      const label = format(startDate, 'MMM yyyy') + " Budget";
      const cycleDuration = differenceInDays(endDate, startDate);

      const now = new Date();
      let progressPct = 0;
      let daysRemaining = differenceInDays(endDate, now);
      if (isSameDay(now, startDate) || isAfter(now, startDate)) {
          progressPct = Math.min((differenceInDays(now, startDate) / cycleDuration) * 100, 100);
      }
      if (daysRemaining < 0) daysRemaining = 0;

            const expenses = [];

            const addExpense = (item, type, label, amount, day, icon, category, object = null, memberId = null) => {
                const key = `${type}_${item.id || 'fixed'}`;
                const progressItem = progress.find(p => p.item_key === key && p.cycle_start === cycleKey);
                
                if (item.frequency === 'one-off' && item.next_due !== cycleKey) return;
                
                // If marked as excluded (-1), don't show in budget
                if (progressItem?.is_paid === -1) return;

                const useNwd = item.nearest_working_day !== undefined ? !!item.nearest_working_day : true;
                const computedDate = getAdjustedDate(day, useNwd, startDate);

                expenses.push({
                    key, type, label, amount: progressItem?.actual_amount || parseFloat(amount) || 0,
                    day: parseInt(day) || 1, computedDate, icon, category,
                    isPaid: progressItem?.is_paid === 1, 
                    isDeletable: !['pot', 'pension', 'investment'].includes(type),
                    id: item.id, object, frequency: item.frequency || 'monthly', 
                    memberId: memberId !== null ? String(memberId) : null
                });
            };

            liabilities.mortgages.forEach(m => addExpense(m, 'mortgage', m.lender, m.monthly_payment, m.payment_day, <Home />, 'Liability', { name: 'House', emoji: '🏠' }));
            liabilities.loans.forEach(l => addExpense(l, 'loan', `${l.lender} Loan`, l.monthly_payment, l.payment_day, <TrendingDown />, 'Liability', { name: 'Finance', emoji: '💰' }));
            liabilities.agreements.forEach(a => addExpense(a, 'agreement', a.agreement_name, a.monthly_payment, a.payment_day, <Assignment />, 'Agreement', { name: a.provider, emoji: '📄' }));
            liabilities.vehicle_finance.forEach(v => {
                const veh = liabilities.vehicles.find(v_item => v_item.id === v.vehicle_id);
                addExpense(v, 'car_finance', `Finance: ${v.provider}`, v.monthly_payment, v.payment_day, <DirectionsCar />, 'Liability', { name: veh ? `${veh.make} ${veh.model}` : 'Vehicle', emoji: veh?.emoji || '🚗' });
            });
            liabilities.pensions.forEach(p => addExpense(p, 'pension', p.plan_name, p.monthly_contribution, p.payment_day, <SavingsIcon />, 'Pension', { name: 'Retirement', emoji: '👴' }));
            liabilities.recurring_costs.forEach(c => {
                let icon = <Payments />; 
                let object = { name: 'General', emoji: '💸' };
                let memberId = null;

                if (c.parent_type === 'member') {
                    const m = members.find(mem => String(mem.id) === String(c.parent_id));
                    object = { name: m ? (m.alias || m.name) : 'Resident', emoji: m?.emoji || '👤' }; 
                    icon = <Person />;
                    memberId = m ? m.id : c.parent_id;
                } else if (c.parent_type === 'pet') {
                    const p = members.find(mem => String(mem.id) === String(c.parent_id));
                    object = { name: p ? (p.alias || p.name) : 'Pet', emoji: p?.emoji || '🐾' }; 
                    icon = <Pets />;
                } else if (c.parent_type === 'vehicle') {
                    const v = liabilities.vehicles.find(v_item => String(v_item.id) === String(c.parent_id));
                    object = { name: v ? `${v.make}` : 'Vehicle', emoji: v?.emoji || '🚗' }; 
                    icon = <DirectionsCar />;
                } else if (c.parent_type === 'asset') {
                    const a = liabilities.assets.find(asset => String(asset.id) === String(c.parent_id));
                    object = { name: a ? a.name : 'Asset', emoji: a?.emoji || '📦' }; 
                    icon = <Inventory />;
                }

                if (c.category === 'insurance') icon = <Shield />;
                if (c.category === 'subscription') icon = <ShoppingBag />;
                if (c.category === 'service') icon = <HistoryEdu />;
                if (c.category === 'saving') icon = <SavingsIcon />;
                
                if (c.category === 'transfer') {
                    icon = <AccountBalanceWallet />;
                    if (c.frequency === 'one-off' && c.next_due !== cycleKey) return;
                }

                addExpense(c, 'cost', c.name, c.amount, c.payment_day, icon, c.category || 'Cost', object, memberId);
            });

            liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit', cc.card_name, 0, cc.payment_day, <CreditCard />, 'Credit Card', { name: cc.provider, emoji: cc.emoji || '💳' }));
            if (liabilities.water) addExpense(liabilities.water, 'water', 'Water Bill', liabilities.water.monthly_amount, liabilities.water.payment_day, <WaterDrop />, 'Utility', { name: 'House', emoji: '💧' });
            if (liabilities.council) addExpense(liabilities.council, 'council', 'Council Tax', liabilities.council.monthly_amount, liabilities.council.payment_day, <AccountBalance />, 'Utility', { name: 'House', emoji: '🏛️' });
            if (liabilities.energy) liabilities.energy.forEach(e => addExpense(e, 'energy', `${e.provider} (${e.type})`, e.monthly_amount, e.payment_day, <ElectricBolt />, 'Utility', { name: 'House', emoji: '⚡' }));

            savingsPots.forEach(pot => {
                addExpense(pot, 'pot', pot.name, 0, pot.deposit_day || 1, <SavingsIcon />, 'Saving', { name: pot.account_name, emoji: pot.account_emoji || '💰' });
            });

            return { startDate, endDate, label, cycleKey, progressPct, daysRemaining, cycleDuration, expenses: expenses.sort((a, b) => (a.computedDate || 0) - (b.computedDate || 0)) };
        }, [incomes, liabilities, progress, viewDate, members, getPriorWorkingDay, getAdjustedDate, savingsPots]);

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

        const handleSelectToggle = (key) => {
            setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
        };

        const handleRowClick = (e, index, key) => {
            // Standardizing selection logic to allow cross-table sum totals
            handleSelectToggle(key);
            setLastSelectedIndex(index);
        };

        const saveCycleData = async (pay, balance) => {
            if (!cycleData) return;
            try {
                await api.post(`/households/${householdId}/finance/budget-cycles`, {
                    cycle_start: cycleData.cycleKey, actual_pay: parseFloat(pay) || 0, current_balance: parseFloat(balance) || 0
                });
                const res = await api.get(`/households/${householdId}/finance/budget-cycles`);
                setCycles(res.data || []);
            } catch (err) { console.error("Failed to save cycle data", err); }
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
                
                if (itemKey.startsWith('pot_')) {
                    const potRes = await api.get(`/households/${householdId}/finance/savings/pots`);
                    setSavingsPots(potRes.data || []);
                }
            } catch (err) { console.error("Failed to update actual amount", err); }
        };

          const togglePaid = async (itemKey, amount = 0) => {
              setSavingProgress(true);
              try {
                  const isCurrentlyPaid = progress.some(p => p.item_key === itemKey && p.cycle_start === cycleData.cycleKey);
                  if (isCurrentlyPaid) {
                      await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
                  } else {
                      playDing();
                      await api.post(`/households/${householdId}/finance/budget-progress`, {
                          cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: 1, actual_amount: amount
                      });
                  }
                  const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
                setProgress(progRes.data || []);

                if (itemKey.startsWith('pot_')) {
                    const potRes = await api.get(`/households/${householdId}/finance/savings/pots`);
                    setSavingsPots(potRes.data || []);
                }
            } catch (err) { console.error("Failed to toggle paid status", err); } finally { setSavingProgress(false); }
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
            } catch { alert("Failed to add recurring expense"); }
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
            } catch { alert("Failed to add one-off expense"); }
        };

        const handleFamilyExpenseAdd = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            data.parent_type = 'member';
            data.parent_id = data.member_id;
            data.frequency = 'one-off';
            data.next_due = cycleData.cycleKey;
            data.nearest_working_day = 1;
            data.category = 'transfer';
            delete data.member_id;
            try {
                await api.post(`/households/${householdId}/costs`, data);
                showNotification("Family expense added.", "success");
                fetchData(); setFamilyExpenseOpen(false);
            } catch { alert("Failed to add family expense"); }
        };

        const deleteExpense = async (exp) => {
            const isOneOff = exp.frequency === 'one-off' && exp.type === 'cost';
            
            const msg = isOneOff 
                ? "Permanently delete this one-off expense?" 
                : "Remove this item from THIS budget cycle? (It will return next month)";

            if (!window.confirm(msg)) return;

            try {
                if (isOneOff) {
                    await api.delete(`/households/${householdId}/costs/${exp.id}`);
                } else {
                    await api.post(`/households/${householdId}/finance/budget-progress`, {
                        cycle_start: cycleData.cycleKey,
                        item_key: exp.key,
                        is_paid: -1,
                        actual_amount: 0
                    });
                }
                fetchData();
            } catch (err) { 
                console.error("Failed to delete expense", err); 
                showNotification("Failed to remove item", "danger");
            }
        };

        const cycleTotals = useMemo(() => {
            if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
            const activeExpenses = cycleData.expenses.filter(e => e.isPaid || e.amount > 0);
            const total = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
            const paid = activeExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
            return { total, paid, unpaid: total - paid };
        }, [cycleData]);

        const savingsTotal = useMemo(() => {
            return savingsPots.reduce((sum, pot) => sum + (parseFloat(pot.current_amount) || 0), 0);
        }, [savingsPots]);

        const selectedTotals = useMemo(() => {
            if (!selectedKeys.length || !cycleData) return null;
            const selected = cycleData.expenses.filter(e => selectedKeys.includes(e.key));
            const total = selected.reduce((sum, e) => sum + e.amount, 0);
            const paid = selected.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
            return { count: selected.length, total, paid, unpaid: total - paid };
        }, [selectedKeys, cycleData]);
        
        useEffect(() => {
            setStatusBarData(selectedTotals);
            return () => setStatusBarData(null);
        }, [selectedTotals, setStatusBarData]);

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
          const recurring = cycleData.expenses.filter(exp => 
              exp.frequency !== 'one-off' && 
              exp.type !== 'pot' && 
              exp.type !== 'pension' && 
              exp.type !== 'investment'
          );
          const groups = {};
          recurring.forEach(exp => {
              const freq = exp.frequency || 'monthly';
              if (!groups[freq]) groups[freq] = [];
              groups[freq].push(exp);
          });
          return groups;
        }, [cycleData]);

        const memberExpenses = useMemo(() => {
            if (!cycleData) return [];
            // Group all one-offs that have a memberId assigned
            const memExps = cycleData.expenses.filter(exp => 
                exp.memberId !== null && 
                exp.frequency === 'one-off'
            );
            const groups = {};
            memExps.forEach(exp => {
                const mId = String(exp.memberId);
                if (!groups[mId]) {
                    const m = members.find(mem => String(mem.id) === mId);
                    groups[mId] = {
                        id: mId,
                        name: m ? (m.alias || m.name) : 'Resident',
                        emoji: m?.emoji || '👤',
                        expenses: []
                    };
                }
                groups[mId].expenses.push(exp);
            });
            return Object.values(groups);
        }, [cycleData, members]);

        const pensionExpenses = useMemo(() => {
            if (!cycleData) return [];
            return cycleData.expenses.filter(exp => exp.type === 'pension');
        }, [cycleData]);

        const investmentExpenses = useMemo(() => {
            if (!cycleData) return [];
            return cycleData.expenses.filter(exp => exp.type === 'investment');
        }, [cycleData]);

        const frequencyOrder = ['weekly', 'fortnightly', 'four-weekly', 'monthly', 'quarterly', 'annual'];

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
                <Typography level="h3">Start a New Budget</Typography>
                <Typography level="body-md">This cycle has not been initialized yet. Choose how you want to start.</Typography>
                
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={() => createCycle(false)}>Create Blank</Button>
                    <Button variant="solid" onClick={() => createCycle(true)}>Copy Last Month</Button>
                </Stack>
            </Card>

            {cycleEvents.length > 0 && (
                <Card variant="soft" sx={{ width: '100%', maxWidth: 500, p: 2 }}>
                    <Typography level="title-md" startDecorator={<Event />} sx={{ mb: 2 }}>Events in this Budget</Typography>
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
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
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
                {selectedKeys.length > 0 && (
                    <Button variant="outlined" color="neutral" size="sm" onClick={() => setSelectedKeys([])}>Clear</Button>
                )}
                
                <Dropdown>
                    <MenuButton variant="solid" color="primary" size="sm" startDecorator={<Add />} endDecorator={<ArrowDropDown />}>
                        Add
                    </MenuButton>
                    <Menu placement="bottom-end" size="sm">
                        <MenuItem onClick={() => setQuickAddOpen(true)}>Add One-off</MenuItem>
                        <MenuItem onClick={() => setRecurringAddOpen(true)}>Add Recurring</MenuItem>
                        <MenuItem onClick={() => setFamilyExpenseOpen(true)}>Add Family Expense</MenuItem>
                    </Menu>
                </Dropdown>
            </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                <Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Days Left
                </Typography>
                <Typography level="body-xs" fontWeight="bold">
                    {cycleData.daysRemaining} days to go
                </Typography>
            </Box>
            <LinearProgress 
                determinate 
                value={cycleData.progressPct} 
                thickness={6}
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography level="title-lg" startDecorator={<AccountBalanceWallet />}>Budget Entry</Typography>
                            <IconButton size="sm" variant={isPayLocked ? "plain" : "soft"} color={isPayLocked ? "neutral" : "warning"} onClick={() => setIsPayLocked(!isPayLocked)}>
                                {isPayLocked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                            </IconButton>
                        </Box>
                        <Stack spacing={2}>
                            <FormControl>
                                <FormLabel>Pay (£)</FormLabel>
                                <Input 
                                    type="number" 
                                    value={actualPay} 
                                    disabled={isPayLocked}
                                    onChange={(e) => setActualPay(e.target.value)} 
                                    onBlur={(e) => saveCycleData(e.target.value, currentBalance)} 
                                    slotProps={{ input: { step: '0.01' } }} 
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Balance (£)</FormLabel>
                                <Input 
                                    type="number" 
                                    value={currentBalance} 
                                    onChange={(e) => setCurrentBalance(e.target.value)} 
                                    onBlur={(e) => saveCycleData(actualPay, e.target.value)} 
                                    autoFocus 
                                    slotProps={{ input: { step: '0.01' } }} 
                                />
                            </FormControl>
                        </Stack>
                    </Card>

                    <Card variant="outlined" sx={{ p: 3, boxShadow: 'sm' }}>
                        <Typography level="title-lg" startDecorator={<AccountBalanceWallet />} sx={{ mb: 2 }}>Budget Overview</Typography>
                        
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
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography level="body-sm" color="neutral">Total Savings</Typography>
                                <Typography level="title-md" color="success">{formatCurrency(savingsTotal)}</Typography>
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
                <Stack spacing={4}>
                    {/* Recurring Expenses */}
                    <Box>
                        <Typography level="title-md" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Payments fontSize="small" /> Recurring Expenses
                        </Typography>
                        
                        <Stack spacing={2}>
                            {frequencyOrder.filter(f => groupedRecurring[f]).map(freq => (
                                <Box key={freq}>
                                    <Typography level="body-xs" sx={{ mb: 1, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'neutral.500' }}>
                                        {freq}
                                    </Typography>
                                    <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                                        <Table hoverRow stickyHeader size="sm" sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '4px' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 40, textAlign: 'center' }}>
                                                        <Checkbox 
                                                            size="sm" 
                                                            onChange={(e) => {
                                                                const freqKeys = groupedRecurring[freq].map(e => e.key);
                                                                if (e.target.checked) setSelectedKeys(prev => Array.from(new Set([...prev, ...freqKeys])));
                                                                else setSelectedKeys(prev => prev.filter(k => !freqKeys.includes(k)));
                                                            }} 
                                                        />
                                                    </th>
                                                    <th>Expense</th>
                                                    <th style={{ width: 80, textAlign: 'center' }}>Date</th>
                                                    <th style={{ width: 100 }}>Amount</th>
                                                    <th style={{ width: 40, textAlign: 'center' }}>Paid</th>
                                                    <th style={{ width: 40 }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedRecurring[freq].filter(exp => !hidePaid || !exp.isPaid).map((exp, index) => (
                                                    <tr key={exp.key} onClick={(e) => handleRowClick(e, index, exp.key)} style={{ cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent', opacity: exp.isPaid ? 0.6 : 1 }}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <Checkbox 
                                                                size="sm" 
                                                                checked={selectedKeys.includes(exp.key)} 
                                                                onChange={() => handleSelectToggle(exp.key)} 
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </td>
                                                        <td>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Avatar size="sm" sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: getEmojiColor(exp.label, isDark), color: '#fff' }}>{exp.icon}</Avatar>
                                                                <Box>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                        <Typography level="body-xs" fontWeight="bold">{exp.label}</Typography>
                                                                        {exp.object && <Chip size="sm" variant="soft" sx={{ fontSize: '0.65rem', minHeight: '16px', px: 0.5 }} startDecorator={exp.object.emoji}>{exp.object.name}</Chip>}
                                                                    </Box>
                                                                    <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>{exp.category.toUpperCase()}</Typography>
                                                                </Box>
                                                            </Box>
                                                        </td>
                                                        <td><Box sx={{ textAlign: 'center' }}><Typography level="body-xs" fontWeight="bold">{exp.day}</Typography>{exp.computedDate && <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>{format(exp.computedDate, 'EEE do')}</Typography>}</Box></td>
                                                        <td><Input size="sm" type="number" variant="soft" sx={{ fontSize: '0.75rem', '--Input-minHeight': '24px' }} defaultValue={Number(exp.amount).toFixed(2)} onBlur={(e) => updateActualAmount(exp.key, e.target.value)} onClick={(e) => e.stopPropagation()} slotProps={{ input: { step: '0.01' } }} /></td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <Checkbox 
                                                                size="sm"
                                                                variant="plain" 
                                                                checked={exp.isPaid} 
                                                                onChange={() => togglePaid(exp.key, exp.amount)} 
                                                                disabled={savingProgress} 
                                                                uncheckedIcon={<RadioButtonUnchecked sx={{ fontSize: '1.2rem' }} />} 
                                                                checkedIcon={<CheckCircle color="success" sx={{ fontSize: '1.2rem' }} />} 
                                                                onClick={(e) => e.stopPropagation()}
                                                                sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent' } }} 
                                                            />
                                                        </td>
                                                        <td>{exp.isDeletable && <IconButton size="sm" color="danger" variant="plain" sx={{ '--IconButton-size': '24px' }} onClick={(e) => { e.stopPropagation(); deleteExpense(exp); }}><Delete sx={{ fontSize: '1rem' }} /></IconButton>}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Sheet>
                                </Box>
                            ))}
                        </Stack>
                    </Box>

                    {/* One-off Expenses */}
                    <Box>
                        <Typography level="title-md" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ShoppingBag fontSize="small" /> One-off Expenses
                        </Typography>
                        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                            <Table hoverRow stickyHeader size="sm" sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '4px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 40, textAlign: 'center' }}>
                                            <Checkbox 
                                                size="sm" 
                                                onChange={(e) => {
                                                    const filteredOneOffs = cycleData.expenses.filter(exp => exp.frequency === 'one-off' && exp.memberId == null);
                                                    const oneOffKeys = filteredOneOffs.map(e => e.key);
                                                    if (e.target.checked) setSelectedKeys(prev => Array.from(new Set([...prev, ...oneOffKeys])));
                                                    else setSelectedKeys(prev => prev.filter(k => !oneOffKeys.includes(k)));
                                                }} 
                                            />
                                        </th>
                                        <th>Expense</th>
                                        <th style={{ width: 80, textAlign: 'center' }}>Date</th>
                                        <th style={{ width: 100 }}>Amount</th>
                                        <th style={{ width: 40, textAlign: 'center' }}>Paid</th>
                                        <th style={{ width: 40 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cycleData.expenses.filter(exp => exp.frequency === 'one-off' && exp.memberId == null).filter(exp => !hidePaid || !exp.isPaid).map((exp, index) => (
                                        <tr key={exp.key} onClick={(e) => handleRowClick(e, index, exp.key)} style={{ cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent', opacity: exp.isPaid ? 0.6 : 1 }}>
                                            <td style={{ textAlign: 'center' }}>
                                                <Checkbox 
                                                    size="sm" 
                                                    checked={selectedKeys.includes(exp.key)} 
                                                    onChange={() => handleSelectToggle(exp.key)} 
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar size="sm" sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: getEmojiColor(exp.label, isDark), color: '#fff' }}>{exp.icon}</Avatar>
                                                    <Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <Typography level="body-xs" fontWeight="bold">{exp.label}</Typography>
                                                            {exp.object && <Chip size="sm" variant="soft" sx={{ fontSize: '0.65rem', minHeight: '16px', px: 0.5 }} startDecorator={exp.object.emoji}>{exp.object.name}</Chip>}
                                                        </Box>
                                                        <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>{exp.category.toUpperCase()}</Typography>
                                                    </Box>
                                                </Box>
                                            </td>
                                            <td><Box sx={{ textAlign: 'center' }}><Typography level="body-xs" fontWeight="bold">{exp.day}</Typography>{exp.computedDate && <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>{format(exp.computedDate, 'EEE do')}</Typography>}</Box></td>
                                            <td><Input size="sm" type="number" variant="soft" sx={{ fontSize: '0.75rem', '--Input-minHeight': '24px' }} defaultValue={Number(exp.amount).toFixed(2)} onBlur={(e) => updateActualAmount(exp.key, e.target.value)} onClick={(e) => e.stopPropagation()} slotProps={{ input: { step: '0.01' } }} /></td>
                                            <td style={{ textAlign: 'center' }}>
                                                <Checkbox 
                                                    size="sm"
                                                    variant="plain" 
                                                    checked={exp.isPaid} 
                                                    onChange={() => togglePaid(exp.key, exp.amount)} 
                                                    disabled={savingProgress} 
                                                    uncheckedIcon={<RadioButtonUnchecked sx={{ fontSize: '1.2rem' }} />} 
                                                    checkedIcon={<CheckCircle color="success" sx={{ fontSize: '1.2rem' }} />} 
                                                    onClick={(e) => e.stopPropagation()}
                                                    sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent' } }} 
                                                />
                                            </td>
                                            <td>{exp.isDeletable && <IconButton size="sm" color="danger" variant="plain" sx={{ '--IconButton-size': '24px' }} onClick={(e) => { e.stopPropagation(); deleteExpense(exp); }}><Delete sx={{ fontSize: '1rem' }} /></IconButton>}</td>
                                        </tr>
                                    ))}
                                    {cycleData.expenses.filter(exp => exp.frequency === 'one-off' && exp.memberId == null).length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '10px', color: 'neutral.500', fontStyle: 'italic', fontSize: '0.75rem' }}>No one-off expenses this month.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Sheet>
                    </Box>

                    {/* Member-Specific Expenses (One-off/Transfers) */}
                    {memberExpenses.map(group => {
                        const visibleExpenses = group.expenses.filter(exp => !hidePaid || !exp.isPaid);
                        if (visibleExpenses.length === 0 && hidePaid) return null;

                        return (
                            <Box key={group.id}>
                                <Typography level="title-md" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar size="sm" sx={{ bgcolor: getEmojiColor(group.emoji, isDark) }}>{group.emoji}</Avatar>
                                    {group.name}'s Expenses
                                </Typography>
                                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                                    <Table hoverRow size="sm" sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '4px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 40, textAlign: 'center' }}>
                                                    <Checkbox 
                                                        size="sm" 
                                                        onChange={(e) => {
                                                            const groupKeys = group.expenses.map(e => e.key);
                                                            if (e.target.checked) setSelectedKeys(prev => Array.from(new Set([...prev, ...groupKeys])));
                                                            else setSelectedKeys(prev => prev.filter(k => !groupKeys.includes(k)));
                                                        }} 
                                                    />
                                                </th>
                                                <th>Expense</th>
                                                <th style={{ width: 80, textAlign: 'center' }}>Date</th>
                                                <th style={{ width: 100 }}>Amount</th>
                                                <th style={{ width: 40, textAlign: 'center' }}>Paid</th>
                                                <th style={{ width: 40 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleExpenses.map((exp, index) => (
                                                <tr key={exp.key} onClick={(e) => handleRowClick(e, index, exp.key)} style={{ cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent', opacity: exp.isPaid ? 0.6 : 1 }}>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <Checkbox 
                                                            size="sm" 
                                                            checked={selectedKeys.includes(exp.key)} 
                                                            onChange={() => handleSelectToggle(exp.key)} 
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </td>
                                                    <td>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Avatar size="sm" sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: getEmojiColor(exp.label, isDark) }}>{exp.icon}</Avatar>
                                                            <Box>
                                                                <Typography level="body-xs" fontWeight="bold">{exp.label}</Typography>
                                                                <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>{exp.category.toUpperCase()}</Typography>
                                                            </Box>
                                                        </Box>
                                                    </td>
                                                    <td><Box sx={{ textAlign: 'center' }}><Typography level="body-xs" fontWeight="bold">{exp.day}</Typography>{exp.computedDate && <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>{format(exp.computedDate, 'EEE do')}</Typography>}</Box></td>
                                                    <td><Input size="sm" type="number" variant="soft" sx={{ fontSize: '0.75rem', '--Input-minHeight': '24px' }} defaultValue={Number(exp.amount).toFixed(2)} onBlur={(e) => updateActualAmount(exp.key, e.target.value)} onClick={(e) => e.stopPropagation()} slotProps={{ input: { step: '0.01' } }} /></td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <Checkbox 
                                                            size="sm" 
                                                            variant="plain" 
                                                            checked={exp.isPaid} 
                                                            onChange={() => togglePaid(exp.key, exp.amount)} 
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </td>
                                                    <td>{exp.isDeletable && <IconButton size="sm" color="danger" variant="plain" sx={{ '--IconButton-size': '24px' }} onClick={(e) => { e.stopPropagation(); deleteExpense(exp); }}><Delete sx={{ fontSize: '1rem' }} /></IconButton>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Sheet>
                            </Box>
                        );
                    })}

                    {/* Savings & Goals Contributions */}
                    {Object.keys(groupedPots).length > 0 && (
                        <Box>
                            <Typography level="title-md" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SavingsIcon fontSize="small" /> Savings & Goals
                            </Typography>
                            
                            <Stack spacing={3}>
                                {Object.entries(groupedPots).map(([accId, group]) => {
                                    const potKeys = group.pots.map(p => `pot_${p.id}`);
                                    const allPotsPaid = potKeys.length > 0 && potKeys.every(k => progress.some(p => p.item_key === k && p.cycle_start === cycleData.cycleKey));
                                    
                                    return (
                                        <Box key={accId}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar size="sm" sx={{ bgcolor: getEmojiColor(group.emoji, isDark) }}>{group.emoji}</Avatar>
                                                    <Box>
                                                        <Typography level="title-sm">{group.name}</Typography>
                                                        <Typography level="body-xs" color="neutral">{group.institution}</Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography level="title-sm" color="success">
                                                        {formatCurrency(group.balance)}
                                                    </Typography>
                                                    <Typography level="body-xs">Balance</Typography>
                                                </Box>
                                            </Box>
                                            <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                                                <Table hoverRow size="sm" sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '4px' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: 40, textAlign: 'center' }}>
                                                                <Checkbox 
                                                                    size="sm" 
                                                                    checked={allPotsPaid}
                                                                    indeterminate={!allPotsPaid && potKeys.some(k => progress.some(p => p.item_key === k && p.cycle_start === cycleData.cycleKey))}
                                                                    onChange={async (e) => {
                                                                        const checked = e.target.checked;
                                                                        for (const pot of group.pots) {
                                                                            const key = `pot_${pot.id}`;
                                                                            const isCurrentlyPaid = progress.some(p => p.item_key === key && p.cycle_start === cycleData.cycleKey);
                                                                            if (checked !== isCurrentlyPaid) {
                                                                                const progressItem = progress.find(p => p.item_key === key && p.cycle_start === cycleData.cycleKey);
                                                                                const currentAmount = progressItem?.actual_amount || 0;
                                                                                await togglePaid(key, currentAmount); 
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </th>
                                                            <th>Goal / Pot</th>
                                                            <th style={{ width: 100 }}>Amount</th>
                                                            <th style={{ width: 40, textAlign: 'center' }}>Paid</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.pots.map((pot, idx) => {
                                                            const expenseKey = `pot_${pot.id}`;
                                                            const progressItem = progress.find(p => p.item_key === expenseKey && p.cycle_start === cycleData.cycleKey);
                                                            const isPaid = !!progressItem;
                                                            const amount = progressItem?.actual_amount || 0;

                                                            return (
                                                                <tr 
                                                                    key={pot.id} 
                                                                    style={{ opacity: isPaid ? 0.6 : 1, cursor: 'pointer', backgroundColor: selectedKeys.includes(expenseKey) ? 'var(--joy-palette-primary-softBg)' : 'transparent' }}
                                                                    onClick={(e) => handleRowClick(e, idx, expenseKey)}
                                                                >
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <Checkbox 
                                                                            size="sm" 
                                                                            checked={selectedKeys.includes(expenseKey)} 
                                                                            onChange={() => handleSelectToggle(expenseKey)}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                            <Typography sx={{ fontSize: '1.2rem' }}>{pot.emoji}</Typography>
                                                                            <Box>
                                                                                <Typography level="body-xs" fontWeight="bold">{pot.name}</Typography>
                                                                                <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>CURRENT: {formatCurrency(pot.current_amount)}</Typography>
                                                                            </Box>
                                                                        </Box>
                                                                    </td>
                                                                    <td>
                                                                        <Input 
                                                                            size="sm" 
                                                                            type="number" 
                                                                            variant="soft" 
                                                                            sx={{ fontSize: '0.75rem', '--Input-minHeight': '24px' }} 
                                                                            defaultValue={amount.toFixed(2)} 
                                                                            onBlur={(e) => updateActualAmount(expenseKey, e.target.value)} 
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            slotProps={{ input: { step: '0.01' } }} 
                                                                        />
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <Checkbox 
                                                                            size="sm"
                                                                            variant="plain" 
                                                                            checked={isPaid} 
                                                                            onChange={() => togglePaid(expenseKey, amount)} 
                                                                            disabled={savingProgress} 
                                                                            uncheckedIcon={<RadioButtonUnchecked sx={{ fontSize: '1.2rem' }} />} 
                                                                            checkedIcon={<CheckCircle color="success" sx={{ fontSize: '1.2rem' }} />} 
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent' } }} 
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </Table>
                                            </Sheet>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}

                    {/* Pensions */}
                    {pensionExpenses.length > 0 && (
                        <Box>
                            <Typography level="title-md" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SavingsIcon fontSize="small" /> Pensions
                            </Typography>
                            <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                                <Table hoverRow size="sm" sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '4px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40, textAlign: 'center' }}><Checkbox size="sm" /></th>
                                            <th>Plan</th>
                                            <th style={{ width: 100 }}>Contribution</th>
                                            <th style={{ width: 40, textAlign: 'center' }}>Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pensionExpenses.map((exp, idx) => (
                                            <tr key={exp.key} style={{ opacity: exp.isPaid ? 0.6 : 1, cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent' }} onClick={(e) => handleRowClick(e, idx, exp.key)}>
                                                <td style={{ textAlign: 'center' }}><Checkbox size="sm" checked={selectedKeys.includes(exp.key)} onChange={() => handleSelectToggle(exp.key)} onClick={(e) => e.stopPropagation()} /></td>
                                                <td>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar size="sm" sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: getEmojiColor(exp.label, isDark) }}>{exp.icon}</Avatar>
                                                        <Typography level="body-xs" fontWeight="bold">{exp.label}</Typography>
                                                    </Box>
                                                </td>
                                                <td><Input size="sm" type="number" variant="soft" sx={{ fontSize: '0.75rem', '--Input-minHeight': '24px' }} defaultValue={Number(exp.amount).toFixed(2)} onBlur={(e) => updateActualAmount(exp.key, e.target.value)} onClick={(e) => e.stopPropagation()} slotProps={{ input: { step: '0.01' } }} /></td>
                                                <td style={{ textAlign: 'center' }}><Checkbox size="sm" variant="plain" checked={exp.isPaid} onChange={() => togglePaid(exp.key, exp.amount)} onClick={(e) => e.stopPropagation()} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Sheet>
                        </Box>
                    )}

                    {/* Investments */}
                    {investmentExpenses.length > 0 && (
                        <Box>
                            <Typography level="title-md" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingDown fontSize="small" /> Investments
                            </Typography>
                            <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                                <Table hoverRow size="sm" sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '4px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40, textAlign: 'center' }}><Checkbox size="sm" /></th>
                                            <th>Investment</th>
                                            <th style={{ width: 100 }}>Amount</th>
                                            <th style={{ width: 40, textAlign: 'center' }}>Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {investmentExpenses.map((exp, idx) => (
                                            <tr key={exp.key} style={{ opacity: exp.isPaid ? 0.6 : 1, cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent' }} onClick={(e) => handleRowClick(e, idx, exp.key)}>
                                                <td style={{ textAlign: 'center' }}><Checkbox size="sm" checked={selectedKeys.includes(exp.key)} onChange={() => handleSelectToggle(exp.key)} onClick={(e) => e.stopPropagation()} /></td>
                                                <td>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar size="sm" sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: getEmojiColor(exp.label, isDark) }}>{exp.icon}</Avatar>
                                                        <Typography level="body-xs" fontWeight="bold">{exp.label}</Typography>
                                                    </Box>
                                                </td>
                                                <td><Input size="sm" type="number" variant="soft" sx={{ fontSize: '0.75rem', '--Input-minHeight': '24px' }} defaultValue={Number(exp.amount).toFixed(2)} onBlur={(e) => updateActualAmount(exp.key, e.target.value)} onClick={(e) => e.stopPropagation()} slotProps={{ input: { step: '0.01' } }} /></td>
                                                <td style={{ textAlign: 'center' }}><Checkbox size="sm" variant="plain" checked={exp.isPaid} onChange={() => togglePaid(exp.key, exp.amount)} onClick={(e) => e.stopPropagation()} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Sheet>
                        </Box>
                    )}
                </Stack>
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
                                    {members.filter(m => m.type !== 'pet' && m.type !== 'viewer').map(m => <Option key={m.id} value={`member_${m.id}`}>{m.emoji} {m.name}</Option>)}
                                    <Divider>Pets</Divider>
                                    {members.filter(m => m.type === 'pet').map(p => <Option key={p.id} value={`pet_${p.id}`}>{p.emoji} {p.name}</Option>)}
                                    <Divider>Vehicles</Divider>
                                    {liabilities.vehicles.map(v_item => <Option key={v_item.id} value={`vehicle_${v_item.id}`}>{v_item.emoji || '🚗'} {v_item.make}</Option>)}
                                </Select>
                            </FormControl>
                            <AppSelect label="Category" name="category" defaultValue="other" options={[{ value: 'subscription', label: 'Subscription' }, { value: 'utility', label: 'Utility' }, { value: 'insurance', label: 'Insurance' }, { value: 'service', label: 'Service' }, { value: 'saving', label: 'Saving' }, { value: 'other', label: 'Other' }]} />
                            <Button type="submit">Add Recurring</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={familyExpenseOpen} onClose={() => setFamilyExpenseOpen(false)}>
            <ModalDialog sx={{ maxWidth: 400, width: '100%', overflow: 'hidden' }}>
                <DialogTitle>Add Family Expense / Transfer</DialogTitle>
                <DialogContent>
                    <Typography level="body-sm" sx={{ mb: 2 }}>Record one-off money transfers or specific costs for a family member.</Typography>
                    <form onSubmit={handleFamilyExpenseAdd}>
                        <Stack spacing={2}>
                            <FormControl required>
                                <FormLabel>Family Member</FormLabel>
                                <Select name="member_id" placeholder="Select member">
                                    {members.filter(m => m.type !== 'viewer').map(m => (
                                        <Option key={m.id} value={m.id}>{m.emoji} {m.name}</Option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl required><FormLabel>Description</FormLabel><Input name="name" placeholder="e.g. Pocket Money, School Trip, Transfer" autoFocus /></FormControl>
                            <FormControl required><FormLabel>How Much (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: '0.01' } }} /></FormControl>
                            <FormControl required><FormLabel>Due Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={new Date().getDate()} /></FormControl>
                            <Button type="submit" startDecorator={<Payments />}>Add Family Expense</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>
    </Box>
  );
}