import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, LinearProgress, Switch, Accordion, AccordionSummary, AccordionDetails,
  Dropdown, Menu, MenuButton, MenuItem, Select, Option, List, ListItem, ListItemContent, ListItemDecorator,
  Tooltip, Alert
} from '@mui/joy';
import {
  AccountBalanceWallet, CheckCircle, RadioButtonUnchecked, TrendingDown,
  Event, Payments, Savings as SavingsIcon, Home, CreditCard,
  Assignment, WaterDrop, ElectricBolt, AccountBalance as BankIcon, Add, Shield,
  ShoppingBag, ChevronLeft, ChevronRight, Lock, LockOpen, ArrowDropDown, RestartAlt, Receipt,
  DirectionsCar, Person, DeleteOutline, Restore, Sort, Search, ExpandMore, TrendingUp, Block, RemoveCircleOutline, RequestQuote,
  FilterAlt, GroupWork, CalendarToday, Warning, Edit, Undo, Redo
} from '@mui/icons-material';
import {
  format, addMonths, startOfMonth, setDate, differenceInDays,
  isSameDay, isAfter, startOfDay, isWithinInterval,
  parseISO, isValid, addWeeks, eachDayOfInterval
} from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';
import EmojiPicker from '../../components/EmojiPicker';

/**
 * UTILITY: formatCurrency
 * Formats a numeric value into a GBP currency string.
 */
const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * CONSTANT: METADATA_SCHEMAS
 * Defines additional dynamic fields for EVERY recurring cost category.
 */
const METADATA_SCHEMAS = {
    household_bill: [{ key: 'account_number', label: 'Account Number', type: 'text' }, { key: 'contract_end_date', label: 'Contract End Date', type: 'date' }],
    utility: [{ key: 'account_number', label: 'Account Number', type: 'text' }, { key: 'provider_website', label: 'Provider Website', type: 'url' }],
    council: [{ key: 'account_number', label: 'Account Number', type: 'text' }],
    water: [{ key: 'account_number', label: 'Reference', type: 'text' }],
    energy: [{ key: 'account_number', label: 'Account Number', type: 'text' }],
    waste: [{ key: 'collection_day', label: 'Collection Day', type: 'text' }],
    subscription: [{ key: 'login_email', label: 'Login Email', type: 'email' }],
    insurance: [{ key: 'policy_number', label: 'Policy Number', type: 'text' }, { key: 'renewal_date', label: 'Renewal Date', type: 'date' }],
    mortgage: [{ key: 'account_number', label: 'Mortgage Ref', type: 'text' }],
    vehicle_fuel: [{ key: 'fuel_type', label: 'Fuel Type', type: 'text' }],
    vehicle_tax: [{ key: 'registration', label: 'Registration', type: 'text' }],
    vehicle_mot: [{ key: 'mot_due_date', label: 'MOT Date', type: 'date' }],
    vehicle_service: [{ key: 'garage_name', label: 'Garage', type: 'text' }],
    vehicle_breakdown: [{ key: 'membership_number', label: 'Membership #', type: 'text' }],
    vehicle_finance: [{ key: 'agreement_number', label: 'Agreement #', type: 'text' }],
    fun_money: [{ key: 'usage_limit', label: 'Budget Limit', type: 'number' }],
    education: [{ key: 'student_id', label: 'Student ID', type: 'text' }],
    care: [{ key: 'provider_name', label: 'Provider', type: 'text' }],
    loan: [{ key: 'loan_reference', label: 'Reference', type: 'text' }],
    pocket_money: [{ key: 'criteria', label: 'Criteria', type: 'text' }],
    food: [{ key: 'store', label: 'Store', type: 'text' }],
    vet: [{ key: 'practice', label: 'Practice', type: 'text' }],
    other: [{ key: 'notes', label: 'Notes', type: 'text' }]
};

/**
 * COMPONENT: DrawdownChart
 * SVG visualization of projected bank balance.
 */
const DrawdownChart = ({ data, limit, cycleStartDate, cycleEndDate }) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d.balance), 2000);
    const minVal = Math.min(...data.map(d => d.balance), limit, -1000);
    const range = maxVal - minVal;
    const height = 60; const width = 300;
    const now = startOfDay(new Date());
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.balance - minVal) / range) * height;
        return `${x},${y}`;
    }).join(' ');
    const totalDays = differenceInDays(cycleEndDate, cycleStartDate) || 1;
    const todayX = (Math.max(0, Math.min(differenceInDays(now, cycleStartDate), totalDays)) / totalDays) * width;
    return (
        <Box sx={{ width: '100%', height: height + 20, mt: 1, position: 'relative' }}>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <line x1="0" y1={height - ((0 - minVal) / range) * height} x2={width} y2={height - ((0 - minVal) / range) * height} stroke="var(--joy-palette-neutral-400)" strokeDasharray="4,2" />
                <line x1={todayX} y1="0" x2={todayX} y2={height} stroke="var(--joy-palette-warning-500)" strokeWidth="1" strokeDasharray="2,1" />
                <polyline fill="none" stroke="var(--joy-palette-primary-500)" strokeWidth="2.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </Box>
    );
};

export default function BudgetView() {
  const { api, id: householdId, isDark, showNotification, members = [], setStatusBarData, confirmAction } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [bankHolidays, setBankHolidays] = useState([]);
  const [hidePaid, setHidePaid] = useState(false);
  const [incomes, setIncomes] = useState([]);
  const [progress, setProgress] = useState([]); 
  const [cycles, setCycles] = useState([]); 
  const [currentAccounts, setCurrentAccounts] = useState([]);
  const [liabilities, setLiabilities] = useState({ recurring_costs: [], credit_cards: [], pensions: [], vehicles: [], assets: [], savings: [], investments: [] });
  const [savingsPots, setSavingsPots] = useState([]);

  const [sectionsOpen, setSectionsOpen] = useState({ income: true, bills: true, finance: true, wealth: true, skipped: true });
  const [groupBy, setGroupBy] = useState('standard');
  const [filterEntity, setFilterEntity] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adhocIncomeOpen, setAdhocIncomeOpen] = useState(false);
  const [recurringAddOpen, setRecurringAddOpen] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');
  const [modalCategory, setModalCategory] = useState('household_bill');
  const [selectedEntity] = useState('household:null');
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('💰');
  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const isHistoryAction = useRef(false);

  const pushToUndo = useCallback((undoFn, redoFn) => {
      if (isHistoryAction.current) return;
      setUndoStack(prev => [{ undoFn, redoFn }, ...prev].slice(0, 30));
      setRedoStack([]);
  }, []);

  const handleUndo = async () => {
      if (undoStack.length === 0) return;
      const { undoFn, redoFn } = undoStack[0];
      setUndoStack(prev => prev.slice(1));
      setRedoStack(prev => [{ undoFn, redoFn }, ...prev]);
      isHistoryAction.current = true; await undoFn(); isHistoryAction.current = false;
  };

  const handleRedo = async () => {
      if (redoStack.length === 0) return;
      const { undoFn, redoFn } = redoStack[0];
      setRedoStack(prev => prev.slice(1));
      setUndoStack(prev => [{ undoFn, redoFn }, ...prev]);
      isHistoryAction.current = true; await redoFn(); isHistoryAction.current = false;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inc, prog, cyc, rec, cc, pen, pot, hol, veh, ast, sav, inv, acc] = await Promise.all([
          api.get(`/households/${householdId}/finance/income`), api.get(`/households/${householdId}/finance/budget-progress`), api.get(`/households/${householdId}/finance/budget-cycles`), api.get(`/households/${householdId}/finance/recurring-costs`), api.get(`/households/${householdId}/finance/credit-cards`), api.get(`/households/${householdId}/finance/pensions`), api.get(`/households/${householdId}/finance/savings/pots`), api.get(`/system/holidays`), api.get(`/households/${householdId}/vehicles`), api.get(`/households/${householdId}/assets`), api.get(`/households/${householdId}/finance/savings`), api.get(`/households/${householdId}/finance/investments`), api.get(`/households/${householdId}/finance/current-accounts`)
      ]);
      setIncomes(inc.data || []); setProgress(prog.data || []); setCycles(cyc.data || []); setCurrentAccounts(acc.data || []); setSavingsPots(pot.data || []); setBankHolidays(hol.data || []);
      setLiabilities({ recurring_costs: rec.data || [], credit_cards: cc.data || [], pensions: pen.data || [], vehicles: veh.data || [], assets: ast.data || [], savings: sav.data || [], investments: inv.data || [] });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getNextWorkingDay = useCallback((date) => {
      let d = new Date(date);
      while (d.getDay() === 0 || d.getDay() === 6 || bankHolidays.includes(format(d, 'yyyy-MM-dd'))) d.setDate(d.getDate() + 1);
      return d;
  }, [bankHolidays]);

  const getPriorWorkingDay = useCallback((date) => {
      let d = new Date(date);
      while (d.getDay() === 0 || d.getDay() === 6 || bankHolidays.includes(format(d, 'yyyy-MM-dd'))) d.setDate(d.getDate() - 1);
      return d;
  }, [bankHolidays]);

  const getAdjustedDate = useCallback((input, useNwd, cycleStartDate) => {
      if (!input) return null;
      let d = input instanceof Date ? input : setDate(startOfMonth(new Date(cycleStartDate)), parseInt(input));
      if (isAfter(cycleStartDate, d)) d = addMonths(d, 1);
      return useNwd ? getNextWorkingDay(d) : d;
  }, [getNextWorkingDay]);

  const getCategoryColor = (cat) => {
      const lower = (cat || '').toLowerCase();
      if (lower === 'income') return 'success';
      if (lower.includes('bill') || lower.includes('utility')) return 'warning';
      if (lower.includes('saving') || lower.includes('invest')) return 'success';
      return 'neutral';
  };

  const getCategoryOptions = useCallback((entityString) => {
      const [type] = (entityString || 'household:null').split(':');
      if (type === 'vehicle') return [{ value: 'vehicle_fuel', label: 'Fuel' }, { value: 'vehicle_tax', label: 'Tax' }, { value: 'vehicle_mot', label: 'MOT' }, { value: 'vehicle_service', label: 'Service' }, { value: 'other', label: 'Other' }];
      if (type === 'member') return [{ value: 'fun_money', label: 'Fun Money' }, { value: 'subscription', label: 'Subscription' }, { value: 'insurance', label: 'Insurance' }, { value: 'loan', label: 'Loan' }, { value: 'other', label: 'Other' }];
      return [{ value: 'household_bill', label: 'Fixed Bill' }, { value: 'utility', label: 'Utility' }, { value: 'subscription', label: 'Subscription' }, { value: 'insurance', label: 'Insurance' }, { value: 'mortgage', label: 'Mortgage' }, { value: 'other', label: 'Other' }];
  }, []);

  const entityGroupsOptions = useMemo(() => {
    return [
        { label: 'General', options: [{ value: 'household:null', label: 'Household (General)', emoji: '🏠' }] },
        { label: 'People', options: members.filter(m => m.type !== 'pet').map(m => ({ value: `member:${m.id}`, label: m.name, emoji: m.emoji || '👤' })) },
        { label: 'Vehicles', options: liabilities.vehicles.map(v => ({ value: `vehicle:${v.id}`, label: `${v.make} ${v.model}`, emoji: v.emoji || '🚗' })) }
    ].filter(g => g.options.length > 0);
  }, [members, liabilities]);

  const playFeedback = useCallback((type = 'success') => {
      try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext(); const osc = ctx.createOscillator(); const g = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(type === 'success' ? 880 : 660, ctx.currentTime);
          g.gain.setValueAtTime(0.1, ctx.currentTime); osc.connect(g); g.connect(ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + 0.2);
      } catch (e) { console.warn(e); }
  }, []);

  const cycleData = useMemo(() => {
      const primary = incomes.find(i => i.is_primary === 1) || incomes.find(i => i.payment_day > 0);
      if (!primary) return null;
      const payday = parseInt(primary.payment_day);
      let rawStart = viewDate.getDate() >= payday ? setDate(startOfMonth(viewDate), payday) : setDate(startOfMonth(addMonths(viewDate, -1)), payday);
      const startDate = getPriorWorkingDay(rawStart); const endDate = getPriorWorkingDay(addMonths(rawStart, 1));
      const cycleKey = format(startDate, 'yyyy-MM-dd');
      const now = startOfDay(new Date()); let progressPct = Math.min((differenceInDays(now, startDate) / (differenceInDays(endDate, startDate) || 1)) * 100, 100);
      if (now < startDate) progressPct = 0;
      
      const progressMap = new Map(); progress.forEach(p => { if (p.cycle_start === cycleKey) progressMap.set(p.item_key, p); });
      const groups = { 'bills': { id: 'bills', label: 'Bills', items: [], order: 0, emoji: '🏠' }, 'finance': { id: 'finance', label: 'Finance', items: [], order: 5, emoji: '💳' }, 'wealth': { id: 'wealth', label: 'Wealth', items: [], order: 999, emoji: '📈' } };
      const incomesCollected = []; const skipped = []; const lowerSearch = searchQuery.toLowerCase();

      const addExpense = (item, type, label, amount, dateObj, icon, category, targetGroupKey, object = null) => {
          if (!dateObj || !isValid(dateObj)) return;
          if (searchQuery && !label.toLowerCase().includes(lowerSearch) && !category.toLowerCase().includes(lowerSearch)) return;
          if (filterEntity !== 'all') {
              const [fType, fId] = filterEntity.split(':');
              if (fType !== (object?.type || 'household') || (fId !== 'null' && String(object?.id) !== fId)) return;
          }
          const key = `${type}_${item.id || 'fixed'}_${format(dateObj, 'ddMM')}`; 
          const progItem = progressMap.get(key);
          if (hidePaid && progItem?.is_paid === 1) return;
          const exp = { key, type, label: label || 'Item', amount: progItem?.actual_amount || parseFloat(amount) || 0, computedDate: dateObj, icon, category: category || 'other', isPaid: progItem?.is_paid === 1, id: item.id };
          if (progItem?.is_paid === -1) skipped.push(exp);
          else {
              if (targetGroupKey === 'income') incomesCollected.push(exp);
              else {
                  let groupKey = targetGroupKey;
                  if (groupBy === 'category') { groupKey = `cat_${category}`; if (!groups[groupKey]) groups[groupKey] = { id: groupKey, label: category.replace('_', ' '), items: [], order: 10, emoji: '📂' }; }
                  groups[groupKey].items.push(exp);
              }
          }
      };

      incomes.forEach(inc => addExpense(inc, 'income', inc.employer, inc.amount, getAdjustedDate(inc.payment_day, inc.nearest_working_day === 1, startDate), <Payments />, 'income', 'income'));
      liabilities.recurring_costs.filter(c => c.is_active).forEach(c => {
          let dates = []; if (c.frequency === 'monthly') dates.push(getAdjustedDate(c.day_of_month || 1, c.adjust_for_working_day, startDate));
          else if (c.start_date) {
              let cur = startOfDay(parseISO(c.start_date));
              while (cur < startDate) cur = c.frequency === 'weekly' ? addWeeks(cur, 1) : addMonths(cur, c.frequency === 'quarterly' ? 3 : 12);
              while (isWithinInterval(cur, { start: startDate, end: endDate })) { dates.push(c.adjust_for_working_day ? getNextWorkingDay(cur) : new Date(cur)); cur = c.frequency === 'weekly' ? addWeeks(cur, 1) : addMonths(cur, c.frequency === 'quarterly' ? 3 : 12); }
          }
          dates.forEach(d => addExpense(c, 'recurring', c.name, c.amount, d, <Receipt />, c.category_id, 'bills'));
      });
      liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit_card', cc.card_name, 0, getAdjustedDate(cc.payment_day || 1, true, startDate), <CreditCard />, 'credit_card', 'finance'));
      liabilities.pensions.forEach(p => addExpense(p, 'pension', p.provider, p.monthly_contribution, getAdjustedDate(p.payment_day || 1, true, startDate), <Assignment />, 'pension', 'wealth'));
      liabilities.investments.forEach(i => addExpense(i, 'investment', i.name, i.monthly_contribution, getAdjustedDate(i.payment_day || 1, true, startDate), <TrendingUp />, 'investment', 'wealth'));
      savingsPots.forEach(pot => addExpense(pot, 'pot', pot.name, 0, getAdjustedDate(pot.deposit_day || 1, false, startDate), <SavingsIcon />, 'savings', 'wealth'));

      const list = Object.values(groups).filter(g => g.items.length > 0).sort((a, b) => a.order - b.order);
      list.forEach(g => { g.total = g.items.reduce((s, i) => s + i.amount, 0); g.paid = g.items.filter(i => i.isPaid).reduce((s, i) => s + i.amount, 0); g.unpaid = g.total - g.paid; });
      return { startDate, endDate, cycleKey, progressPct, groupList: list, skipped, incomeGroup: { items: incomesCollected, total: incomesCollected.reduce((s, i) => s + i.amount, 0), unpaid: incomesCollected.reduce((s, i) => s + (i.isPaid ? 0 : i.amount), 0) } };
  }, [incomes, liabilities, progress, viewDate, getPriorWorkingDay, getAdjustedDate, hidePaid, searchQuery, groupBy, filterEntity, getNextWorkingDay, savingsPots]);

  const currentCycleRecord = useMemo(() => cycles.find(c => c.cycle_start === cycleData?.cycleKey), [cycles, cycleData]);
  useEffect(() => { if (cycleData && !loading) { if (currentCycleRecord) { setActualPay(currentCycleRecord.actual_pay); setCurrentBalance(currentCycleRecord.current_balance); setSelectedAccountId(currentCycleRecord.bank_account_id || null); setSetupModalOpen(false); } else setSetupModalOpen(true); } }, [currentCycleRecord, cycleData, loading]);

  const handleSetupBudget = async (mode) => {
      let pay = cycleData?.incomeGroup.total || 0;
      if (mode === 'copy' && cycles.length > 0) { const last = [...cycles].sort((a,b) => b.cycle_start.localeCompare(a.cycle_start))[0]; if (last) pay = last.actual_pay; }
      await saveCycleData(pay, pay); setSetupModalOpen(false);
  };

  const saveCycleData = async (pay, balance, accountId = selectedAccountId) => {
      if (!cycleData) return;
      const oldP = actualPay, oldB = currentBalance, oldA = selectedAccountId;
      const perform = async (p, b, a) => {
        await api.post(`/households/${householdId}/finance/budget-cycles`, { cycle_start: cycleData.cycleKey, actual_pay: parseFloat(p), current_balance: parseFloat(b), bank_account_id: a });
        const res = await api.get(`/households/${householdId}/finance/budget-cycles`); setCycles(res.data || []);
      };
      pushToUndo(() => perform(oldP, oldB, oldA), () => perform(pay, balance, accountId));
      await perform(pay, balance, accountId);
  };

  const updateActualAmount = async (itemKey, amount) => {
      const prog = progress.find(p => p.item_key === itemKey && p.cycle_start === cycleData?.cycleKey);
      const oldA = prog?.actual_amount || 0;
      const perform = async (a) => {
          await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: prog?.is_paid || 0, actual_amount: parseFloat(a) });
          const res = await api.get(`/households/${householdId}/finance/budget-progress`); setProgress(res.data || []);
      };
      if (parseFloat(amount) !== parseFloat(oldA)) { pushToUndo(() => perform(oldA), () => perform(amount)); await perform(amount); }
  };

  const togglePaid = async (itemKey, amount = 0) => {
      const idx = progress.findIndex(p => p.item_key === itemKey && p.cycle_start === cycleData.cycleKey);
      const isPaid = idx !== -1 && progress[idx].is_paid === 1;
      const perform = async (p) => {
          if (!p) await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
          else await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: 1, actual_amount: amount });
          const res = await api.get(`/households/${householdId}/finance/budget-progress`); setProgress(res.data || []);
          playFeedback(p ? 'success' : 'undo');
      };
      pushToUndo(() => perform(isPaid), () => perform(!isPaid));
      await perform(!isPaid);
  };

  const handleDisableItem = (itemKey) => {
      confirmAction("Skip?", "Remove from this month?", async () => {
          const perform = async (d) => {
              if (d) await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: -1, actual_amount: 0 });
              else await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
              fetchData();
          };
          pushToUndo(() => perform(false), () => perform(true)); await perform(true);
      });
  };

  const handleRestoreItem = async (itemKey) => {
      const perform = async (r) => {
          if (r) await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
          else await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: -1, actual_amount: 0 });
          fetchData();
      };
      pushToUndo(() => perform(false), () => perform(true)); await perform(true);
  };

  const handleAddCost = async (e, type = 'one_off') => {
      e.preventDefault(); const formData = new FormData(e.currentTarget); const data = Object.fromEntries(formData.entries());
      const [eType, eId] = (selectedEntity || 'household:null').split(':');
      const metadata = {}; const fields = METADATA_SCHEMAS[modalCategory] || [];
      fields.forEach(f => { if (data[`meta_${f.key}`]) metadata[f.key] = data[`meta_${f.key}`]; });
      const payload = { name: data.name, amount: parseFloat(data.amount), frequency: type === 'one_off' ? 'one_off' : recurringType, start_date: data.start_date, category_id: modalCategory, object_type: eType, object_id: eId === 'null' ? null : eId, adjust_for_working_day: data.nearest_working_day === "1" ? 1 : 0, emoji: selectedEmoji, metadata: JSON.stringify(metadata) };
      try { await api.post(`/households/${householdId}/finance/recurring-costs`, payload); showNotification("Success.", "success"); fetchData(); setQuickAddOpen(false); setAdhocIncomeOpen(false); setRecurringAddOpen(false); }
      catch { showNotification("Failed.", "danger"); }
  };

  const cycleTotals = useMemo(() => { if (!cycleData) return { total: 0, paid: 0, unpaid: 0 }; const items = cycleData.groupList.flatMap(g => g.items); const total = items.reduce((s, i) => s + i.amount, 0); const paid = items.filter(i => i.isPaid).reduce((s, i) => s + i.amount, 0); return { total, paid, unpaid: total - paid }; }, [cycleData]);
  const drawdownData = useMemo(() => { if (!cycleData || currentBalance === undefined) return []; const days = eachDayOfInterval({ start: cycleData.startDate, end: cycleData.endDate }); let bal = parseFloat(currentBalance) || 0; const exp = cycleData.groupList.flatMap(g => g.items); const inc = cycleData.incomeGroup.items; const today = startOfDay(new Date()); return days.map(d => { if (isAfter(d, today) || isSameDay(d, today)) { bal = bal - exp.filter(e => isSameDay(e.computedDate, d) && !e.isPaid).reduce((s, i) => s + i.amount, 0) + inc.filter(e => isSameDay(e.computedDate, d) && !e.isPaid).reduce((s, i) => s + i.amount, 0); } return { date: d, balance: bal }; }); }, [cycleData, currentBalance]);
  const lowest = useMemo(() => { const fut = drawdownData.filter(d => isAfter(d.date, startOfDay(new Date())) || isSameDay(d.date, startOfDay(new Date()))); return fut.length ? Math.min(...fut.map(d => d.balance)) : 0; }, [drawdownData]);
  const overdraftLimit = currentAccounts.find(a => a.id === selectedAccountId)?.overdraft_limit || 0;
  const selectedTotals = useMemo(() => { if (!selectedKeys.length || !cycleData) return null; const items = [...cycleData.groupList.flatMap(g => g.items), ...cycleData.incomeGroup.items].filter(e => selectedKeys.includes(e.key)); return { count: items.length, total: items.reduce((s, e) => s + e.amount, 0), paid: items.filter(e => e.isPaid).reduce((s, e) => s + e.amount, 0), unpaid: items.reduce((s, e) => s + (e.isPaid ? 0 : e.amount), 0) }; }, [selectedKeys, cycleData]);
  useEffect(() => { setStatusBarData(selectedTotals); return () => setStatusBarData(null); }, [selectedTotals, setStatusBarData]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!cycleData) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography level="h4">Setup Required</Typography><Button onClick={fetchData}>Refresh</Button></Box>;

  return (
    <Box sx={{ pb: 12 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton>
                <Typography level="h2">{format(cycleData.startDate, 'MMMM yyyy')}</Typography>
                <IconButton onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton>
            </Box>
            <Stack direction="row" spacing={1}>
                <Tooltip title="Undo"><IconButton disabled={undoStack.length === 0} onClick={handleUndo} variant="outlined"><Undo /></IconButton></Tooltip>
                <Tooltip title="Redo"><IconButton disabled={redoStack.length === 0} onClick={handleRedo} variant="outlined"><Redo /></IconButton></Tooltip>
                <Input placeholder="Search..." size="sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} startDecorator={<Search />} />
                <Select size="sm" value={filterEntity} onChange={(e, v) => setFilterEntity(v)} startDecorator={<FilterAlt />}>
                    <Option value="all">All Objects</Option>
                    {entityGroupsOptions.map(g => [<Divider />, <Typography level="body-xs" sx={{ px: 2 }}>{g.label}</Typography>, ...g.options.map(o => <Option key={o.value} value={o.value}>{o.emoji} {o.label}</Option>)])}
                </Select>
                <Select size="sm" value={groupBy} onChange={(e, v) => setGroupBy(v)} startDecorator={<GroupWork />}><Option value="standard">Standard</Option><Option value="category">Category</Option><Option value="date">Date</Option></Select>
                <FormControl orientation="horizontal" size="sm" sx={{ mx: 1 }}><FormLabel>Hide Paid</FormLabel><Switch checked={hidePaid} onChange={(e) => setHidePaid(e.target.checked)} size="sm" /></FormControl>
                <Button size="sm" startDecorator={<Add />} onClick={() => setRecurringAddOpen(true)}>Add</Button>
            </Stack>
        </Box>

        <LinearProgress determinate value={cycleData.progressPct} thickness={10} sx={{ borderRadius: 'sm', mb: 4, background: `linear-gradient(90deg, var(--joy-palette-primary-softBg) 0%, var(--joy-palette-primary-softBg) 100%)` }} />

        <Grid container spacing={3}>
            <Grid xs={12} md={3}>
                <Stack spacing={2}>
                    <Card variant="outlined"><Typography level="title-md" startDecorator={<Payments />}>Incomes</Typography><Stack spacing={1}>{cycleData.incomeGroup.items.map(inc => <IncomeSourceCard key={inc.key} inc={inc} onUpdateAmount={updateActualAmount} onTogglePaid={togglePaid} />)}</Stack></Card>
                    <Card variant="outlined" sx={{ bgcolor: 'primary.softBg' }}><Typography level="title-md" startDecorator={<BankIcon />}>Bank Status</Typography>
                        <Select value={selectedAccountId} size="sm" sx={{ my: 1 }} onChange={(e, v) => { setSelectedAccountId(v); const a = currentAccounts.find(x => x.id === v); if (a) { setCurrentBalance(a.current_balance); saveCycleData(actualPay, a.current_balance, v); } }}>
                            <Option value={null}>Manual Entry</Option>{currentAccounts.map(a => <Option key={a.id} value={a.id}>{a.emoji} {a.account_name}</Option>)}
                        </Select>
                        <Input type="number" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} onBlur={(e) => saveCycleData(actualPay, e.target.value)} startDecorator="£" slotProps={{ input: { step: '0.01' } }} />
                    </Card>
                    <Card variant="outlined"><Typography level="title-md" startDecorator={<TrendingDown />}>Drawdown</Typography><Typography level="h4" color={lowest < 0 ? 'danger' : 'success'}>{formatCurrency(lowest)}</Typography><DrawdownChart data={drawdownData} limit={-overdraftLimit} cycleStartDate={cycleData.startDate} cycleEndDate={cycleData.endDate} />{lowest < 0 && <Alert color="warning" size="sm" sx={{ mt: 1 }}>Projected Deficit</Alert>}</Card>
                    <Card variant="outlined"><Typography level="title-md" startDecorator={<AccountBalanceWallet />}>Budget Health</Typography><Stack spacing={1.5} mt={1}><Box><Typography level="body-xs">Bills Paid</Typography><LinearProgress determinate value={(cycleTotals.paid / (cycleTotals.total || 1)) * 100} color="success" /></Box><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography level="body-xs">Unpaid</Typography><Typography level="body-xs" color="danger">{formatCurrency(cycleTotals.unpaid)}</Typography></Box></Stack></Card>
                </Stack>
            </Grid>
            <Grid xs={12} md={9}>{cycleData.groupList.map(g => (
                <Accordion expanded={sectionsOpen[g.id] ?? true} onChange={() => setSectionsOpen(s => ({ ...s, [g.id]: !s[g.id] }))} sx={{ mb: 2 }} key={g.id}>
                    <AccordionSummary expandIcon={<ExpandMore />}><Typography level="title-lg">{g.emoji} {g.label} ({formatCurrency(g.unpaid)} unpaid)</Typography></AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}><Sheet variant="plain" sx={{ overflow: 'auto' }}><Table hoverRow>
                        <thead><tr><th style={{ width: 40 }}><Checkbox size="sm" onChange={(e) => { const keys = g.items.map(x => x.key); if (e.target.checked) setSelectedKeys(p => Array.from(new Set([...p, ...keys]))); else setSelectedKeys(p => p.filter(k => !keys.includes(k))); }} /></th><th>Item</th><th>Category</th><th>Due Date</th><th style={{ textAlign: 'right' }}>Amount</th><th>Paid</th><th>Skip</th></tr></thead>
                        <tbody>{g.items.map(e => (
                            <tr key={e.key} style={{ opacity: e.isPaid ? 0.6 : 1, backgroundColor: selectedKeys.includes(e.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent' }} onClick={() => setSelectedKeys(p => p.includes(e.key) ? p.filter(k => k !== e.key) : [...p, e.key])}>
                                <td onClick={(x) => x.stopPropagation()}><Checkbox size="sm" checked={selectedKeys.includes(e.key)} onChange={() => setSelectedKeys(p => p.includes(e.key) ? p.filter(k => k !== e.key) : [...p, e.key])} /></td>
                                <td><Typography level="body-sm" fontWeight="bold">{e.label}</Typography></td>
                                <td><Chip size="sm" variant="soft" color={getCategoryColor(e.category)}>{e.category.replace('_', ' ')}</Chip></td>
                                <td><Typography level="body-xs">{format(e.computedDate, 'do MMM')}</Typography></td>
                                <td style={{ textAlign: 'right' }} onClick={(x) => x.stopPropagation()}><Input size="sm" sx={{ width: 85 }} type="number" defaultValue={e.amount.toFixed(2)} onBlur={(x) => updateActualAmount(e.key, x.target.value)} /></td>
                                <td onClick={(x) => x.stopPropagation()}><Checkbox size="sm" checked={e.isPaid} onChange={() => togglePaid(e.key, e.amount)} /></td>
                                <td onClick={(x) => x.stopPropagation()}><IconButton size="sm" color="danger" onClick={() => handleDisableItem(e.key)}><Block /></IconButton></td>
                            </tr>
                        ))}</tbody>
                    </Table></Sheet></AccordionDetails>
                </Accordion>
            ))}
            {cycleData.skipped.length > 0 && <Accordion expanded={sectionsOpen.skipped} onChange={() => setSectionsOpen(s => ({ ...s, skipped: !s.skipped }))} variant="outlined" sx={{ opacity: 0.7 }}><AccordionSummary expandIcon={<ExpandMore />}><Typography level="title-md">Skipped Items ({cycleData.skipped.length})</Typography></AccordionSummary><AccordionDetails sx={{ p: 0 }}><Table size="sm"><tbody>{cycleData.skipped.map(e => <tr key={e.key}><td>{e.label}</td><td>{formatCurrency(e.amount)}</td><td><Button size="sm" onClick={() => handleRestoreItem(e.key)}>Restore</Button></td></tr>)}</tbody></Table></AccordionDetails></Accordion>}
            </Grid>
        </Grid>

        <Modal open={recurringAddOpen} onClose={() => setRecurringAddOpen(false)}>
            <ModalDialog sx={{ maxWidth: 550, width: '100%' }}>
                <DialogTitle>Add Recurring Cost</DialogTitle>
                <form onSubmit={(e) => handleAddCost(e, 'recurring')}>
                    <Stack spacing={2}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}><Avatar size="lg" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark), cursor: 'pointer' }} onClick={() => setPickerOpen(true)}>{selectedEmoji}</Avatar><FormControl fullWidth required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl></Box>
                        <Grid container spacing={2}>
                            <Grid xs={6}><FormControl required><FormLabel>Amount</FormLabel><Input name="amount" type="number" step="0.01" /></FormControl></Grid>
                            <Grid xs={6}><FormControl required><FormLabel>Category</FormLabel><Select value={modalCategory} onChange={(e, v) => setModalCategory(v)} name="category">{getCategoryOptions(selectedEntity).map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}</Select></FormControl></Grid>
                        </Grid>
                        <Sheet variant="soft" sx={{ p: 2, borderRadius: 'md' }}><Typography level="title-sm" mb={1}>{modalCategory.toUpperCase()} DETAILS</Typography><Grid container spacing={2}>{(METADATA_SCHEMAS[modalCategory] || METADATA_SCHEMAS['other']).map(f => <Grid xs={6} key={f.key}><FormControl><FormLabel>{f.label}</FormLabel>{f.type === 'select' ? <Select name={`meta_${f.key}`}>{f.options.map(o => <Option key={o} value={o}>{o}</Option>)}</Select> : <Input name={`meta_${f.key}`} type={f.type} />}</FormControl></Grid>)}</Grid></Sheet>
                        <FormControl required><FormLabel>Frequency</FormLabel><Select value={recurringType} onChange={(e, v) => setRecurringType(v)}>{['weekly', 'monthly', 'quarterly', 'yearly'].map(f => <Option key={f} value={f}>{f}</Option>)}</Select></FormControl>
                        <FormControl required><FormLabel>Start Date</FormLabel><Input name="start_date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} /></FormControl>
                        <Checkbox label="Adjust for Working Day" name="nearest_working_day" defaultChecked value="1" /><Button type="submit">Add Recurring Expense</Button>
                    </Stack>
                </form>
            </ModalDialog>
        </Modal>

        <Modal open={adhocIncomeOpen} onClose={() => setAdhocIncomeOpen(false)}><ModalDialog><DialogTitle>Adhoc Income</DialogTitle><form onSubmit={(e) => handleAddCost(e, 'one_off')}><Stack spacing={2}><FormControl required><FormLabel>Description</FormLabel><Input name="name" /></FormControl><FormControl required><FormLabel>Amount</FormLabel><Input name="amount" type="number" step="0.01" /></FormControl><Input name="category" type="hidden" value="income" /><Input name="start_date" type="hidden" value={format(new Date(), 'yyyy-MM-dd')} /><Button type="submit">Add Income</Button></Stack></form></ModalDialog></Modal>
        <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)}><ModalDialog><DialogTitle>One-off Expense</DialogTitle><form onSubmit={(e) => handleAddCost(e, 'one_off')}><Stack spacing={2}><FormControl required><FormLabel>Name</FormLabel><Input name="name" /></FormControl><FormControl required><FormLabel>Amount</FormLabel><Input name="amount" type="number" step="0.01" /></FormControl><FormControl required><FormLabel>Date</FormLabel><Input name="start_date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} /><Button type="submit">Add Expense</Button></FormControl></Stack></form></ModalDialog></Modal>
        <EmojiPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onEmojiSelect={(e) => { setSelectedEmoji(e); setPickerOpen(false); }} isDark={isDark} />
        <Modal open={setupModalOpen}><ModalDialog sx={{ maxWidth: 400 }}><DialogTitle>Setup Budget Cycle</DialogTitle><DialogContent>Initialize this month's budget.</DialogContent><Stack spacing={2} mt={2}><Button size="lg" onClick={() => handleSetupBudget('fresh')}>Start Fresh</Button><Button size="lg" variant="soft" onClick={() => handleSetupBudget('copy')}>Copy Previous</Button></Stack></ModalDialog></Modal>
    </Box>
  );
}