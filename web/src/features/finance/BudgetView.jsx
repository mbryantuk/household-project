import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, LinearProgress, Switch, Accordion, AccordionSummary, AccordionDetails,
  Dropdown, Menu, MenuButton, MenuItem, Select, Option, List, ListItem, ListItemContent, ListItemDecorator,
  Tooltip
} from '@mui/joy';
import {
  AccountBalanceWallet, CheckCircle, RadioButtonUnchecked, TrendingDown,
  Event, Payments, Savings as SavingsIcon, Home, CreditCard,
  Assignment, WaterDrop, ElectricBolt, AccountBalance as BankIcon, Add, Shield,
  ShoppingBag, ChevronLeft, ChevronRight, Lock, LockOpen, ArrowDropDown, RestartAlt, Receipt,
  DirectionsCar, Person, DeleteOutline, Restore, Sort, Search, ExpandMore, TrendingUp, Block, RemoveCircleOutline, RequestQuote,
  FilterAlt, GroupWork, CalendarToday, Warning
} from '@mui/icons-material';
import {
  format, addMonths, startOfMonth, setDate, differenceInDays,
  isSameDay, isAfter, startOfDay, isWithinInterval,
  parseISO, isValid, addYears, addWeeks, eachDayOfInterval
} from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const DrawdownChart = ({ data, limit }) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d.balance), 5000);
    const minVal = Math.min(...data.map(d => d.balance), limit, 0);
    const range = maxVal - minVal;
    const height = 40;
    const width = 200;
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.balance - minVal) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const limitY = height - ((limit - minVal) / range) * height;
    const zeroY = height - ((0 - minVal) / range) * height;

    return (
        <Box sx={{ width: '100%', height: height + 10, mt: 1 }}>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="var(--joy-palette-neutral-300)" strokeDasharray="2,2" />
                {limit < 0 && <line x1="0" y1={limitY} x2={width} y2={limitY} stroke="var(--joy-palette-danger-300)" strokeDasharray="4,2" />}
                <polyline fill="none" stroke="var(--joy-palette-primary-500)" strokeWidth="2" points={points} />
            </svg>
        </Box>
    );
};

const getCategoryColor = (cat) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('saving') || lower.includes('invest') || lower.includes('pension')) return 'success';
    if (lower.includes('bill') || lower.includes('utility') || lower.includes('council') || lower.includes('water') || lower.includes('energy')) return 'warning';
    if (lower.includes('food') || lower.includes('grocer') || lower.includes('dining')) return 'success';
    if (lower.includes('insur') || lower.includes('health') || lower.includes('life')) return 'danger';
    if (lower.includes('loan') || lower.includes('mortgage') || lower.includes('finance')) return 'danger';
    if (lower.includes('sub') || lower.includes('netflix') || lower.includes('spotify') || lower.includes('amazon')) return 'info';
    if (lower.includes('car') || lower.includes('transport') || lower.includes('fuel')) return 'primary';
    return 'neutral';
};

const getRelativeDateLabel = (date) => {
    const now = startOfDay(new Date());
    const d = startOfDay(date);
    const diff = differenceInDays(d, now);
    
    if (diff === 0) return { label: 'Today', color: 'warning' };
    if (diff === 1) return { label: 'Tomorrow', color: 'primary' };
    if (diff > 1 && diff < 7) return { label: `In ${diff} days`, color: 'neutral' };
    if (diff >= 7) return { label: `In ${Math.floor(diff/7)}w ${diff%7}d`, color: 'neutral' };
    if (diff === -1) return { label: 'Yesterday', color: 'danger' };
    return { label: `${Math.abs(diff)} days ago`, color: 'danger' };
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
      recurring_costs: [], credit_cards: [], pensions: [], vehicles: [], assets: [],
      savings: [], investments: []
  });
  const [savingsPots, setSavingsPots] = useState([]);

  // Sections State
  const [sectionsOpen, setSectionsOpen] = useState({ bills: true, finance: true, wealth: true, skipped: true });
  const [groupBy, setGroupBy] = useState('standard'); // standard, category, object, date
  const [filterEntity, setFilterEntity] = useState('all');

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'computedDate', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [recurringAddOpen, setRecurringAddOpen] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');
  const [selectedEntity, setSelectedEntity] = useState('household:null');
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [isPayLocked, setIsPayLocked] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
          incRes, progRes, cycleRes, recurringRes, ccRes, pensionRes, potRes, holidayRes, vehRes, assetRes, saveRes, invRes
      ] = await Promise.all([
          api.get(`/households/${householdId}/finance/income`),
          api.get(`/households/${householdId}/finance/budget-progress`),
          api.get(`/households/${householdId}/finance/budget-cycles`),
          api.get(`/households/${householdId}/finance/recurring-costs`),
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
          recurring_costs: recurringRes.data || [],
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

  const entityGroupsOptions = useMemo(() => {
    return [
        { label: 'General', options: [{ value: 'household:null', label: 'Household (General)', emoji: '🏠' }] },
        { label: 'People', options: members.filter(m => m.type !== 'pet').map(m => ({ value: `member:${m.id}`, label: m.name, emoji: m.emoji || '👤' })) },
        { label: 'Pets', options: members.filter(m => m.type === 'pet').map(p => ({ value: `pet:${p.id}`, label: p.name, emoji: p.emoji || '🐾' })) },
        { label: 'Vehicles', options: liabilities.vehicles.map(v => ({ value: `vehicle:${v.id}`, label: `${v.make} ${v.model}`, emoji: v.emoji || '🚗' })) },
        { label: 'Assets', options: liabilities.assets.map(a => ({ value: `asset:${a.id}`, label: a.name, emoji: a.emoji || '📦' })) }
    ].filter(g => g.options.length > 0);
  }, [members, liabilities]);

  const getCategoryOptions = useCallback((entityString) => {
      const [type, id] = (entityString || 'household:null').split(':');
      
      const HOUSEHOLD_CATS = [
          { value: 'water', label: 'Water' },
          { value: 'energy', label: 'Energy' },
          { value: 'council', label: 'Council Tax' },
          { value: 'waste', label: 'Waste' },
          { value: 'utility', label: 'Utility (Other)' },
          { value: 'household_bill', label: 'Fixed Bill' },
          { value: 'subscription', label: 'Subscription' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'mortgage', label: 'Mortgage' },
          { value: 'other', label: 'Other' }
      ];

      const VEHICLE_CATS = [
          { value: 'vehicle_fuel', label: 'Fuel' },
          { value: 'vehicle_tax', label: 'Tax' },
          { value: 'vehicle_mot', label: 'MOT' },
          { value: 'vehicle_service', label: 'Service / Plan' },
          { value: 'vehicle_breakdown', label: 'Breakdown' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'vehicle_finance', label: 'Finance' },
          { value: 'other', label: 'Other' }
      ];

      const ADULT_CATS = [
          { value: 'fun_money', label: 'Fun Money' },
          { value: 'subscription', label: 'Subscription' },
          { value: 'insurance', label: 'Life/Health Insurance' },
          { value: 'education', label: 'Education' },
          { value: 'care', label: 'Care & Support' },
          { value: 'loan', label: 'Loan' },
          { value: 'other', label: 'Other' }
      ];

      const CHILD_CATS = [
          { value: 'pocket_money', label: 'Pocket Money' },
          { value: 'subscription', label: 'Subscription' },
          { value: 'education', label: 'Education' },
          { value: 'care', label: 'Care & Support' },
          { value: 'other', label: 'Other' }
      ];
      
      const PET_CATS = [
          { value: 'food', label: 'Food & Supplies' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'vet', label: 'Vet & Medical' },
          { value: 'other', label: 'Other' }
      ];

      if (type === 'vehicle') return VEHICLE_CATS;
      if (type === 'member') {
          const m = members.find(mem => String(mem.id) === String(id));
          if (m && m.type === 'child') return CHILD_CATS;
          return ADULT_CATS;
      }
      if (type === 'pet') return PET_CATS;
      return HOUSEHOLD_CATS;
  }, [members]);

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

  const cycleData = useMemo(() => {
      const primaryIncome = incomes.find(i => i.is_primary === 1) || incomes.find(i => i.payment_day > 0);
      if (!primaryIncome || !primaryIncome.payment_day) return null;

      const payday = parseInt(primaryIncome.payment_day);
      let rawStartDate = viewDate.getDate() >= payday ? setDate(startOfMonth(viewDate), payday) : setDate(startOfMonth(addMonths(viewDate, -1)), payday);

      const startDate = getPriorWorkingDay(rawStartDate);
      const endDate = getPriorWorkingDay(addMonths(rawStartDate, 1));
      const cycleKey = format(startDate, 'yyyy-MM-dd');
      const budgetLabelDate = rawStartDate.getDate() >= 20 ? addMonths(rawStartDate, 1) : rawStartDate;
      const label = format(budgetLabelDate, 'MMMM yyyy') + " Budget";
      const cycleDuration = differenceInDays(endDate, startDate);

      const now = startOfDay(new Date());
      let progressPct = 0;
      let daysRemaining = differenceInDays(endDate, now);
      if (isSameDay(now, startDate) || isAfter(now, startDate)) {
          progressPct = Math.min((differenceInDays(now, startDate) / cycleDuration) * 100, 100);
      }
      if (daysRemaining < 0) daysRemaining = 0;

      const groups = {
          'bills': { id: 'bills', label: 'Household Bills', items: [], order: 0, emoji: '🏠' },
          'finance': { id: 'finance', label: 'Finance & Debts', items: [], order: 5, emoji: '💳' },
          'wealth': { id: 'wealth', label: 'Savings & Growth', items: [], order: 999, emoji: '📈' }
      };

      const getGroup = (groupId, groupLabel, emoji, order = 10) => {
          if (!groups[groupId]) {
              groups[groupId] = { id: groupId, label: groupLabel || 'Other', items: [], order, emoji: emoji || '❓' };
          }
          return groups[groupId];
      };

      const skipped = [];
      const lowerSearch = searchQuery.toLowerCase();
      
      const addExpense = (item, type, label, amount, dateObj, icon, category, targetGroupKey, object = null) => {
          if (!dateObj || !isValid(dateObj)) return;
          if (searchQuery && !label.toLowerCase().includes(lowerSearch) && !category.toLowerCase().includes(lowerSearch)) return;

          // Entity Filter Check
          if (filterEntity !== 'all') {
              const [fType, fId] = filterEntity.split(':');
              const itemType = object?.type || (type === 'credit_card' ? 'household' : 'household');
              const itemId = String(object?.id || 'null');
              if (fType !== itemType || fId !== itemId) {
                  // If it's a direct recurring cost, check its object_type/id
                  if (item.object_type !== fType || String(item.object_id || 'null') !== fId) return;
              }
          }

          const key = `${type}_${item.id || 'fixed'}_${format(dateObj, 'ddMM')}`; 
          const progressItem = progress.find(p => p.item_key === key && p.cycle_start === cycleKey);
          
          if (hidePaid && progressItem?.is_paid === 1) return;

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
          } else {
              let finalGroupKey = targetGroupKey;

              if (groupBy === 'category') {
                  finalGroupKey = `cat_${category}`;
                  getGroup(finalGroupKey, category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' '), '📂');
              } else if (groupBy === 'object') {
                  if (object) {
                      finalGroupKey = `obj_${object.type}_${object.id}`;
                      getGroup(finalGroupKey, object.name, object.emoji);
                  } else {
                      finalGroupKey = 'obj_household_null';
                      getGroup(finalGroupKey, 'Household', '🏠');
                  }
              } else if (groupBy === 'date') {
                  finalGroupKey = `date_${format(dateObj, 'yyyyMMdd')}`;
                  getGroup(finalGroupKey, format(dateObj, 'do MMMM'), '📅', dateObj.getTime());
              } else {
                  // Standard Split Logic
                  const financeCats = ['mortgage', 'loan', 'credit_card', 'vehicle_finance'];
                  if (targetGroupKey === 'wealth') finalGroupKey = 'wealth';
                  else finalGroupKey = financeCats.includes(category) ? 'finance' : 'bills';
              }
              
              groups[finalGroupKey].items.push(expObj);
          }
      };

      // --- CONSOLIDATED RECURRING COSTS ---
      liabilities.recurring_costs.filter(c => c.is_active !== 0).forEach(charge => {
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
                 else if (freq === 'yearly') current = addYears(current, 1);
                 else break;
             }
             while (isWithinInterval(current, { start: startDate, end: endDate })) {
                 datesToAdd.push(charge.adjust_for_working_day ? getNextWorkingDay(current) : new Date(current));
                 if (freq === 'weekly') current = addWeeks(current, 1);
                 else if (freq === 'monthly') current = addMonths(current, 1);
                 else if (freq === 'quarterly') current = addMonths(current, 3);
                 else if (freq === 'yearly') current = addYears(current, 1);
                 else break;
             }
          } else if (freq === 'monthly' && charge.day_of_month) {
             datesToAdd.push(getAdjustedDate(charge.day_of_month, charge.adjust_for_working_day, startDate));
          }

          let icon = <Receipt />;
          const cat = charge.category_id;
          if (cat === 'mortgage') icon = <Home />;
          else if (cat === 'loan') icon = <RequestQuote />;
          else if (cat === 'insurance') icon = <Shield />;
          else if (cat === 'subscription') icon = <ShoppingBag />;
          else if (cat?.includes('utility') || cat === 'water' || cat === 'energy') icon = <ElectricBolt />;
          else if (cat?.includes('vehicle')) icon = <DirectionsCar />;
          else if (cat === 'credit_card') icon = <CreditCard />;

          let objectInfo = null;
          if (charge.object_type === 'member') {
              const m = members.find(mem => String(mem.id) === String(charge.object_id));
              if (m) objectInfo = { type: 'member', id: m.id, name: m.name, emoji: m.emoji || '👤' };
          } else if (charge.object_type === 'vehicle') {
              const v = liabilities.vehicles.find(veh => String(veh.id) === String(charge.object_id));
              if (v) objectInfo = { type: 'vehicle', id: v.id, name: `${v.make} ${v.model}`, emoji: v.emoji || '🚗' };
          } else if (charge.object_type === 'asset') {
              const a = liabilities.assets.find(asset => String(asset.id) === String(charge.object_id));
              if (a) objectInfo = { type: 'asset', id: a.id, name: a.name, emoji: a.emoji || '📦' };
          } else if (charge.object_type === 'pet') {
              const p = members.find(mem => String(mem.id) === String(charge.object_id) && mem.type === 'pet');
              if (p) objectInfo = { type: 'pet', id: p.id, name: p.name, emoji: p.emoji || '🐾' };
          }

          datesToAdd.forEach(d => {
             addExpense(charge, 'recurring', charge.name, charge.amount, d, icon, charge.category_id, 'bills', objectInfo);
          });
      });

      liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit_card', `${cc.card_name}`, 0, getAdjustedDate(cc.payment_day || 1, true, startDate), <CreditCard />, 'credit_card', 'finance'));

      // 6. WEALTH items
      liabilities.savings.forEach(s => {
          const hasPots = savingsPots.some(pot => String(pot.savings_id) === String(s.id));
          if (!hasPots) {
              addExpense(s, 'savings_deposit', `${s.institution} ${s.account_name}`, s.deposit_amount || 0, getAdjustedDate(s.deposit_day || 1, false, startDate), <SavingsIcon />, 'savings', 'wealth');
          }
      });
      liabilities.pensions.forEach(p => addExpense(p, 'pension', `${p.provider} Pension`, p.monthly_contribution || 0, getAdjustedDate(p.payment_day || 1, true, startDate), <Assignment />, 'pension', 'wealth'));
      liabilities.investments.forEach(i => addExpense(i, 'investment', `${i.name} Investment`, i.monthly_contribution || 0, getAdjustedDate(i.payment_day || 1, true, startDate), <TrendingUp />, 'investment', 'wealth'));
      savingsPots.forEach(pot => addExpense(pot, 'pot', pot.name, 0, getAdjustedDate(pot.deposit_day || 1, false, startDate), <SavingsIcon />, 'savings', 'wealth'));

      const sorter = (a, b) => {
          let valA = a[sortConfig.key];
          let valB = b[sortConfig.key];
          if (sortConfig.key === 'computedDate') { valA = a.computedDate.getTime(); valB = b.computedDate.getTime(); }
          if (typeof valA === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      };

      const groupList = Object.values(groups).filter(g => g.items.length > 0).sort((a, b) => a.order - b.order);
      groupList.forEach(g => {
          g.items.sort(sorter);
          g.total = g.items.reduce((sum, i) => sum + i.amount, 0);
          g.paid = g.items.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
          g.unpaid = g.total - g.paid;
      });

      return { startDate, endDate, label, cycleKey, progressPct, daysRemaining, cycleDuration, groupList, skipped, budgetLabelDate };
  }, [incomes, liabilities, progress, viewDate, getPriorWorkingDay, getAdjustedDate, savingsPots, getNextWorkingDay, members, sortConfig, searchQuery, groupBy, filterEntity, hidePaid]);

  const currentCycleRecord = useMemo(() => cycles.find(c => c.cycle_start === cycleData?.cycleKey), [cycles, cycleData]);
  
  useEffect(() => {
      if (cycleData && !loading) {
          if (currentCycleRecord) {
              setActualPay(currentCycleRecord.actual_pay);
              setCurrentBalance(currentCycleRecord.current_balance);
              setSetupModalOpen(false);
          } else {
              setSetupModalOpen(true);
          }
      }
  }, [currentCycleRecord, cycleData, loading]);

  const projectedIncome = useMemo(() => {
      if (!cycleData) return 0;
      return incomes.reduce((sum, inc) => {
          if (inc.is_active !== 0) return sum + (parseFloat(inc.amount) || 0);
          return sum;
      }, 0);
  }, [incomes, cycleData]);

  const handleSetupBudget = async (mode) => {
      let initialPay = projectedIncome;
      let initialBalance = projectedIncome;
      if (mode === 'copy') {
          const sortedCycles = [...cycles].sort((a,b) => b.cycle_start.localeCompare(a.cycle_start));
          const lastRecord = sortedCycles.find(c => c.cycle_start < cycleData.cycleKey);
          if (lastRecord) {
              initialPay = lastRecord.actual_pay;
              initialBalance = lastRecord.actual_pay; 
          }
      }
      await saveCycleData(initialPay, initialBalance);
      setSetupModalOpen(false);
  };

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

  const handleResetCycle = () => {
      confirmAction("Reset Month?", "Are you sure? This clears progress.", async () => {
          try {
              await api.delete(`/households/${householdId}/finance/budget-cycles/${cycleData.cycleKey}`);
              showNotification("Budget cycle reset.", "success");
              fetchData();
          } catch { showNotification("Failed to reset cycle.", "danger"); }
      });
  };

  const handleDisableItem = (itemKey) => {
      confirmAction("Disable Item?", "Remove from this month's budget?", async () => {
          try {
              await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: -1, actual_amount: 0 });
              showNotification("Item skipped.", "success");
              fetchData();
          } catch { showNotification("Failed.", "danger"); }
      });
  };

  const handleRestoreItem = async (itemKey) => {
      try {
          await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
          showNotification("Item restored.", "success");
          fetchData();
      } catch { showNotification("Failed.", "danger"); }
  };

  const handleQuickAdd = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      const payload = {
        name: data.name,
        amount: parseFloat(data.amount) || 0,
        frequency: 'one_off',
        start_date: data.start_date,
        category_id: data.category || 'other',
        object_type: 'household',
        object_id: null,
        adjust_for_working_day: 1
      };
      try {
          await api.post(`/households/${householdId}/finance/recurring-costs`, payload);
          showNotification("Expense added.", "success");
          fetchData(); setQuickAddOpen(false);
      } catch { showNotification("Failed.", "danger"); }
  };

  const handleRecurringAdd = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      const [type, id] = selectedEntity.split(':');
      
      const payload = {
        name: data.name,
        amount: parseFloat(data.amount) || 0,
        frequency: recurringType,
        start_date: data.start_date,
        category_id: data.category || 'other',
        object_type: type,
        object_id: id === 'null' ? null : id,
        adjust_for_working_day: data.nearest_working_day === "1" ? 1 : 0
      };

      try {
          await api.post(`/households/${householdId}/finance/recurring-costs`, payload);
          showNotification("Recurring expense added.", "success");
          fetchData(); setRecurringAddOpen(false);
      } catch { showNotification("Failed.", "danger"); }
  };

  const cycleTotals = useMemo(() => {
      if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
      const allItems = cycleData.groupList.flatMap(g => g.items);
      const total = allItems.reduce((sum, e) => sum + e.amount, 0);
      const paid = allItems.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return { total, paid, unpaid: total - paid };
  }, [cycleData]);

  const overdraftLimit = 2500; // Hardcoded or fetch from household settings if available

  const drawdownData = useMemo(() => {
    if (!cycleData || !currentBalance) return [];
    const days = eachDayOfInterval({ start: cycleData.startDate, end: cycleData.endDate });
    let runningBalance = parseFloat(currentBalance) || 0;
    const allExpenses = cycleData.groupList.flatMap(g => g.items);
    
    return days.map(day => {
        // Subtract items due today that ARE NOT paid yet
        const itemsDueToday = allExpenses.filter(e => isSameDay(e.computedDate, day) && !e.isPaid);
        const totalDueToday = itemsDueToday.reduce((sum, i) => sum + i.amount, 0);
        
        // Add income due today that IS NOT paid yet
        const incomeDueToday = incomes.filter(inc => inc.is_active && parseInt(inc.payment_day) === day.getDate());
        // Simple logic: if today is income day, assume it adds to balance
        const totalIncomeToday = incomeDueToday.reduce((sum, i) => sum + parseFloat(i.amount), 0);
        
        runningBalance = runningBalance - totalDueToday + totalIncomeToday;
        return { date: day, balance: runningBalance };
    });
  }, [cycleData, currentBalance, incomes]);

  const lowestProjected = useMemo(() => {
    if (!drawdownData.length) return 0;
    return Math.min(...drawdownData.map(d => d.balance));
  }, [drawdownData]);

  const isOverdrawnRisk = lowestProjected < 0;
  const isLimitRisk = lowestProjected < -overdraftLimit;

  const savingsTotal = useMemo(() => savingsPots.reduce((sum, pot) => sum + (parseFloat(pot.current_amount) || 0), 0), [savingsPots]);
  const trueDisposable = (parseFloat(currentBalance) || 0) - cycleTotals.unpaid;
  const selectedTotals = useMemo(() => {
      if (!selectedKeys.length || !cycleData) return null;
      const allItems = cycleData.groupList.flatMap(g => g.items);
      const selected = allItems.filter(e => selectedKeys.includes(e.key));
      const total = selected.reduce((sum, e) => sum + e.amount, 0);
      const paid = selected.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return { count: selected.length, total, paid, unpaid: total - paid };
  }, [selectedKeys, cycleData]);
  
  useEffect(() => { setStatusBarData(selectedTotals); return () => setStatusBarData(null); }, [selectedTotals, setStatusBarData]);

  const handleSelectToggle = (key) => setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!cycleData) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography level="h4">No Primary Income Set</Typography><Button sx={{ mt: 2 }} onClick={fetchData}>Refresh</Button></Box>;

  const renderItemRow = (exp) => {
      const rel = getRelativeDateLabel(exp.computedDate);
      return (
      <tr 
          key={exp.key} 
          onClick={() => handleSelectToggle(exp.key)}
          style={{ cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent', opacity: exp.isPaid ? 0.6 : 1 }}
      >
          <td style={{ width: 40, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
              <Checkbox size="sm" checked={selectedKeys.includes(exp.key)} onChange={() => handleSelectToggle(exp.key)} />
          </td>
          <td>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar size="sm" sx={{ bgcolor: getEmojiColor(exp.label || '?', isDark) }}>{exp.icon}</Avatar>
                  <Typography level="body-sm" fontWeight="bold" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.label}</Typography>
              </Box>
          </td>
          <td style={{ width: 140 }}>
              <Chip size="sm" variant="soft" color={getCategoryColor(exp.category)} sx={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{exp.category.replace('_', ' ')}</Chip>
          </td>
          <td style={{ width: 160 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography level="body-xs" fontWeight="bold">{format(exp.computedDate, 'do MMM')}</Typography>
                  <Typography level="body-xs" color={rel.color}>{rel.label}</Typography>
              </Box>
          </td>
          <td style={{ textAlign: 'right', width: 110 }}>
              <Input 
                  size="sm" type="number" variant="soft" 
                  sx={{ width: 100, textAlign: 'right', '& input': { textAlign: 'right' } }} 
                  defaultValue={Number(exp.amount).toFixed(2)} 
                  onBlur={(e) => updateActualAmount(exp.key, e.target.value)} 
                  onClick={(e) => e.stopPropagation()}
                  slotProps={{ input: { step: '0.01' } }} 
              />
          </td>
          <td style={{ textAlign: 'center', width: 60 }}>
              <Checkbox 
                  size="sm" variant="plain" checked={exp.isPaid} 
                  onChange={() => togglePaid(exp.key, exp.amount)} 
                  disabled={savingProgress} 
                  uncheckedIcon={<RadioButtonUnchecked sx={{ fontSize: '1.2rem' }} />} 
                  checkedIcon={<CheckCircle color="success" sx={{ fontSize: '1.2rem' }} />} 
                  onClick={(e) => e.stopPropagation()} 
                  sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent' } }} 
              />
          </td>
          <td style={{ textAlign: 'center', width: 60 }}>
                <IconButton 
                    size="sm" variant="plain" color="danger" 
                    onClick={(e) => { e.stopPropagation(); handleDisableItem(exp.key); }}
                    sx={{ '--IconButton-size': '28px' }}
                >
                    <Block fontSize="small" />
                </IconButton>
            </td>
      </tr>
      );
  };

  const renderMobileItem = (exp) => (
      <Card 
        key={exp.key} 
        variant="soft" 
        color={selectedKeys.includes(exp.key) ? 'primary' : 'neutral'}
        sx={{ 
            p: 1.5, mb: 1, 
            opacity: exp.isPaid ? 0.6 : 1,
            position: 'relative',
            transition: 'all 0.2s'
        }}
        onClick={() => handleSelectToggle(exp.key)}
      >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Checkbox 
                    size="sm" 
                    checked={selectedKeys.includes(exp.key)} 
                    onChange={() => handleSelectToggle(exp.key)} 
                    onClick={(e) => e.stopPropagation()}
                    sx={{ mt: 0.5 }}
                />
                <Avatar size="md" sx={{ bgcolor: getEmojiColor(exp.label || '?', isDark), flexShrink: 0 }}>{exp.icon}</Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, gap: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography level="title-sm" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.label}</Typography>
                            <Typography level="body-xs" color="neutral">{format(exp.computedDate, 'do MMM')} ({getRelativeDateLabel(exp.computedDate).label})</Typography>
                        </Box>
                        <Chip size="sm" variant="soft" color={getCategoryColor(exp.category)} sx={{ fontSize: '0.6rem', textTransform: 'capitalize', flexShrink: 0 }}>{exp.category}</Chip>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, flexWrap: 'wrap', gap: 1 }}>
                        <Input 
                            size="sm" type="number" variant="outlined" 
                            sx={{ width: { xs: '100%', sm: 100 }, textAlign: 'right', order: { xs: 2, sm: 1 } }} 
                            defaultValue={Number(exp.amount).toFixed(2)} 
                            onBlur={(e) => updateActualAmount(exp.key, e.target.value)} 
                            onClick={(e) => e.stopPropagation()}
                            slotProps={{ input: { step: '0.01' } }} 
                        />
                        <Stack direction="row" spacing={1} sx={{ order: { xs: 1, sm: 2 }, ml: 'auto' }}>
                            <Checkbox 
                                size="lg" variant="plain" checked={exp.isPaid} 
                                onChange={() => togglePaid(exp.key, exp.amount)} 
                                disabled={savingProgress} 
                                uncheckedIcon={<RadioButtonUnchecked sx={{ fontSize: '1.5rem' }} />} 
                                checkedIcon={<CheckCircle color="success" sx={{ fontSize: '1.5rem' }} />} 
                                onClick={(e) => e.stopPropagation()} 
                                sx={{ minHeight: 44, minWidth: 44 }}
                            />
                            <IconButton 
                                size="sm" variant="plain" color="danger" 
                                onClick={(e) => { e.stopPropagation(); handleDisableItem(exp.key); }}
                                sx={{ minHeight: 44, minWidth: 44 }}
                            >
                                <Block />
                            </IconButton>
                        </Stack>
                    </Box>
                </Box>
          </Box>
      </Card>
  );

  const renderSection = (group) => {
      const isOpen = sectionsOpen[group.id] ?? true;
      const toggle = () => setSectionsOpen(prev => ({ ...prev, [group.id]: !prev[group.id] }));
      
      return (
      <Accordion expanded={isOpen} onChange={toggle} variant="outlined" sx={{ borderRadius: 'md', mb: 2 }} key={group.id}>
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ py: { xs: 1.5, sm: 1 } }}>
              <Box sx={{ display: 'flex', flexWrap: { xs: 'wrap', sm: 'nowrap' }, justifyContent: 'space-between', width: '100%', alignItems: 'center', mr: 2, overflow: 'hidden', gap: 1.5 }}>
                  <Typography level="title-lg" sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexBasis: { xs: '100%', sm: 'auto' } }}>
                      <Avatar size="sm">{group.emoji}</Avatar> 
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</Box>
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ flexShrink: 0, justifyContent: { xs: 'space-between', sm: 'flex-end' }, width: { xs: '100%', sm: 'auto' }, mt: { xs: 1, sm: 0 } }}>
                      <Box sx={{ textAlign: 'center' }}><Typography level="body-xs">Total</Typography><Typography level="body-sm" fontWeight="bold">{formatCurrency(group.total)}</Typography></Box>
                      <Box sx={{ textAlign: 'center' }}><Typography level="body-xs" color="success">Paid</Typography><Typography level="body-sm" fontWeight="bold" color="success">{formatCurrency(group.paid)}</Typography></Box>
                      <Box sx={{ textAlign: 'center' }}><Typography level="body-xs" color="danger">Unpaid</Typography><Typography level="body-sm" fontWeight="bold" color="danger">{formatCurrency(group.unpaid)}</Typography></Box>
                  </Stack>
              </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 1, sm: 0 } }}>
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  {group.items.map(renderMobileItem)}
              </Box>
              <Sheet variant="plain" sx={{ borderRadius: 'md', overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>
              <Table 
                hoverRow 
                sx={{ 
                    '--TableCell-paddingX': '16px',
                    tableLayout: 'fixed',
                    '& th': { bgcolor: 'background.level1' }
                }}
              >
                  <thead>
                      <tr>
                          <th style={{ width: 40, textAlign: 'center' }}><Checkbox size="sm" onChange={(e) => {
                              const keys = group.items.map(exp => exp.key);
                              if (e.target.checked) setSelectedKeys(prev => Array.from(new Set([...prev, ...keys])));
                              else setSelectedKeys(prev => prev.filter(k => !keys.includes(k)));
                          }} /></th>
                          <th onClick={() => requestSort('label')} style={{ cursor: 'pointer' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>Item <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'label' ? 1 : 0.3 }} /></Box>
                          </th>
                          <th onClick={() => requestSort('category')} style={{ width: 140, cursor: 'pointer' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>Category <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'category' ? 1 : 0.3 }} /></Box>
                          </th>
                          <th onClick={() => requestSort('computedDate')} style={{ width: 160, cursor: 'pointer' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>Due Date <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'computedDate' ? 1 : 0.3 }} /></Box>
                          </th>
                          <th onClick={() => requestSort('amount')} style={{ width: 110, textAlign: 'right', cursor: 'pointer' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>Amount <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'amount' ? 1 : 0.3 }} /></Box>
                          </th>
                          <th style={{ width: 60, textAlign: 'center' }}>Paid</th>
                          <th style={{ width: 60, textAlign: 'center' }}>Skip</th>
                      </tr>
                  </thead>
                  <tbody>
                      {group.items.map(renderItemRow)}
                  </tbody>
              </Table>
              </Sheet>
          </AccordionDetails>
      </Accordion>
      );
  };

  return (
    <Box sx={{ userSelect: 'none', pb: 12, overflowX: 'hidden' }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>{cycleData.label}</Typography>
                    <Typography level="body-xs" color="neutral">{format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}</Typography>
                </Box>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton>
            </Box>
            
            <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap', gap: 1 }}>
                <Input 
                    startDecorator={<Search />} 
                    placeholder="Search items..." 
                    size="sm" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: { xs: '100%', sm: 180 } }}
                />

                <Select 
                    size="sm" 
                    value={filterEntity} 
                    onChange={(e, val) => setFilterEntity(val)}
                    startDecorator={<FilterAlt />}
                    sx={{ width: { xs: '100%', sm: 160 } }}
                >
                    <Option value="all">All Objects</Option>
                    <Divider />
                    {entityGroupsOptions.map((group, idx) => [
                        <Typography key={`label-${idx}`} level="body-xs" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>{group.label}</Typography>,
                        ...group.options.map(opt => (
                            <Option key={opt.value} value={opt.value}>
                                {opt.emoji} {opt.label}
                            </Option>
                        ))
                    ])}
                </Select>

                <Select 
                    size="sm" 
                    value={groupBy} 
                    onChange={(e, val) => setGroupBy(val)}
                    startDecorator={<GroupWork />}
                    sx={{ width: { xs: '100%', sm: 160 } }}
                >
                    <Option value="standard">Standard Split</Option>
                    <Option value="category">By Category</Option>
                    <Option value="object">By Object</Option>
                    <Option value="date">By Date</Option>
                </Select>
            </Stack>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'center', md: 'flex-end' } }}>
                <Tooltip title="Toggle Paid Items">
                    <FormControl orientation="horizontal" size="sm" sx={{ mr: 1 }}>
                        <FormLabel sx={{ mr: 1, display: { xs: 'none', lg: 'inline' } }}>Hide Paid</FormLabel>
                        <Switch checked={hidePaid} onChange={(e) => setHidePaid(e.target.checked)} size="sm" />
                    </FormControl>
                </Tooltip>
                {currentCycleRecord && (
                    <Button variant="outlined" color="danger" size="sm" startDecorator={<RestartAlt />} onClick={handleResetCycle} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Reset</Button>
                )}
                {selectedKeys.length > 0 && (<Button variant="outlined" color="neutral" size="sm" onClick={() => setSelectedKeys([])}>Clear</Button>)}
                <Dropdown>
                    <MenuButton variant="solid" color="primary" size="sm" startDecorator={<Add />} endDecorator={<ArrowDropDown />}>Add</MenuButton>
                    <Menu placement="bottom-end" size="sm">
                        <MenuItem onClick={() => setQuickAddOpen(true)}>Add One-off</MenuItem>
                        <MenuItem onClick={() => setRecurringAddOpen(true)}>Add Recurring</MenuItem>
                    </Menu>
                </Dropdown>
            </Box>
        </Box>

        <Box sx={{ mb: 2 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}><Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Days Left</Typography><Typography level="body-xs" fontWeight="bold">{cycleData.daysRemaining} days to go</Typography></Box><LinearProgress determinate value={cycleData.progressPct} thickness={6} variant="soft" color="primary" sx={{ borderRadius: 'sm' }} /></Box>

        <Grid container spacing={3}>
            <Grid xs={12} md={3}>
                <Stack spacing={3}>
                    <Card variant="outlined" sx={{ p: 3 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}><Typography level="title-lg" startDecorator={<AccountBalanceWallet />}>Budget Entry</Typography><IconButton size="sm" variant={isPayLocked ? "plain" : "soft"} color={isPayLocked ? "neutral" : "warning"} onClick={() => setIsPayLocked(!isPayLocked)}>{isPayLocked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}</IconButton></Box>
                        <Stack spacing={2}><FormControl><FormLabel>Pay (£)</FormLabel><Input type="number" value={actualPay} disabled={isPayLocked} onChange={(e) => setActualPay(e.target.value)} onBlur={(e) => saveCycleData(e.target.value, currentBalance)} slotProps={{ input: { step: '0.01' } }} /></FormControl><FormControl><FormLabel>Balance (£)</FormLabel><Input type="number" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} onBlur={(e) => saveCycleData(actualPay, e.target.value)} slotProps={{ input: { step: '0.01' } }} /></FormControl></Stack>
                    </Card>
                    <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 }, boxShadow: 'sm' }}><Typography level="title-lg" startDecorator={<AccountBalanceWallet />} sx={{ mb: 2 }}>Budget Overview</Typography>
                        <Stack spacing={1} sx={{ mb: 3 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Typography level="body-md" color="neutral">Current Balance</Typography><Typography level="body-md" fontWeight="lg">{formatCurrency(parseFloat(currentBalance) || 0)}</Typography></Box><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Typography level="body-md" color="danger">Left to Pay</Typography><Typography level="body-md" fontWeight="lg" color="danger">- {formatCurrency(cycleTotals.unpaid)}</Typography></Box><Divider /><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, flexWrap: 'wrap', gap: 1 }}><Typography level="title-md">End of Month</Typography><Typography level="h2" color={trueDisposable >= 0 ? 'success' : 'danger'} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{formatCurrency(trueDisposable)}</Typography></Box><Divider sx={{ my: 1 }} /><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Typography level="body-sm" color="neutral">Total Savings</Typography><Typography level="title-md" color="success">{formatCurrency(savingsTotal)}</Typography></Box></Stack>
                        <Box sx={{ bgcolor: 'background.level1', p: 2, borderRadius: 'md' }}><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography level="body-xs" fontWeight="bold">Bills Paid</Typography><Typography level="body-xs">{Math.round((cycleTotals.paid / (cycleTotals.total || 1)) * 100)}%</Typography></Box><LinearProgress determinate value={(cycleTotals.paid / (cycleTotals.total || 1)) * 100} thickness={6} color="success" sx={{ bgcolor: 'background.level2' }} /><Typography level="body-xs" sx={{ mt: 1, textAlign: 'center', color: 'neutral.500' }}>{formatCurrency(cycleTotals.paid)} paid of {formatCurrency(cycleTotals.total)} total</Typography></Box>
                    </Card>
                    {/* BUDGET SIDEBAR */}
                    <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography level="title-md" startDecorator={<BankIcon />} sx={{ mb: 2 }}>Balance Projection</Typography>
                        <FormControl sx={{ mb: 2 }}>
                            <FormLabel>Joint Balance (£)</FormLabel>
                            <Input type="number" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} onBlur={(e) => saveCycleData(actualPay, e.target.value)} />
                        </FormControl>
                        
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography level="body-xs" color="neutral">Lowest Projected</Typography>
                                <Typography level="body-sm" fontWeight="bold" color={isOverdrawnRisk ? 'danger' : 'success'}>{formatCurrency(lowestProjected)}</Typography>
                            </Box>
                            <DrawdownChart data={drawdownData} limit={-overdraftLimit} />
                        </Box>

                        {isOverdrawnRisk && (
                            <Alert color={isLimitRisk ? 'danger' : 'warning'} variant="soft" startDecorator={<Warning />} sx={{ mb: 2, '--Alert-padding': '8px' }}>
                                <Typography level="body-xs" fontWeight="bold">
                                    {isLimitRisk ? 'Overdraft Limit Reached!' : 'Account will drop below zero.'}
                                </Typography>
                            </Alert>
                        )}

                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                            <Typography level="title-sm">Safe to Spend</Typography>
                            <Typography level="title-lg" color={lowestProjected > 0 ? 'success' : 'danger'}>
                                {formatCurrency(Math.max(0, lowestProjected))}
                            </Typography>
                        </Box>
                    </Card>

                    {/* WEALTH SIDEBAR */}
                    <Card variant="outlined" sx={{ p: 2 }}>
                        <Typography level="title-md" startDecorator={<SavingsIcon />} sx={{ mb: 2 }}>Savings Overview</Typography>
                        <Stack spacing={2}>
                            {liabilities.savings.map(acc => (
                                <Box key={acc.id}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography level="body-xs" fontWeight="bold">{acc.account_name}</Typography>
                                        <Typography level="body-xs">{formatCurrency(acc.current_balance)}</Typography>
                                    </Box>
                                    <List size="sm" sx={{ '--ListItem-paddingLeft': '0px' }}>
                                        {savingsPots.filter(p => p.savings_account_id === acc.id).map(pot => (
                                            <ListItem key={pot.id}>
                                                <ListItemDecorator>{pot.emoji}</ListItemDecorator>
                                                <ListItemContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                        <Typography level="body-xs">{pot.name}</Typography>
                                                        <Typography level="body-xs" fontWeight="bold">{formatCurrency(pot.current_amount)}</Typography>
                                                    </Box>
                                                    <LinearProgress 
                                                        determinate 
                                                        value={(pot.current_amount / (pot.target_amount || 1)) * 100} 
                                                        size="sm" 
                                                        color="success" 
                                                        sx={{ mt: 0.5 }}
                                                    />
                                                </ListItemContent>
                                            </ListItem>
                                        ))}
                                        {savingsPots.filter(p => p.savings_account_id === acc.id).length === 0 && (
                                            <Typography level="body-xs" color="neutral" sx={{ fontStyle: 'italic' }}>No pots defined.</Typography>
                                        )}
                                    </List>
                                </Box>
                            ))}
                        </Stack>
                    </Card>
                </Stack>
            </Grid>

            <Grid xs={12} md={9} sx={{ overflowX: 'hidden' }}>
                {cycleData.groupList.map(renderSection)}
                
                {cycleData.skipped?.length > 0 && (
                        <Accordion expanded={sectionsOpen.skipped} onChange={() => setSectionsOpen(p => ({ ...p, skipped: !p.skipped }))} variant="outlined" sx={{ borderRadius: 'md', mt: 4, borderColor: 'neutral.300', opacity: 0.8 }}>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography level="title-md" color="neutral" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <RemoveCircleOutline /> Skipped Items ({cycleData.skipped.length})
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                <Sheet sx={{ overflowX: 'auto', borderRadius: 'md' }}>
                                    <Table hoverRow sx={{ tableLayout: 'fixed', minWidth: { xs: 400, sm: '100%' } }}>
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th sx={{ width: { xs: 80, sm: 140 } }}>Category</th>
                                                <th sx={{ width: 100, textAlign: 'right' }}>Amount</th>
                                                <th sx={{ width: 100, textAlign: 'center' }}>Restore</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cycleData.skipped.map(exp => (
                                                <tr key={exp.key} style={{ opacity: 0.6 }}>
                                                    <td>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Avatar size="sm" sx={{ width: 20, height: 20, fontSize: '0.65rem' }}>{exp.icon}</Avatar>
                                                            <Typography level="body-xs" sx={{ textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.label}</Typography>
                                                        </Box>
                                                    </td>
                                                    <td><Chip size="sm" variant="soft" color="neutral" sx={{ fontSize: '0.6rem' }}>{exp.category}</Chip></td>
                                                    <td sx={{ textAlign: 'right' }}><Typography level="body-xs">{formatCurrency(exp.amount)}</Typography></td>
                                                    <td sx={{ textAlign: 'center' }}>
                                                        <Button size="sm" variant="plain" color="primary" startDecorator={<Restore />} onClick={() => handleRestoreItem(exp.key)}>Restore</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Sheet>
                            </AccordionDetails>
                        </Accordion>
                    )}
            </Grid>
        </Grid>

        {/* SETUP MODAL */}
        <Modal open={setupModalOpen}>
            <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
                <DialogTitle>Setup {format(cycleData.budgetLabelDate, 'MMMM')} Budget</DialogTitle>
                <DialogContent>
                    <Typography>Let's get started. Projected income for this cycle is <b>{formatCurrency(projectedIncome)}</b>.</Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <Button size="lg" variant="solid" color="primary" onClick={() => handleSetupBudget('fresh')}>
                            Start Fresh (Balance = Pay)
                        </Button>
                        {cycles.length > 0 && (
                            <Button size="lg" variant="soft" color="neutral" onClick={() => handleSetupBudget('copy')}>
                                Copy Previous Month's Pay Settings
                            </Button>
                        )}
                    </Stack>
                </DialogContent>
            </ModalDialog>
        </Modal>

        {/* Quick Add */}
        <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)}>
            <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
                <DialogTitle>Add One-off Expense</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleQuickAdd}>
                        <Stack spacing={2}>
                            <FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl>
                            <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: '0.01' } }} /></FormControl>
                            <FormControl required><FormLabel>Charge Date</FormLabel><Input name="start_date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} /></FormControl>
                            <Button type="submit" fullWidth>Add to Cycle</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>
        
        {/* Recurring Add */}
        <Modal open={recurringAddOpen} onClose={() => setRecurringAddOpen(false)}>
            <ModalDialog sx={{ maxWidth: 450, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <DialogTitle>Add Recurring Expense</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleRecurringAdd}>
                        <Stack spacing={2}>
                            <FormControl>
                                <FormLabel>Assign To</FormLabel>
                                <Select 
                                    value={selectedEntity} 
                                    onChange={(e, val) => setSelectedEntity(val)}
                                    placeholder="Select Household, Person, Vehicle..."
                                >
                                    {entityGroupsOptions.map((group, idx) => [
                                        idx > 0 && <Divider key={`div-${idx}`} />,
                                        <Typography level="body-xs" fontWeight="bold" sx={{ px: 1.5, py: 0.5, color: 'primary.500' }} key={`header-${idx}`}>
                                            {group.label}
                                        </Typography>,
                                        ...group.options.map(opt => (
                                            <Option key={opt.value} value={opt.value}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar size="sm" sx={{ width: 20, height: 20, fontSize: '12px' }}>{opt.emoji}</Avatar>
                                                    {opt.label}
                                                </Box>
                                            </Option>
                                        ))
                                    ])}
                                </Select>
                            </FormControl>

                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <AppSelect 
                                        label="Category" 
                                        name="category" 
                                        defaultValue={getCategoryOptions(selectedEntity)[0]?.value} 
                                        options={getCategoryOptions(selectedEntity)} 
                                    />
                                </Grid>
                                <Grid xs={6}>
                                    <AppSelect label="Frequency" value={recurringType} onChange={setRecurringType} options={[
                                        { value: 'weekly', label: 'Weekly' },
                                        { value: 'monthly', label: 'Monthly' },
                                        { value: 'quarterly', label: 'Quarterly' },
                                        { value: 'yearly', label: 'Yearly' }
                                    ]} />
                                </Grid>
                            </Grid>

                            <FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus placeholder="e.g. Netflix, Car Insurance" /></FormControl>
                            <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" step="0.01" /></FormControl>
                            <FormControl required><FormLabel>First Charge Date</FormLabel><Input name="start_date" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} /></FormControl>
                            <Checkbox label="Adjust for Working Day (Next)" name="nearest_working_day" defaultChecked value="1" />
                            <Button type="submit" fullWidth>Add Recurring Expense</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>
    </Box>
  );
}
