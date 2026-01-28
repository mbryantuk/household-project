import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, LinearProgress, Switch,
  Dropdown, Menu, MenuButton, MenuItem, Select, Option
} from '@mui/joy';
import { 
  AccountBalanceWallet, CheckCircle, RadioButtonUnchecked, TrendingDown, 
  Home, CreditCard, 
  Assignment, ElectricBolt, Add, Shield, 
  ShoppingBag, ChevronLeft, ChevronRight, Lock, LockOpen, ArrowDropDown, RestartAlt, Receipt,
  DirectionsCar, DeleteOutline, Restore, Sort, Search, ArrowUpward, ArrowDownward
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
      charges: [], credit_cards: [], water: null, council: null, energy: [],
      pensions: [], vehicles: [], assets: []
  });
  const [savingsPots, setSavingsPots] = useState([]);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'category', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Category Ordering
  const defaultOrder = useMemo(() => ['credit_repay', 'one_off', 'weekly', 'monthly', 'quarterly', 'yearly', 'savings'], []);
  const [categoryOrder, setCategoryOrder] = useState(defaultOrder);

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickLinkType, setQuickLinkType] = useState('general');
  const [recurringAddOpen, setRecurringAddOpen] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');
  
  // New State for Entity-First Flow
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

  // Load user preferences
  useEffect(() => {
      if (user?.budget_settings) {
          try {
              const settings = typeof user.budget_settings === 'string' ? JSON.parse(user.budget_settings || '{}') : (user.budget_settings || {});
              if (settings?.categoryOrder && Array.isArray(settings.categoryOrder)) {
                  // Merge with default to ensure no missing keys if new ones added
                  const merged = Array.from(new Set([...settings.categoryOrder, ...defaultOrder]));
                  setCategoryOrder(merged);
              }
          } catch (e) { console.error("Failed to parse budget settings", e); }
      }
  }, [user, defaultOrder]);

  const saveCategoryOrder = useCallback(async (newOrder) => {
      setCategoryOrder(newOrder);
      const settings = typeof user?.budget_settings === 'string' ? JSON.parse(user.budget_settings || '{}') : (user?.budget_settings || {});
      const newSettings = { ...settings, categoryOrder: newOrder };
      // Use JSON.stringify for saving complex objects to text field
      await onUpdateProfile({ budget_settings: JSON.stringify(newSettings) });
  }, [onUpdateProfile, user?.budget_settings]);

  const moveCategory = (index, direction) => {
      const newOrder = [...categoryOrder];
      if (direction === 'up' && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      saveCategoryOrder(newOrder);
  };

  // ENTITY-FIRST HELPER LOGIC
  const entityGroups = useMemo(() => {
    return [
        { label: 'General', options: [{ value: 'general:household', label: 'Household (General)', emoji: '🏠' }] },
        { label: 'People', options: members.filter(m => m.type !== 'pet').map(m => ({ value: `member:${m.id}`, label: m.name, emoji: m.emoji || '👤' })) },
        { label: 'Pets', options: members.filter(m => m.type === 'pet').map(p => ({ value: `pet:${p.id}`, label: p.name, emoji: p.emoji || '🐾' })) },
        { label: 'Vehicles', options: liabilities.vehicles.map(v => ({ value: `vehicle:${v.id}`, label: `${v.make} ${v.model}`, emoji: v.emoji || '🚗' })) },
        { label: 'Assets', options: liabilities.assets.map(a => ({ value: `asset:${a.id}`, label: a.name, emoji: a.emoji || '📦' })) }
    ].filter(g => g.options.length > 0);
  }, [members, liabilities]);

  const getCategoryOptions = useCallback((entityString) => {
      const [type] = (entityString || 'general:household').split(':');
      
      const HOUSEHOLD_CATS = [
          { value: 'household_bill', label: 'Household Bill' },
          { value: 'utility', label: 'Utility (Water/Gas/Elec)' },
          { value: 'subscription', label: 'Subscription' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'warranty', label: 'Warranty' },
          { value: 'service', label: 'Service / Maintenance' },
          { value: 'other', label: 'Other' }
      ];

      const VEHICLE_CATS = [
          { value: 'vehicle_fuel', label: 'Fuel' },
          { value: 'vehicle_tax', label: 'Tax' },
          { value: 'vehicle_mot', label: 'MOT' },
          { value: 'vehicle_service', label: 'Service' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'warranty', label: 'Warranty' },
          { value: 'finance', label: 'Finance Payment' },
          { value: 'other', label: 'Other' }
      ];

      const MEMBER_CATS = [
          { value: 'subscription', label: 'Subscription' },
          { value: 'insurance', label: 'Life/Health Insurance' },
          { value: 'education', label: 'Education' },
          { value: 'care', label: 'Care / Childcare' },
          { value: 'other', label: 'Other' }
      ];
      
      const PET_CATS = [
          { value: 'food', label: 'Food' },
          { value: 'insurance', label: 'Pet Insurance' },
          { value: 'vet', label: 'Vet Bills' },
          { value: 'other', label: 'Other' }
      ];

      if (type === 'vehicle') return VEHICLE_CATS;
      if (type === 'member') return MEMBER_CATS;
      if (type === 'pet') return PET_CATS;
      return HOUSEHOLD_CATS;
  }, []);

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
      const skipped = [];
      
      const addExpense = (item, type, label, amount, dateObj, icon, category, object = null, memberId = null) => {
          if (!dateObj || !isValid(dateObj)) return;
          const key = `${type}_${item.id || 'fixed'}_${format(dateObj, 'ddMM')}`; 
          const progressItem = progress.find(p => p.item_key === key && p.cycle_start === cycleKey);
          
          const expObj = {
              key, type, label: label || 'Unnamed Expense', amount: progressItem?.actual_amount || parseFloat(amount) || 0,
              day: dateObj.getDate(), computedDate: dateObj,
              icon, category: category || 'other', isPaid: progressItem?.is_paid === 1,
              isDeletable: !['pot', 'pension', 'investment', 'credit_card'].includes(type),
              id: item.id, object: object || {}, 
              frequency: item.frequency?.toLowerCase() || 'monthly', 
              memberId: (memberId != null && String(memberId).length > 0) ? String(memberId) : null
          };

          if (progressItem?.is_paid === -1) {
              skipped.push(expObj);
          } else {
              expenses.push(expObj);
          }
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
          if (type === 'asset' || type === 'house') {
              return { name: 'Household', emoji: '🏠' };
          }
          if (type === 'pet') {
              const p = members.find(mem => String(mem.id) === String(id) && mem.type === 'pet');
              return p ? { name: p.name, emoji: p.emoji || '🐾' } : null;
          }
          return null;
      };

      liabilities.mortgages.forEach(m => addExpense(m, 'mortgage', m.lender, m.monthly_payment, getAdjustedDate(m.payment_day, true, startDate), <Home />, 'Mortgage', { name: 'House', emoji: '🏠' }));
      liabilities.loans.forEach(l => addExpense(l, 'loan', `${l.lender} Loan`, l.monthly_payment, getAdjustedDate(l.payment_day, true, startDate), <TrendingDown />, 'Liability', { name: 'Finance', emoji: '💰' }));
      
      // Credit Cards - Add Balance to label for context
      liabilities.credit_cards.forEach(cc => {
          const label = `${cc.card_name} (Bal: ${formatCurrency(cc.current_balance)})`;
          addExpense(cc, 'credit_card', label, 0, getAdjustedDate(cc.payment_day || 1, true, startDate), <CreditCard />, 'Credit Card', { name: cc.provider, emoji: cc.emoji || '💳', balance: cc.current_balance, limit: cc.credit_limit });
      });
      
      liabilities.charges.filter(c => c.is_active !== 0).forEach(charge => {
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
          } else {
              if (freq === 'monthly') {
                 datesToAdd.push(getAdjustedDate(charge.day_of_month, charge.adjust_for_working_day, startDate));
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

      return { startDate, endDate, label, cycleKey, progressPct, daysRemaining, cycleDuration, expenses, skipped };
  }, [incomes, liabilities, progress, viewDate, getPriorWorkingDay, getAdjustedDate, savingsPots, getNextWorkingDay, members]);

  const sortedExpenses = useMemo(() => {
    if (!cycleData) return [];
    let sortableItems = [...cycleData.expenses];
    
    // Apply Search Filter
    if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        sortableItems = sortableItems.filter(e => 
            e.label.toLowerCase().includes(lower) || 
            e.category.toLowerCase().includes(lower) ||
            (e.object?.name || '').toLowerCase().includes(lower)
        );
    }

    // Apply Sorting
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'computedDate') {
          valA = a.computedDate?.getTime() || 0;
          valB = b.computedDate?.getTime() || 0;
        } else if (sortConfig.key === 'amount') {
            valA = parseFloat(a.amount) || 0;
            valB = parseFloat(b.amount) || 0;
        } else if (sortConfig.key === 'isPaid') {
            // Sort paid to bottom
            valA = a.isPaid ? 1 : 0;
            valB = b.isPaid ? 1 : 0;
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [cycleData, sortConfig, searchQuery]);

  const currentCycleRecord = useMemo(() => cycles.find(c => c.cycle_start === cycleData?.cycleKey), [cycles, cycleData]);

  useEffect(() => {
      if (currentCycleRecord) { setActualPay(currentCycleRecord.actual_pay); setCurrentBalance(currentCycleRecord.current_balance); }
      else { setActualPay(''); setCurrentBalance(''); }
  }, [currentCycleRecord]);

  const handleSelectToggle = (key) => setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

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
          const isCurrentlyPaid = progress.some(p => p.item_key === itemKey && p.cycle_start === cycleData.cycleKey && p.is_paid === 1);
          if (isCurrentlyPaid) await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
          else { playDing(); await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: 1, actual_amount: amount }); }
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) { console.error("Failed to toggle paid status", err); } finally { setSavingProgress(false); }
  };

  const handleDisableItem = (itemKey) => {
      confirmAction(
          "Disable for this month?",
          "This will remove the item from this month's budget. It will reappear next month. You can restore it from the Skipped Items section at the bottom.",
          async () => {
              try {
                  await api.post(`/households/${householdId}/finance/budget-progress`, { 
                      cycle_start: cycleData.cycleKey, 
                      item_key: itemKey, 
                      is_paid: -1, 
                      actual_amount: 0 
                  });
                  showNotification("Item disabled for this cycle.", "success");
                  fetchData();
              } catch { showNotification("Failed to disable item.", "danger"); }
          }
      );
  };

  const handleRestoreItem = async (itemKey) => {
      try {
          await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}`);
          showNotification("Item restored to budget.", "success");
          fetchData();
      } catch { showNotification("Failed to restore item.", "danger"); }
  };

  const handleArchiveCharge = (chargeId) => {
      confirmAction(
          "Archive Recurring Charge?",
          "This will move the charge to the deleted section. It will no longer appear in future budgets unless restored.",
          async () => {
              try {
                  await api.delete(`/households/${householdId}/finance/charges/${chargeId}`);
                  showNotification("Charge archived.", "success");
                  fetchData();
              } catch { showNotification("Failed to archive.", "danger"); }
          }
      );
  };

  const handleQuickAdd = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      data.frequency = 'one_off'; 
      data.segment = data.category || 'other';
      data.adjust_for_working_day = data.nearest_working_day === "1" ? 1 : 0;
      data.linked_entity_type = quickLinkType;
      data.linked_entity_id = data.linked_entity_id || null;

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
      
      // Parse Entity First Selection
      const [type, id] = selectedEntity.split(':');
      
      data.adjust_for_working_day = data.nearest_working_day === "1" ? 1 : 0;
      data.frequency = recurringType;
      data.segment = data.category || 'other';
      data.linked_entity_type = type;
      data.linked_entity_id = id === 'household' ? null : id;

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
      if (!sortedExpenses) return {};
      const groups = {};
      sortedExpenses.filter(exp => exp.type !== 'pot' && exp.type !== 'credit_card').forEach(exp => {
          const freq = exp.frequency || 'monthly';
          const normalized = freq.toLowerCase();
          if (!groups[normalized]) groups[normalized] = [];
          groups[normalized].push(exp);
      });
      return groups;
  }, [sortedExpenses]);

  const creditCardItems = useMemo(() => {
      return sortedExpenses.filter(exp => exp.type === 'credit_card');
  }, [sortedExpenses]);

  const getVisibleItems = useCallback((items) => {
      return items.filter(exp => !hidePaid || !exp.isPaid);
  }, [hidePaid]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!cycleData) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography level="h4">No Primary Income Set</Typography><Button sx={{ mt: 2 }} onClick={fetchData}>Refresh</Button></Box>;

  const renderMobileCards = (items) => {
    return (
      <Stack spacing={2}>
        {items.map(exp => (
          <Card key={exp.key} variant="outlined" sx={{ p: 2, bgcolor: selectedKeys.includes(exp.key) ? 'primary.softBg' : 'background.surface', opacity: exp.isPaid ? 0.7 : 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar size="md" sx={{ bgcolor: getEmojiColor(exp.label || '?', isDark) }}>{exp.icon}</Avatar>
                <Box>
                  <Typography level="title-sm" sx={{ bgcolor: searchQuery && exp.label.toLowerCase().includes(searchQuery.toLowerCase()) ? 'warning.200' : 'transparent' }}>{exp.label}</Typography>
                  <Typography level="body-xs" color="neutral" sx={{ textTransform: 'capitalize' }}>{exp.category}</Typography>
                </Box>
              </Box>
              <Checkbox size="lg" checked={exp.isPaid} onChange={() => togglePaid(exp.key, exp.amount)} uncheckedIcon={<RadioButtonUnchecked />} checkedIcon={<CheckCircle color="success" />} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
               <Box>
                 <Typography level="body-xs" fontWeight="bold">Due: {format(exp.computedDate, 'do MMM')}</Typography>
                 {exp.object && <Typography level="body-xs">{exp.object.emoji} {exp.object.name}</Typography>}
               </Box>
               <Input 
                  size="sm" type="number" variant="soft" 
                  sx={{ width: 100, fontWeight: 'bold' }} 
                  defaultValue={Number(exp.amount).toFixed(2)} 
                  onBlur={(e) => updateActualAmount(exp.key, e.target.value)} 
                  slotProps={{ input: { step: '0.01', style: { textAlign: 'right' } } }} 
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
               {exp.type === 'charge' && (
                  <IconButton size="sm" variant="plain" color="neutral" onClick={() => handleArchiveCharge(exp.id)}><DeleteOutline /></IconButton>
               )}
               {exp.isDeletable && (
                  <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDisableItem(exp.key)}><RestartAlt sx={{ transform: 'rotate(-45deg)' }} /></IconButton>
               )}
            </Box>
          </Card>
        ))}
      </Stack>
    );
  };

  const renderTableRows = (items, hidePill = false) => {
    return items.map((exp) => (
        <tr 
          key={exp.key} 
          onClick={() => handleSelectToggle(exp.key)} 
          style={{ cursor: 'pointer', backgroundColor: selectedKeys.includes(exp.key) ? 'var(--joy-palette-primary-softBg)' : 'transparent', opacity: exp.isPaid ? 0.6 : 1 }}
        >
            <td style={{ textAlign: 'center' }} className="hide-mobile"><Checkbox size="sm" checked={selectedKeys.includes(exp.key)} onChange={() => handleSelectToggle(exp.key)} onClick={(e) => e.stopPropagation()} /></td>
            <td>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar size="sm" sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: getEmojiColor(exp.label || '?', isDark), color: '#fff' }}>{exp.icon}</Avatar>
                    <Box>
                        <Typography level="body-sm" fontWeight="bold" sx={{ bgcolor: searchQuery && exp.label.toLowerCase().includes(searchQuery.toLowerCase()) ? 'warning.200' : 'transparent' }}>{exp.label}</Typography>
                        {!hidePill && exp.object && (
                            <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {exp.object.emoji} {exp.object.name}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </td>
            <td className="hide-mobile">
                <Chip size="sm" variant="soft" color="neutral" sx={{ fontSize: '0.65rem', minHeight: '16px', px: 0.5, maxWidth: '100%' }}>
                    <Typography noWrap sx={{ maxWidth: '120px', textTransform: 'capitalize' }}>{exp.category}</Typography>
                </Chip>
            </td>
            <td>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography level="body-xs" fontWeight="bold">{exp.day}</Typography>
                    {exp.computedDate && <Typography level="body-xs" color="neutral" sx={{ fontSize: '0.6rem' }}>{format(exp.computedDate, 'do MMM')}</Typography>}
                </Box>
            </td>
            <td style={{ textAlign: 'right' }}>
                <Input 
                    size="sm" type="number" variant="soft" 
                    sx={{ fontSize: '0.75rem', '--Input-minHeight': '24px', textAlign: 'right', width: { xs: '75px', md: '100px' }, '& input': { textAlign: 'right' } }} 
                    defaultValue={Number(exp.amount).toFixed(2)} 
                    onBlur={(e) => updateActualAmount(exp.key, e.target.value)} 
                    onClick={(e) => e.stopPropagation()} 
                    slotProps={{ input: { step: '0.01' } }} 
                />
            </td>
            <td style={{ textAlign: 'center' }}>
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
            <td style={{ textAlign: 'center' }}>
                <Stack direction="row" spacing={0.5} justifyContent="center">
                    {exp.type === 'charge' && (
                        <IconButton 
                            size="sm" variant="plain" color="neutral" 
                            onClick={(e) => { e.stopPropagation(); handleArchiveCharge(exp.id); }}
                            sx={{ '--IconButton-size': '28px' }}
                            title="Archive/Delete Recurring Charge"
                        >
                            <DeleteOutline fontSize="small" />
                        </IconButton>
                    )}
                    {exp.isDeletable && (
                        <IconButton 
                            size="sm" variant="plain" color="danger" 
                            onClick={(e) => { e.stopPropagation(); handleDisableItem(exp.key); }}
                            sx={{ '--IconButton-size': '28px' }}
                            title="Skip for this month"
                        >
                            <RestartAlt fontSize="small" sx={{ transform: 'rotate(-45deg)' }} />
                        </IconButton>
                    )}
                </Stack>
            </td>
        </tr>
    ));
  };

  const renderSection = (items, hidePill = false) => {
    const visible = getVisibleItems(items);
    if (visible.length === 0) return null;

    if (isMobile) return renderMobileCards(visible);

    return (
        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', mb: 2 }}>
            <Table hoverRow stickyHeader size="sm" sx={{ '--TableCell-paddingX': '8px', '--TableCell-paddingY': '8px', '& .hide-mobile': { display: { xs: 'none', md: 'table-cell' } } }}>
                <thead>
                    <tr>
                        <th style={{ width: 40, textAlign: 'center' }} className="hide-mobile"><Checkbox size="sm" onChange={(e) => {
                            const keys = visible.map(exp => exp.key);
                            if (e.target.checked) setSelectedKeys(prev => Array.from(new Set([...prev, ...keys])));
                            else setSelectedKeys(prev => prev.filter(k => !keys.includes(k)));
                        }} /></th>
                        <th onClick={() => requestSort('label')} style={{ cursor: 'pointer' }}>Item <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'label' ? 1 : 0.3 }} /></th>
                        <th onClick={() => requestSort('category')} style={{ width: 120, cursor: 'pointer' }} className="hide-mobile">Category <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'category' ? 1 : 0.3 }} /></th> 
                        <th onClick={() => requestSort('computedDate')} style={{ width: 80, textAlign: 'center', cursor: 'pointer' }}>Due <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'computedDate' ? 1 : 0.3 }} /></th>
                        <th onClick={() => requestSort('amount')} style={{ width: 100, textAlign: 'right', cursor: 'pointer' }}>Amount <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'amount' ? 1 : 0.3 }} /></th>
                        <th onClick={() => requestSort('isPaid')} style={{ width: 40, textAlign: 'center', cursor: 'pointer' }}>Paid <Sort sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'isPaid' ? 1 : 0.3 }} /></th>
                        <th style={{ width: 80, textAlign: 'center' }}>Action</th>
                    </tr>
                </thead>
                <tbody>{renderTableRows(visible, hidePill)}</tbody>
            </Table>
        </Sheet>
    );
  };

  return (
    <Box sx={{ userSelect: 'none', pb: 10 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{cycleData.label}</Typography>
                        <Chip variant="soft" color="primary" size="sm" className="hide-mobile">{cycleData.cycleDuration} Days</Chip>
                    </Box>
                    <Typography level="body-md" color="neutral">{format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}</Typography>
                </Box>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton>
            </Box>
            
            <Input 
                startDecorator={<Search />} 
                placeholder="Search budget..." 
                size="sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: { xs: '100%', sm: 200 } }}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl orientation="horizontal" size="sm" sx={{ mr: 1 }}>
                    <FormLabel sx={{ mr: 1 }}>Hide Paid</FormLabel>
                    <Switch checked={hidePaid} onChange={(e) => setHidePaid(e.target.checked)} size="sm" />
                </FormControl>
                {currentCycleRecord && (
                    <Button variant="outlined" color="danger" size="sm" startDecorator={<RestartAlt />} onClick={handleResetCycle} className="hide-mobile">Reset</Button>
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
                    {categoryOrder.map((key, idx) => {
                        // 1. Credit Card Section
                        if (key === 'credit_repay') {
                            if (creditCardItems.length === 0) return null;
                            return (
                                <Box key={key}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography level="title-md" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CreditCard fontSize="small" /> Credit Card Repayments
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton size="sm" variant="plain" disabled={idx === 0} onClick={() => moveCategory(idx, 'up')}><ArrowUpward fontSize="small" /></IconButton>
                                            <IconButton size="sm" variant="plain" disabled={idx === categoryOrder.length - 1} onClick={() => moveCategory(idx, 'down')}><ArrowDownward fontSize="small" /></IconButton>
                                        </Box>
                                    </Box>
                                    {renderSection(creditCardItems, false)}
                                </Box>
                            );
                        }

                        // 2. Savings Section
                        if (key === 'savings') {
                            const visibleAccountGroups = Object.entries(groupedPots).map(([accId, group]) => {
                                const potItems = group.pots.map(p => sortedExpenses.find(e => e.key.startsWith(`pot_${p.id}_`))).filter(Boolean);
                                const visiblePots = getVisibleItems(potItems);
                                if (visiblePots.length === 0) return null;
                                return { accId, group, visiblePots, potItems };
                            }).filter(Boolean);

                            if (visibleAccountGroups.length === 0) return null;

                            return (
                                <Box key={key}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography level="title-md" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SavingsIcon fontSize="small" /> Savings & Goals</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton size="sm" variant="plain" disabled={idx === 0} onClick={() => moveCategory(idx, 'up')}><ArrowUpward fontSize="small" /></IconButton>
                                            <IconButton size="sm" variant="plain" disabled={idx === categoryOrder.length - 1} onClick={() => moveCategory(idx, 'down')}><ArrowDownward fontSize="small" /></IconButton>
                                        </Box>
                                    </Box>
                                    <Stack spacing={3}>
                                        {visibleAccountGroups.map(({ accId, group, potItems }) => (
                                            <Box key={accId}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(group.emoji, isDark) }}>{group.emoji}</Avatar><Box><Typography level="title-sm">{group.name}</Typography><Typography level="body-xs" color="neutral">{group.institution}</Typography></Box></Box>
                                                    <Box sx={{ textAlign: 'right' }}><Typography level="title-sm" color="success">{formatCurrency(group.balance)}</Typography><Typography level="body-xs">Balance</Typography></Box>
                                                </Box>
                                                {renderSection(potItems, true)}
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            );
                        }

                        // 3. Generic Frequency Sections (Weekly, Monthly, etc.)
                        const items = groupedRecurring[key] || [];
                        if (getVisibleItems(items).length === 0) return null;
                        const label = key === 'one_off' ? 'One-off Expenses' : `${key.charAt(0).toUpperCase() + key.slice(1)} Expenses`;

                        return (
                            <Box key={key}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography level="title-md" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Payments fontSize="small" /> {label}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton size="sm" variant="plain" disabled={idx === 0} onClick={() => moveCategory(idx, 'up')}><ArrowUpward fontSize="small" /></IconButton>
                                        <IconButton size="sm" variant="plain" disabled={idx === categoryOrder.length - 1} onClick={() => moveCategory(idx, 'down')}><ArrowDownward fontSize="small" /></IconButton>
                                    </Box>
                                </Box>
                                {renderSection(items, false)}
                            </Box>
                        );
                    })}

                    {cycleData.skipped?.length > 0 && (
                        <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography level="title-md" color="neutral" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <RestartAlt fontSize="small" /> Skipped for this Month
                            </Typography>
                            <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto', bgcolor: 'background.level1' }}>
                                <Table size="sm">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th style={{ width: 120 }} className="hide-mobile">Category</th>
                                            <th style={{ width: 100, textAlign: 'right' }}>Amount</th>
                                            <th style={{ width: 100, textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cycleData.skipped.map(exp => (
                                            <tr key={exp.key} style={{ opacity: 0.6 }}>
                                                <td>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar size="sm" sx={{ width: 20, height: 20, fontSize: '0.65rem' }}>{exp.icon}</Avatar>
                                                        <Typography level="body-xs" sx={{ textDecoration: 'line-through' }}>{exp.label}</Typography>
                                                    </Box>
                                                </td>
                                                <td className="hide-mobile"><Chip size="sm" variant="soft" sx={{ fontSize: '0.6rem' }}>{exp.category}</Chip></td>
                                                <td style={{ textAlign: 'right' }}><Typography level="body-xs">{formatCurrency(exp.amount)}</Typography></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <Button size="sm" variant="plain" color="primary" startDecorator={<Restore />} onClick={() => handleRestoreItem(exp.key)}>Restore</Button>
                                                </td>
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
            <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
                <DialogTitle>Add One-off Expense</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleQuickAdd}>
                        <Stack spacing={2}>
                            <FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl>
                            <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: '0.01' } }} /></FormControl>
                            <FormControl required><FormLabel>Charge Date</FormLabel><Input name="start_date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} /></FormControl>
                            <Checkbox label="Nearest Working Day (Next)" name="nearest_working_day" defaultChecked value="1" />
                            <AppSelect label="Category" name="category" defaultValue="other" options={[{ value: 'subscription', label: 'Subscription' }, { value: 'utility', label: 'Utility' }, { value: 'insurance', label: 'Insurance' }, { value: 'service', label: 'Service' }, { value: 'other', label: 'Other' }]} />
                            
                            <Divider />
                            <AppSelect label="Linked To" value={quickLinkType} onChange={setQuickLinkType} options={[{ value: 'general', label: 'Household' }, { value: 'member', label: 'Member' }, { value: 'vehicle', label: 'Vehicle' }, { value: 'asset', label: 'Asset' }]} />
                            
                            {quickLinkType === 'member' && (
                                <AppSelect label="Select Member" name="linked_entity_id" options={members.map(m => ({ value: String(m.id), label: `${m.emoji || '👤'} ${m.name}` }))} />
                            )}
                            {quickLinkType === 'vehicle' && (
                                <AppSelect label="Select Vehicle" name="linked_entity_id" options={liabilities.vehicles.map(v => ({ value: String(v.id), label: `${v.emoji || '🚗'} ${v.make} ${v.model}` }))} />
                            )}
                            {quickLinkType === 'asset' && (
                                <AppSelect label="Select Asset" name="linked_entity_id" options={liabilities.assets.map(a => ({ value: String(a.id), label: `${a.emoji || '📦'} ${a.name}` }))} />
                            )}

                            <Button type="submit">Add to Cycle</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={recurringAddOpen} onClose={() => setRecurringAddOpen(false)}>
            <ModalDialog sx={{ maxWidth: 450, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <DialogTitle>Add Recurring Expense</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleRecurringAdd}>
                        <Stack spacing={2}>
                            {/* Step 1: Entity First Selection */}
                            <FormControl>
                                <FormLabel>Assign To</FormLabel>
                                <Select 
                                    value={selectedEntity} 
                                    onChange={(e, val) => setSelectedEntity(val)}
                                    placeholder="Select Household, Person, Vehicle..."
                                >
                                    {entityGroups.map((group, idx) => [
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

                            {/* Step 2: Contextual Details */}
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
                            
                            <Button type="submit">Add Recurring Expense</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>
    </Box>
  );
}