import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, LinearProgress, Switch, Accordion, AccordionSummary, AccordionDetails,
  Dropdown, Menu, MenuButton, MenuItem, Select, Option, Tooltip
} from '@mui/joy';
import {
  AccountBalanceWallet, CheckCircle, RadioButtonUnchecked, TrendingDown,
  Payments, Savings as SavingsIcon, Home, CreditCard,
  Assignment, ElectricBolt, AccountBalance as BankIcon, Add, Shield,
  ShoppingBag, ChevronLeft, ChevronRight, ArrowDropDown, RestartAlt, Receipt,
  DirectionsCar, DeleteForever, Sort, Search, ExpandMore, TrendingUp, Block, RequestQuote,
  FilterAlt, GroupWork, Warning, CalendarMonth, Close
} from '@mui/icons-material';
import {
  format, addMonths, startOfMonth, setDate, differenceInDays,
  isSameDay, isAfter, isBefore, startOfDay, isWithinInterval,
  parseISO, isValid, addYears, addWeeks, eachDayOfInterval, addDays
} from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';
import EmojiPicker from '../../components/EmojiPicker';
import MetadataFormFields from '../../components/ui/MetadataFormFields';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- DRAWDOWN CHART COMPONENT ---
const DrawdownChart = ({ data, limit, cycleStartDate, cycleEndDate, eventsPerDay, mini = false }) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d.balance), 1000);
    const minVal = Math.min(...data.map(d => d.balance), limit, -500);
    const range = maxVal - minVal;
    const height = mini ? 40 : 120;
    const width = 600; 
    
    const now = startOfDay(new Date());
    
    const getX = (date) => {
        const total = differenceInDays(cycleEndDate, cycleStartDate) || 1;
        const diff = differenceInDays(startOfDay(date), cycleStartDate);
        return (Math.max(0, Math.min(diff, total)) / total) * width;
    };
    const getY = (val) => height - ((val - minVal) / (range || 1)) * height;

    const points = data.map((d) => `${getX(d.date)},${getY(d.balance)}`).join(' ');
    const zeroY = getY(0);
    const limitY = getY(limit);
    const todayX = getX(now);

    return (
        <Box sx={{ width: '100%', mt: mini ? 0 : 1 }}>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="chart-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'var(--joy-palette-primary-300)', stopOpacity: 0.15 }} />
                        <stop offset="100%" style={{ stopColor: 'var(--joy-palette-primary-300)', stopOpacity: 0 }} />
                    </linearGradient>
                </defs>

                <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="var(--joy-palette-neutral-300)" strokeDasharray="4,2" />
                {limit < 0 && <line x1="0" y1={limitY} x2={width} y2={limitY} stroke="var(--joy-palette-danger-200)" strokeDasharray="2,2" />}
                
                {!mini && Array.from(eventsPerDay?.keys() || []).map(dateStr => {
                    const parsed = dateStr ? parseISO(dateStr) : null;
                    if (!parsed || !isValid(parsed)) return null;
                    const x = getX(parsed);
                    return <circle key={dateStr} cx={x} cy={height - 5} r="2" fill="var(--joy-palette-neutral-400)" opacity={0.5} />;
                })}

                <polyline fill="url(#chart-area-grad)" points={`0,${height} ${points} ${width},${height}`} />
                <polyline fill="none" stroke="var(--joy-palette-primary-500)" strokeWidth="2.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
                <line x1={todayX} y1="0" x2={todayX} y2={height} stroke="var(--joy-palette-warning-500)" strokeWidth={mini ? 1 : 2} strokeDasharray="3,2" />
                
                {data.length > 0 && (
                    <circle cx={todayX} cy={getY(data.find(d => isSameDay(d.date, now))?.balance || data[0].balance)} r={mini ? 2 : 5} fill="var(--joy-palette-warning-500)" stroke="#fff" strokeWidth={mini ? 1 : 2} />
                )}
            </svg>

            {!mini && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 2, bgcolor: 'primary.500' }} />
                        <Typography level="body-xs">Balance Projection</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 2, borderBottom: '2px dashed', borderColor: 'neutral.400' }} />
                        <Typography level="body-xs">Zero Line</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 2, borderBottom: '2px dashed', borderColor: 'warning.500' }} />
                        <Typography level="body-xs">Today</Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

const getCategoryColor = (cat) => {
    const lower = (cat || '').toLowerCase();
    if (lower === 'income') return 'success';
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

const IncomeSourceCard = ({ inc, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempAmount, setTempAmount] = useState(inc.amount);
    const [tempDate, setTempDate] = useState(format(inc.computedDate, 'yyyy-MM-dd'));

    const handleSave = () => {
        onUpdate(inc.key, tempAmount, tempDate);
        setIsEditing(false);
    };

    return (
        <Card variant="outlined" size="sm" sx={{ 
            p: 1.5, display: 'flex', flexDirection: 'row', gap: 1.5,
            borderColor: inc.isPaid ? 'success.300' : 'divider',
            bgcolor: inc.isPaid ? 'success.softBg' : 'background.surface',
            boxShadow: 'xs'
        }}>
            <Avatar size="sm" variant="soft" color={inc.isPaid ? 'success' : 'neutral'} sx={{ mt: 0.5 }}>{inc.icon}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography level="title-sm" sx={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}>{inc.label}</Typography>
                {isEditing ? (
                    <Input 
                        type="date" size="sm" variant="plain" 
                        value={tempDate} onChange={(e) => setTempDate(e.target.value)}
                        sx={{ fontSize: 'xs', p: 0, mt: -0.5 }}
                    />
                ) : (
                    <Typography level="body-xs" color="neutral">{format(inc.computedDate, 'do MMM')}</Typography>
                )}
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                {isEditing ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Input 
                            size="sm" type="number" variant="outlined" autoFocus
                            value={tempAmount} onChange={(e) => setTempAmount(e.target.value)}
                            sx={{ width: 80, fontWeight: 'bold' }}
                            slotProps={{ input: { step: '0.01', style: { textAlign: 'right', padding: '4px' } } }}
                        />
                        <IconButton size="sm" color="success" onClick={handleSave}><CheckCircle sx={{ fontSize: '1.2rem' }} /></IconButton>
                    </Stack>
                ) : (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography level="title-sm" fontWeight="bold" color={inc.isPaid ? 'success.700' : 'neutral.700'}>
                            {formatCurrency(inc.amount)}
                        </Typography>
                        {!inc.isPaid && (
                            <IconButton size="sm" variant="plain" onClick={() => setIsEditing(true)}>
                                <CalendarMonth sx={{ fontSize: '1rem', opacity: 0.6 }} />
                            </IconButton>
                        )}
                    </Stack>
                )}
                
                <Checkbox 
                    size="sm" 
                    variant="soft"
                    color="success"
                    checked={inc.isPaid} 
                    onChange={() => onUpdate(inc.key, inc.amount, null, !inc.isPaid)}
                    uncheckedIcon={<RadioButtonUnchecked />}
                    checkedIcon={<CheckCircle />}
                    sx={{ ml: 'auto' }}
                />
            </Box>
        </Card>
    );
};

export default function BudgetView({ financialProfileId }) {
  const { api, id: householdId, isDark, showNotification, members = [], setStatusBarData, confirmAction } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [savingProgress] = useState(new Map());
  const [viewDate, setViewDate] = useState(new Date());
  const [bankHolidays, setBankHolidays] = useState([]);
  const [hidePaid, setHidePaid] = useState(false);
  
  const [incomes, setIncomes] = useState([]);
  const [progress, setProgress] = useState([]); 
  const [cycles, setCycles] = useState([]); 
  const [currentAccounts, setCurrentAccounts] = useState([]);
  
  const [liabilities, setLiabilities] = useState({
      recurring_costs: [], credit_cards: [], pensions: [], vehicles: [], assets: [],
      savings: [], investments: [], mortgages: [], vehicle_finance: [], house_details: {}
  });
  const [savingsPots, setSavingsPots] = useState([]);
  const [calendarDates, setCalendarDates] = useState([]);

  // Sections State
  const [sectionsOpen, setSectionsOpen] = useState({ income: true, bills: true, finance: true, wealth: true, skipped: true, birthdays: true });
  const [groupBy, setGroupBy] = useState('standard');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'computedDate', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Emojis
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [adhocIncomeOpen, setAdhocIncomeOpen] = useState(false);
  const [recurringAddOpen, setRecurringAddOpen] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');
  const [selectedEntity, setSelectedEntity] = useState('household:null');
  const [recurringCategory, setRecurringCategory] = useState('other');
  const [recurringMetadata, setRecurringMetadata] = useState({});
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  // Widget Tray State (Replacing floating overlays)
  const [activeWidget, setActiveWidget] = useState(null); // 'projection', 'wealth', 'incomes' or null

  // Emoji Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('💰');

  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!financialProfileId) return;
    setLoading(true);
    try {
      const q = `?financial_profile_id=${financialProfileId}`;
      const [ 
          incRes, progRes, cycleRes, recurringRes, ccRes, pensionRes, potRes, holidayRes, vehRes, assetRes, saveRes, invRes, accountRes, dateRes,
          mortRes, vFinRes, detailRes
      ] = await Promise.all([
          api.get(`/households/${householdId}/finance/income${q}`),
          api.get(`/households/${householdId}/finance/budget-progress${q}`),
          api.get(`/households/${householdId}/finance/budget-cycles${q}`),
          api.get(`/households/${householdId}/finance/recurring-costs${q}`),
          api.get(`/households/${householdId}/finance/credit-cards${q}`),
          api.get(`/households/${householdId}/finance/pensions${q}`),
          api.get(`/households/${householdId}/finance/savings/pots${q}`), 
          api.get(`/system/holidays`),
          api.get(`/households/${householdId}/vehicles`),
          api.get(`/households/${householdId}/assets`),
          api.get(`/households/${householdId}/finance/savings${q}`),
          api.get(`/households/${householdId}/finance/investments${q}`),
          api.get(`/households/${householdId}/finance/current-accounts${q}`),
          api.get(`/households/${householdId}/dates`),
          api.get(`/households/${householdId}/finance/mortgages${q}`),
          api.get(`/households/${householdId}/finance/vehicle-finance${q}`),
          api.get(`/households/${householdId}/details`)
      ]);

      setIncomes(incRes.data || []);
      setProgress(progRes.data || []);
      setCycles(cycleRes.data || []);
      setCurrentAccounts(accountRes.data || []);
      setLiabilities({
          recurring_costs: recurringRes.data || [],
          credit_cards: ccRes.data || [],
          pensions: pensionRes.data || [],
          vehicles: vehRes.data || [],
          assets: assetRes.data || [],
          savings: saveRes.data || [],
          investments: invRes.data || [],
          mortgages: mortRes.data || [],
          vehicle_finance: vFinRes.data || [],
          house_details: detailRes.data || {}
      });
      setSavingsPots(potRes.data || []);
      setBankHolidays(holidayRes.data || []);
      setCalendarDates(dateRes.data || []);
    } catch (err) { console.error("Failed to fetch budget data", err); } finally { setLoading(false); }
  }, [api, householdId, financialProfileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEmojiSelect = (emoji) => {
      setSelectedEmoji(emoji);
      setPickerOpen(false);
  };

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
      const HOUSEHOLD_CATS = [ { value: 'water', label: 'Water' }, { value: 'energy', label: 'Energy' }, { value: 'council', label: 'Council Tax' }, { value: 'utility', label: 'Utility' }, { value: 'subscription', label: 'Subscription' }, { value: 'insurance', label: 'Insurance' }, { value: 'mortgage', label: 'Mortgage' }, { value: 'other', label: 'Other' } ];
      const VEHICLE_CATS = [ { value: 'vehicle_fuel', label: 'Fuel' }, { value: 'vehicle_tax', label: 'Tax' }, { value: 'insurance', label: 'Insurance' }, { value: 'vehicle_finance', label: 'Finance' }, { value: 'other', label: 'Other' } ];
      const ADULT_CATS = [ { value: 'fun_money', label: 'Fun Money' }, { value: 'subscription', label: 'Subscription' }, { value: 'insurance', label: 'Insurance' }, { value: 'education', label: 'Education' }, { value: 'other', label: 'Other' } ];
      const PET_CATS = [ { value: 'food', label: 'Food' }, { value: 'insurance', label: 'Insurance' }, { value: 'vet', label: 'Vet' }, { value: 'other', label: 'Other' } ];

      if (type === 'vehicle') return VEHICLE_CATS;
      if (type === 'member') {
          const m = members.find(mem => String(mem.id) === String(id));
          if (m && m.type === 'child') return [ { value: 'pocket_money', label: 'Pocket Money' }, ...ADULT_CATS ];
          return ADULT_CATS;
      }
      if (type === 'pet') return PET_CATS;
      return HOUSEHOLD_CATS;
  }, [members]);

  const playFeedback = useCallback((type = 'success') => {
      try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          const audioCtx = new AudioContext();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          const now = audioCtx.currentTime;
          if (type === 'success') { oscillator.frequency.setValueAtTime(880, now); oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.1); }
          else { oscillator.frequency.setValueAtTime(660, now); oscillator.frequency.exponentialRampToValueAtTime(330, now + 0.1); }
          gainNode.gain.setValueAtTime(0.1, now);
          oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
          oscillator.start(now); oscillator.stop(now + 0.2);
          setTimeout(() => { audioCtx.close(); }, 300);
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
      if (isSameDay(now, startDate) || isAfter(now, startDate)) {
          progressPct = Math.min((differenceInDays(now, startDate) / cycleDuration) * 100, 100);
      }

      const progressMap = new Map();
      progress.forEach(p => { if (p.cycle_start === cycleKey) progressMap.set(p.item_key, p); });

      const groups = {
          'events': { id: 'events', label: 'Events & Holidays', items: [], order: -1, emoji: '📅' },
          'bills': { id: 'bills', label: 'Household Bills', items: [], order: 0, emoji: '🏠' },
          'finance': { id: 'finance', label: 'Finance & Debts', items: [], order: 5, emoji: '💳' },
          'wealth': { id: 'wealth', label: 'Savings & Growth', items: [], order: 999, emoji: '📈' }
      };

      const getGroup = (groupId, groupLabel, emoji, order = 10) => {
          if (!groups[groupId]) groups[groupId] = { id: groupId, label: groupLabel || 'Other', items: [], order, emoji: emoji || '❓' };
          return groups[groupId];
      };

      const skipped = [];
      const incomesCollected = [];
      const eventsPerDay = new Map(); 
      const lowerSearch = searchQuery.toLowerCase();
      
      const addExpense = (item, type, label, amount, dateObj, icon, category, targetGroupKey, object = null) => {
          if (!dateObj || !isValid(dateObj)) return;
          if (searchQuery && !label.toLowerCase().includes(lowerSearch) && !category.toLowerCase().includes(lowerSearch)) return;
          if (filterEntity && filterEntity !== 'all') {
              const [fType, fId] = (filterEntity || 'household:null').split(':');
              if (object?.type !== fType || String(object?.id || 'null') !== fId) return;
          }
          if (filterAccount && filterAccount !== 'all') {
             if (String(item.bank_account_id || 'null') !== String(filterAccount)) return;
          }

          const key = `${type}_${item.id || 'fixed'}_${format(dateObj, 'ddMM')}`;
          const progressItem = progressMap.get(key);
          if (hidePaid && progressItem?.is_paid === 1) return;
          const effectiveDate = (progressItem?.actual_date && typeof progressItem.actual_date === 'string') ? parseISO(progressItem.actual_date) : dateObj;

          const expObj = {
              key, type, label: label || 'Unnamed Item', amount: progressItem?.actual_amount || parseFloat(amount) || 0,
              day: effectiveDate.getDate(), computedDate: effectiveDate,
              icon, category: category || 'other', isPaid: progressItem?.is_paid === 1,
              id: item.id, object: object || {}, frequency: item.frequency || 'monthly'
          };

          if (['birthday', 'holiday', 'celebration'].includes(type)) {
              const dayStr = format(dateObj, 'yyyy-MM-dd');
              if (!eventsPerDay.has(dayStr)) eventsPerDay.set(dayStr, []);
              eventsPerDay.get(dayStr).push(expObj);
          }

          if (progressItem?.is_paid === -1) skipped.push(expObj);
          else {
              if (targetGroupKey === 'income') { incomesCollected.push(expObj); return; }
              let finalGroupKey = targetGroupKey;
              if (groupBy === 'category') { finalGroupKey = `cat_${category}`; getGroup(finalGroupKey, category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' '), '📂'); }
              else if (groupBy === 'object') { finalGroupKey = object ? `obj_${object.type}_${object.id}` : 'obj_household_null'; getGroup(finalGroupKey, object?.name || 'Household', object?.emoji || '🏠'); }
              else if (groupBy === 'date') { finalGroupKey = `date_${format(dateObj, 'yyyyMMdd')}`; getGroup(finalGroupKey, format(dateObj, 'do MMMM'), '📅', dateObj.getTime()); }
              else {
                  const financeCats = ['mortgage', 'loan', 'credit_card', 'vehicle_finance'];
                  if (targetGroupKey === 'wealth') finalGroupKey = 'wealth';
                  else if (['birthday', 'holiday', 'celebration'].includes(type)) finalGroupKey = 'events';
                  else finalGroupKey = financeCats.includes(category) ? 'finance' : 'bills';
              }
              groups[finalGroupKey].items.push(expObj);
          }
      };

      incomes.forEach(inc => {
          const d = getAdjustedDate(inc.payment_day, inc.nearest_working_day === 1, startDate);
          const member = members.find(m => m.id === inc.member_id);
          addExpense(inc, 'income', `${inc.employer} Pay`, inc.amount, d, <Payments />, 'income', 'income', member ? { type: 'member', id: member.id, name: member.first_name, emoji: member.emoji } : null);
      });

      (bankHolidays || []).forEach(hDate => {
          if (!hDate || typeof hDate !== 'string') return;
          const d = parseISO(hDate);
          if (isValid(d) && isWithinInterval(d, { start: startDate, end: endDate })) addExpense({ id: hDate }, 'holiday', 'Bank Holiday', 0, d, '🏦', 'holiday', 'events');
      });

      members.forEach(m => {
          if (!m.dob || typeof m.dob !== 'string') return;
          const dob = parseISO(m.dob);
          if (!isValid(dob)) return;
          const yearsToTry = [...new Set([startDate.getFullYear(), endDate.getFullYear()])];
          yearsToTry.forEach(year => {
              const bday = new Date(year, dob.getMonth(), dob.getDate());
              if (isWithinInterval(bday, { start: startDate, end: endDate })) addExpense(m, 'birthday', `${m.alias || m.name}'s Birthday`, 0, bday, '🎂', 'birthday', 'events', { type: 'member', id: m.id, name: m.name, emoji: m.emoji || '👤' });
          });
      });

      liabilities.recurring_costs.filter(c => c.is_active !== 0).forEach(charge => {
          let datesToAdd = [];
          const freq = charge.frequency?.toLowerCase();
          const anchor = (charge.start_date && typeof charge.start_date === 'string') ? parseISO(charge.start_date) : null;
          if (freq === 'one_off') {
             const dateStr = charge.exact_date || charge.start_date;
             if (dateStr) { const d = parseISO(dateStr); if (isWithinInterval(d, { start: startDate, end: endDate })) datesToAdd.push(d); }
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
          }
          let icon = <Receipt />;
          if (charge.category_id === 'mortgage') icon = <Home />;
          else if (charge.category_id === 'loan') icon = <RequestQuote />;
          else if (charge.category_id === 'insurance') icon = <Shield />;
          else if (charge.category_id?.includes('utility')) icon = <ElectricBolt />;

          datesToAdd.forEach(d => addExpense(charge, 'recurring', charge.name, charge.amount, d, icon, charge.category_id, charge.category_id === 'income' ? 'income' : 'bills', null));
      });

      liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit_card', `${cc.card_name}`, 0, getAdjustedDate(cc.payment_day || 1, true, startDate), <CreditCard />, 'credit_card', 'finance'));

      liabilities.savings.forEach(s => addExpense(s, 'savings_deposit', `${s.institution} ${s.account_name}`, s.deposit_amount || 0, getAdjustedDate(s.deposit_day || 1, false, startDate), <SavingsIcon />, 'savings', 'wealth'));
      liabilities.pensions.forEach(p => addExpense(p, 'pension', `${p.provider} Pension`, p.monthly_contribution || 0, getAdjustedDate(p.payment_day || 1, true, startDate), <Assignment />, 'pension', 'wealth'));
      liabilities.investments.forEach(i => addExpense(i, 'investment', `${i.name} Investment`, i.monthly_contribution || 0, getAdjustedDate(i.payment_day || 1, true, startDate), <TrendingUp />, 'investment', 'wealth'));

      const sorter = (a, b) => {
          if (sortConfig.key === 'computedDate') return sortConfig.direction === 'asc' ? a.computedDate.getTime() - b.computedDate.getTime() : b.computedDate.getTime() - a.computedDate.getTime();
          return sortConfig.direction === 'asc' ? String(a[sortConfig.key]).localeCompare(String(b[sortConfig.key])) : String(b[sortConfig.key]).localeCompare(String(a[sortConfig.key]));
      };

      const groupList = Object.values(groups).filter(g => g.items.length > 0).sort((a, b) => a.order - b.order);
      groupList.forEach(g => {
          g.items.sort(sorter);
          g.total = g.items.reduce((sum, i) => sum + i.amount, 0);
          g.paid = g.items.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
          g.unpaid = g.total - g.paid;
      });

      incomesCollected.sort(sorter);
      const incomeGroup = { items: incomesCollected, total: incomesCollected.reduce((sum, i) => sum + i.amount, 0), paid: incomesCollected.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0), unpaid: incomesCollected.reduce((sum, i) => sum + (i.isPaid ? 0 : i.amount), 0) };

      return { startDate, endDate, label, cycleKey, progressPct, groupList, skipped, incomeGroup, eventsPerDay, cycleDuration };
  }, [incomes, liabilities, progress, viewDate, getPriorWorkingDay, getAdjustedDate, getNextWorkingDay, members, sortConfig, searchQuery, groupBy, filterEntity, filterAccount, hidePaid, bankHolidays]);

  const currentCycleRecord = useMemo(() => cycles.find(c => c.cycle_start === cycleData?.cycleKey), [cycles, cycleData]);
  
  useEffect(() => {
      if (cycleData && !loading) {
          if (currentCycleRecord) { setActualPay(currentCycleRecord.actual_pay); setCurrentBalance(currentCycleRecord.current_balance); setSelectedAccountId(currentCycleRecord.bank_account_id || null); setSetupModalOpen(false); }
          else setSetupModalOpen(true);
      }
  }, [currentCycleRecord, cycleData, loading]);

  const saveCycleData = async (pay, balance, accountId = selectedAccountId) => {
      if (!cycleData) return;
      try {
          await api.post(`/households/${householdId}/finance/budget-cycles`, { cycle_start: cycleData.cycleKey, actual_pay: parseFloat(pay) || 0, current_balance: parseFloat(balance) || 0, bank_account_id: accountId, financial_profile_id: financialProfileId });
          const res = await api.get(`/households/${householdId}/finance/budget-cycles?financial_profile_id=${financialProfileId}`);
          setCycles(res.data || []);
      } catch (err) { console.error("Failed to save cycle data", err); }
  };

  const updateActualAmount = async (itemKey, amount, actualDate = null, isPaidOverride = null) => {
      const progressItem = progress.find(p => p.item_key === itemKey && p.cycle_start === cycleData?.cycleKey);
      const isPaid = isPaidOverride !== null ? (isPaidOverride ? 1 : 0) : (progressItem ? (progressItem.is_paid || 0) : 0);
      try {
          await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: isPaid, actual_amount: parseFloat(amount) || 0, actual_date: actualDate, financial_profile_id: financialProfileId });
          fetchData();
      } catch (err) { console.error("Failed to update actual amount", err); }
  };

  const togglePaid = async (itemKey, amount = 0) => {
      const currentProgress = [...progress];
      const existingItemIndex = currentProgress.findIndex(p => p.item_key === itemKey && p.cycle_start === cycleData.cycleKey);
      const isCurrentlyPaid = existingItemIndex !== -1 && currentProgress[existingItemIndex].is_paid === 1;
      if (isCurrentlyPaid) playFeedback('undo'); else playFeedback('success');
      try {
          if (isCurrentlyPaid) await api.delete(`/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}?financial_profile_id=${financialProfileId}`);
          else await api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: itemKey, is_paid: 1, actual_amount: amount, financial_profile_id: financialProfileId });
          fetchData();
      } catch (err) { showNotification("Failed to update status.", "danger"); }
  };

  const cycleTotals = useMemo(() => {
      if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
      const allItems = cycleData.groupList.flatMap(g => g.items);
      const total = allItems.reduce((sum, e) => sum + e.amount, 0);
      const paid = allItems.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
      return { total, paid, unpaid: total - paid };
  }, [cycleData]);

  const drawdownData = useMemo(() => {
    if (!cycleData || currentBalance === undefined) return [];
    const now = startOfDay(new Date());
    const days = eachDayOfInterval({ start: cycleData.startDate, end: cycleData.endDate });
    const allExpenses = cycleData.groupList.flatMap(g => g.items);
    const allIncomes = cycleData.incomeGroup.items;
    const overdueAdjustment = allIncomes.filter(e => isBefore(startOfDay(e.computedDate), now) && !e.isPaid).reduce((s, i) => s + i.amount, 0) - allExpenses.filter(e => isBefore(startOfDay(e.computedDate), now) && !e.isPaid).reduce((s, e) => s + e.amount, 0);
    let runningBalance = (parseFloat(currentBalance) || 0) + overdueAdjustment;
    return days.map(day => {
        if (isAfter(day, now) || isSameDay(day, now)) {
            runningBalance = runningBalance - allExpenses.filter(e => isSameDay(e.computedDate, day) && !e.isPaid).reduce((s, i) => s + i.amount, 0) + allIncomes.filter(e => isSameDay(e.computedDate, day) && !e.isPaid).reduce((s, i) => s + i.amount, 0);
        }
        return { date: day, balance: runningBalance };
    });
  }, [cycleData, currentBalance]);

  const lowestProjected = useMemo(() => {
    const now = startOfDay(new Date());
    const futureData = drawdownData.filter(d => isAfter(d.date, now) || isSameDay(d.date, now));
    return futureData.length ? Math.min(...futureData.map(d => d.balance)) : 0;
  }, [drawdownData]);

  const isOverdrawnRisk = lowestProjected < 0;
  const trueDisposable = (parseFloat(currentBalance) || 0) - cycleTotals.unpaid + (cycleData?.incomeGroup.unpaid || 0);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!cycleData) return null;

  const renderItemRow = (exp) => (
      <Box component="tr" key={exp.key} onClick={() => setSelectedKeys(prev => prev.includes(exp.key) ? prev.filter(k => k !== exp.key) : [...prev, exp.key])} sx={{ cursor: 'pointer', opacity: exp.isPaid ? 0.6 : 1, '&:hover': { bgcolor: 'background.level1' } }} >
          <td style={{ width: 40, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}><Checkbox size="sm" checked={selectedKeys.includes(exp.key)} onChange={() => {}} /></td>
          <td><Stack direction="row" spacing={1.5} alignItems="center"><Avatar size="sm" sx={{ bgcolor: getEmojiColor(exp.label, isDark) }}>{exp.icon}</Avatar><Typography level="body-sm" fontWeight="bold">{exp.label}</Typography></Stack></td>
          <td style={{ width: 140 }}><Chip size="sm" variant="soft" color={getCategoryColor(exp.category)} sx={{ fontSize: '0.65rem' }}>{exp.category.replace('_', ' ')}</Chip></td>
          <td style={{ width: 160 }}><Typography level="body-xs" fontWeight="bold">{format(exp.computedDate, 'do MMM')}</Typography><Typography level="body-xs" color={getRelativeDateLabel(exp.computedDate).color}>{getRelativeDateLabel(exp.computedDate).label}</Typography></td>
          <td style={{ textAlign: 'right', width: 110 }} onClick={(e) => e.stopPropagation()}><Input size="sm" type="number" variant="soft" defaultValue={Number(exp.amount).toFixed(2)} onBlur={(e) => updateActualAmount(exp.key, e.target.value)} sx={{ width: 100, textAlign: 'right' }} slotProps={{ input: { step: '0.01', style: { textAlign: 'right' } } }} /></td>
          <td style={{ textAlign: 'center', width: 60 }} onClick={(e) => e.stopPropagation()}><Checkbox size="sm" variant="plain" checked={exp.isPaid} onChange={() => togglePaid(exp.key, exp.amount)} uncheckedIcon={<RadioButtonUnchecked />} checkedIcon={<CheckCircle color="success" />} /></td>
          <td style={{ textAlign: 'center', width: 60 }}><IconButton size="sm" variant="plain" color="danger" onClick={(e) => { e.stopPropagation(); confirmAction("Skip Item?", "Skip this month?", () => api.post(`/households/${householdId}/finance/budget-progress`, { cycle_start: cycleData.cycleKey, item_key: exp.key, is_paid: -1, actual_amount: 0, financial_profile_id: financialProfileId }).then(fetchData)); }}><Block fontSize="small" /></IconButton></td>
      </Box>
  );

  const renderSection = (group) => (
      <Accordion expanded={sectionsOpen[group.id] ?? true} onChange={() => setSectionsOpen(prev => ({ ...prev, [group.id]: !prev[group.id] }))} variant="outlined" sx={{ borderRadius: 'md', mb: 0.5, boxShadow: 'xs', overflow: 'hidden' }} key={group.id} >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ py: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', mr: 2, gap: 1.5 }}>
                  <Typography level="title-lg" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar size="sm" sx={{ bgcolor: 'background.level3' }}>{group.emoji}</Avatar> 
                      {group.label}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                      <Box sx={{ textAlign: 'center' }}><Typography level="body-xs">Total</Typography><Typography level="body-sm" fontWeight="bold">{formatCurrency(group.total)}</Typography></Box>
                      <Box sx={{ textAlign: 'center' }}><Typography level="body-xs" color="success">Paid</Typography><Typography level="body-sm" fontWeight="bold" color="success">{formatCurrency(group.paid)}</Typography></Box>
                      <Box sx={{ textAlign: 'center' }}><Typography level="body-xs" color="danger">Unpaid</Typography><Typography level="body-sm" fontWeight="bold" color="danger">{formatCurrency(group.unpaid)}</Typography></Box>
                  </Stack>
              </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0, bgcolor: 'background.surface' }}>
              <Table hoverRow sx={{ '--TableCell-paddingX': '16px', tableLayout: 'fixed', '& th': { bgcolor: 'background.level1' } }} >
                  <thead>
                      <tr>
                          <th style={{ width: 40 }}></th>
                          <th onClick={() => requestSort('label')} style={{ cursor: 'pointer' }}>Item</th>
                          <th style={{ width: 140 }}>Category</th>
                          <th onClick={() => requestSort('computedDate')} style={{ width: 160, cursor: 'pointer' }}>Due Date</th>
                          <th style={{ width: 110, textAlign: 'right' }}>Amount</th>
                          <th style={{ width: 60, textAlign: 'center' }}>Paid</th>
                          <th style={{ width: 60, textAlign: 'center' }}>Skip</th>
                      </tr>
                  </thead>
                  <tbody>{group.items.map(renderItemRow)}</tbody>
              </Table>
          </AccordionDetails>
      </Accordion>
  );

  const SummaryRow = (
    <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid xs={12} sm={6} md={3}>
            <Card variant="soft" color="primary" sx={{ p: 1.5, height: '100%', boxShadow: 'sm' }}>
                <Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', opacity: 0.8 }} startDecorator={<BankIcon />}>Liquidity</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, gap: 1 }}>
                    <Select 
                        variant="plain" size="sm" value={selectedAccountId} placeholder="Account..."
                        onChange={(e, val) => {
                            setSelectedAccountId(val);
                            const acc = currentAccounts.find(a => a.id === val);
                            if (acc) { setCurrentBalance(acc.current_balance); saveCycleData(actualPay, acc.current_balance, val); }
                            else { saveCycleData(actualPay, currentBalance, val); }
                        }}
                        sx={{ p: 0, '&:hover': { bgcolor: 'transparent' }, minHeight: 0, flex: 1, minWidth: 0 }}
                    >
                        <Option value={null}>Manual</Option>
                        {currentAccounts.map(acc => <Option key={acc.id} value={acc.id}>{acc.emoji} {acc.account_name}</Option>)}
                    </Select>
                    <Input 
                        variant="plain" size="sm" type="number" value={currentBalance}
                        onChange={(e) => setCurrentBalance(e.target.value)}
                        onBlur={(e) => saveCycleData(actualPay, e.target.value)}
                        sx={{ fontWeight: 'xl', fontSize: '1.25rem', p: 0, width: 120, '& input': { textAlign: 'right' }, bgcolor: 'transparent' }}
                        startDecorator={<Typography color="primary" fontWeight="bold">£</Typography>}
                    />
                </Box>
            </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
            <Card variant="soft" color="neutral" sx={{ p: 1.5, height: '100%', boxShadow: 'sm' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', opacity: 0.8 }}>Progress</Typography>
                    <Typography level="body-sm" fontWeight="bold">{Math.round((cycleTotals.paid / (cycleTotals.total || 1)) * 100)}%</Typography>
                </Box>
                <LinearProgress determinate value={(cycleTotals.paid / (cycleTotals.total || 1)) * 100} thickness={6} color="success" sx={{ mt: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography level="body-xs">Left: {formatCurrency(cycleTotals.unpaid)}</Typography>
                    <Typography level="body-xs" sx={{ opacity: 0.7 }}>Total: {formatCurrency(cycleTotals.total)}</Typography>
                </Box>
            </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
            <Card variant="soft" color="success" sx={{ p: 1.5, height: '100%', boxShadow: 'sm' }}>
                <Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', opacity: 0.8 }}>Income</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography level="h4">{formatCurrency(cycleData.incomeGroup.total)}</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography level="body-xs" color="success">Paid: {formatCurrency(cycleData.incomeGroup.paid)}</Typography>
                        <Typography level="body-xs" sx={{ opacity: 0.8 }}>Pending: {formatCurrency(cycleData.incomeGroup.unpaid)}</Typography>
                    </Box>
                </Box>
            </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
            <Card variant="soft" color={trueDisposable > 0 ? 'primary' : 'danger'} sx={{ p: 1.5, height: '100%', boxShadow: 'sm' }}>
                <Typography level="body-xs" fontWeight="bold" sx={{ textTransform: 'uppercase', opacity: 0.8 }}>Disposable</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography level="h4" color={lowestProjected > 0 ? 'success' : 'danger'}>{formatCurrency(Math.max(0, lowestProjected))}</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography level="body-xs">End: {formatCurrency(trueDisposable)}</Typography>
                        <Typography level="body-xs" sx={{ opacity: 0.8 }}>Low: {formatCurrency(lowestProjected)}</Typography>
                    </Box>
                </Box>
            </Card>
        </Grid>
    </Grid>
  );

  return (
    <Box sx={{ userSelect: 'none', pb: activeWidget ? 35 : 12 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}><ChevronLeft /></IconButton>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography level="h2" sx={{ fontWeight: 'lg', fontSize: '1.5rem' }}>{cycleData.label}</Typography>
                    <Typography level="body-xs" color="neutral">{format(cycleData.startDate, 'do MMM')} — {format(cycleData.endDate, 'do MMM')}</Typography>
                </Box>
                <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronRight /></IconButton>
            </Box>
            
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Input startDecorator={<Search />} placeholder="Search..." size="sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ width: 180 }} />
                <Select size="sm" value={filterEntity} onChange={(e, val) => setFilterEntity(val)} startDecorator={<FilterAlt />} sx={{ width: 160 }} >
                    <Option value="all">All Objects</Option>
                    <Divider />
                    {entityGroupsOptions.map((group, idx) => [
                        <Typography key={`label-${idx}`} level="body-xs" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>{group.label}</Typography>,
                        ...group.options.map(opt => <Option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</Option>)
                    ])}
                </Select>
                <Select size="sm" value={groupBy} onChange={(e, val) => setGroupBy(val)} startDecorator={<GroupWork />} sx={{ width: 160 }} >
                    <Option value="standard">Standard Split</Option>
                    <Option value="category">By Category</Option>
                    <Option value="date">By Date</Option>
                </Select>
                <Dropdown>
                    <MenuButton variant="solid" color="primary" size="sm" startDecorator={<Add />}>Add</MenuButton>
                    <Menu placement="bottom-end">
                        <MenuItem onClick={() => setAdhocIncomeOpen(true)}>Add Income</MenuItem>
                        <MenuItem onClick={() => setQuickAddOpen(true)}>Add Expense</MenuItem>
                        <MenuItem onClick={() => setRecurringAddOpen(true)}>Add Recurring</MenuItem>
                    </Menu>
                </Dropdown>
            </Stack>
        </Box>

        {SummaryRow}

        <Box sx={{ mb: 4 }}>{cycleData.groupList.map(renderSection)}</Box>

        {/* INTEGRATED WIDGET TRAY & BOTTOM BAR */}
        <Box sx={{ position: 'fixed', bottom: 0, left: { xs: 0, md: 'auto' }, right: 0, width: { xs: '100%', md: 'calc(100% - 240px)' }, zIndex: 1000 }}>
            {/* THE EXPANDABLE TRAY */}
            <Sheet 
                variant="outlined" 
                sx={{ 
                    maxHeight: activeWidget ? 300 : 0, 
                    overflow: 'hidden', 
                    transition: 'max-height 0.3s ease-in-out', 
                    bgcolor: 'background.surface', 
                    borderTop: activeWidget ? '1px solid' : 'none', 
                    borderColor: 'divider', 
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.1)' 
                }}
            >
                <Box sx={{ p: 2, position: 'relative' }}>
                    <IconButton 
                        size="sm" variant="plain" color="neutral" 
                        onClick={() => setActiveWidget(null)} 
                        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                    >
                        <Close />
                    </IconButton>

                    {activeWidget === 'projection' && (
                        <Box>
                            <Typography level="title-md" startDecorator={<TrendingDown />} sx={{ mb: 2 }}>Drawdown Projection</Typography>
                            <DrawdownChart data={drawdownData} limit={- (selectedAccountId ? currentAccounts.find(a => a.id === selectedAccountId)?.overdraft_limit || 0 : 0)} cycleStartDate={cycleData.startDate} cycleEndDate={cycleData.endDate} eventsPerDay={cycleData.eventsPerDay} />
                        </Box>
                    )}

                    {activeWidget === 'wealth' && (
                        <Box>
                            <Typography level="title-md" startDecorator={<SavingsIcon />} sx={{ mb: 2 }}>Wealth & Equity</Typography>
                            <Grid container spacing={3}>
                                <Grid xs={12} sm={6}>
                                    <Typography level="body-xs" fontWeight="bold">House Equity</Typography>
                                    <Typography level="title-lg">{formatCurrency(liabilities.house_details?.current_valuation - (liabilities.mortgages?.reduce((s, m) => s + (m.remaining_balance || 0), 0) || 0))}</Typography>
                                    <LinearProgress determinate value={50} color="primary" sx={{ mt: 1 }} />
                                </Grid>
                                <Grid xs={12} sm={6}>
                                    <Typography level="body-xs" fontWeight="bold">Pensions & Investments</Typography>
                                    <Typography level="title-lg">{formatCurrency(liabilities.pensions.reduce((s, p) => s + (p.current_value || 0), 0) + liabilities.investments.reduce((s, i) => s + (i.current_value || 0), 0))}</Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        {liabilities.pensions.map(p => <Chip key={p.id} size="sm">{p.provider}</Chip>)}
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {activeWidget === 'incomes' && (
                        <Box>
                            <Typography level="title-md" startDecorator={<Payments />} sx={{ mb: 2 }}>Income Sources</Typography>
                            <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
                                {cycleData.incomeGroup.items.map(inc => (
                                    <Box key={inc.key} sx={{ minWidth: 250 }}>
                                        <IncomeSourceCard inc={inc} onUpdate={updateActualAmount} onDelete={() => {}} />
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Box>
            </Sheet>

            {/* THE CONTROL BAR */}
            <Sheet 
                variant="outlined" 
                sx={{ 
                    bgcolor: 'background.surface', 
                    borderTop: '1px solid', 
                    borderColor: 'divider', 
                    p: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    boxShadow: 'lg'
                }}
            >
                <Stack direction="row" spacing={1}>
                    <Button 
                        variant={activeWidget === 'projection' ? "solid" : "plain"} 
                        color="primary" size="sm" 
                        startDecorator={<TrendingDown />} 
                        onClick={() => setActiveWidget(activeWidget === 'projection' ? null : 'projection')}
                    >
                        Projection
                    </Button>
                    <Button 
                        variant={activeWidget === 'wealth' ? "solid" : "plain"} 
                        color="warning" size="sm" 
                        startDecorator={<SavingsIcon />} 
                        onClick={() => setActiveWidget(activeWidget === 'wealth' ? null : 'wealth')}
                    >
                        Wealth
                    </Button>
                    <Button 
                        variant={activeWidget === 'incomes' ? "solid" : "plain"} 
                        color="success" size="sm" 
                        startDecorator={<Payments />} 
                        onClick={() => setActiveWidget(activeWidget === 'incomes' ? null : 'incomes')}
                    >
                        Incomes
                    </Button>
                </Stack>

                <Box sx={{ flex: 1, px: 4, display: { xs: 'none', sm: 'block' } }}>
                    <DrawdownChart mini data={drawdownData} limit={0} cycleStartDate={cycleData.startDate} cycleEndDate={cycleData.endDate} />
                </Box>

                <Box sx={{ textAlign: 'right', pr: 2 }}>
                    <Typography level="body-xs" fontWeight="bold">Disposable</Typography>
                    <Typography level="title-md" color={lowestProjected > 0 ? 'success' : 'danger'}>{formatCurrency(lowestProjected)}</Typography>
                </Box>
            </Sheet>
        </Box>

        {/* MODALS */}
        <Modal open={setupModalOpen} onClose={() => {}}>
            <ModalDialog>
                <DialogTitle>Budget Setup: {cycleData.label}</DialogTitle>
                <DialogContent>
                    <Typography level="body-sm" sx={{ mb: 2 }}>New cycle detected. How should we start?</Typography>
                    <Stack spacing={2}>
                        <Button size="lg" onClick={() => handleSetupBudget('fresh')}>Start Fresh</Button>
                        <Button size="lg" variant="soft" color="neutral" onClick={() => handleSetupBudget('copy')}>Copy Last Month</Button>
                    </Stack>
                </DialogContent>
            </ModalDialog>
        </Modal>
    </Box>
  );
}
