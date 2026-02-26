import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  Avatar,
  IconButton,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Input,
  FormControl,
  FormLabel,
  Stack,
  Chip,
  CircularProgress,
  Divider,
  Sheet,
  Table,
  Checkbox,
  LinearProgress,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  Select,
  Option,
  Tooltip,
} from '@mui/joy';
import {
  AccountBalanceWallet,
  CheckCircle,
  RadioButtonUnchecked,
  TrendingDown,
  Payments,
  Savings as SavingsIcon,
  Home,
  CreditCard,
  Assignment,
  ElectricBolt,
  AccountBalance as BankIcon,
  Add,
  Shield,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ArrowDropDown,
  RestartAlt,
  Receipt,
  DirectionsCar,
  DeleteForever,
  Sort,
  Search,
  Clear,
  ExpandMore,
  TrendingUp,
  Block,
  RequestQuote,
  FilterAlt,
  GroupWork,
  Warning,
  CalendarMonth,
  Restore,
} from '@mui/icons-material';
import {
  format,
  addMonths,
  startOfMonth,
  setDate,
  differenceInDays,
  isSameDay,
  isAfter,
  isBefore,
  startOfDay,
  isWithinInterval,
  parseISO,
  isValid,
  addYears,
  addWeeks,
  eachDayOfInterval,
  addDays,
} from 'date-fns';
import { getEmojiColor } from '../../utils/colors';
import AppSelect from '../../components/ui/AppSelect';
import EmojiPicker from '../../components/EmojiPicker';
import MetadataFormFields from '../../components/ui/MetadataFormFields';

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// --- DRAWDOWN CHART COMPONENT ---
const DrawdownChart = ({ data, limit, cycleStartDate, cycleEndDate, eventsPerDay }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.balance), 1000);
  const minVal = Math.min(...data.map((d) => d.balance), limit, -500);
  const range = maxVal - minVal;
  const height = 100;
  const width = 400;

  const now = startOfDay(new Date());

  // Scale Helpers
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
    <Box sx={{ width: '100%', mt: 1 }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        {/*
         */}{' '}
        <defs>
          <linearGradient id="chart-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: 'var(--joy-palette-primary-300)', stopOpacity: 0.1 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: 'var(--joy-palette-primary-300)', stopOpacity: 0 }}
            />
          </linearGradient>
        </defs>
        {/* Grid Lines */}
        <line
          x1="0"
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="var(--joy-palette-neutral-300)"
          strokeDasharray="4,2"
        />
        {limit < 0 && (
          <line
            x1="0"
            y1={limitY}
            x2={width}
            y2={limitY}
            stroke="var(--joy-palette-danger-200)"
            strokeDasharray="2,2"
          />
        )}
        {/* Event Markers (Tiny Dots at bottom) */}
        {Array.from(eventsPerDay?.keys() || []).map((dateStr) => {
          const parsed = dateStr ? parseISO(dateStr) : null;
          if (!parsed || !isValid(parsed)) return null;
          const x = getX(parsed);
          return (
            <circle
              key={dateStr}
              cx={x}
              cy={height - 5}
              r="2"
              fill="var(--joy-palette-neutral-400)"
              opacity={0.5}
            />
          );
        })}
        {/* Area Fill */}
        <polyline
          fill="url(#chart-area-grad)"
          points={`0,${height} ${points} ${width},${height}`}
        />
        {/* Main Line */}
        <polyline
          fill="none"
          stroke="var(--joy-palette-primary-500)"
          strokeWidth="2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Today Marker */}
        <line
          x1={todayX}
          y1="0"
          x2={todayX}
          y2={height}
          stroke="var(--joy-palette-warning-500)"
          strokeWidth="1.5"
          strokeDasharray="3,2"
        />
        {/* Today Focus Point */}
        {data.length > 0 && (
          <circle
            cx={todayX}
            cy={getY(data.find((d) => isSameDay(d.date, now))?.balance || data[0].balance)}
            r="4"
            fill="var(--joy-palette-warning-500)"
            stroke="#fff"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Legend / Key */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 2, bgcolor: 'primary.500' }} />
          <Typography level="body-xs">Balance Projection</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{ width: 12, height: 2, borderBottom: '2px dashed', borderColor: 'neutral.400' }}
          />
          <Typography level="body-xs">Zero Line</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{ width: 12, height: 2, borderBottom: '2px dashed', borderColor: 'warning.500' }}
          />
          <Typography level="body-xs">Today</Typography>
        </Box>
        {limit < 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{ width: 12, height: 2, borderBottom: '2px dashed', borderColor: 'danger.300' }}
            />
            <Typography level="body-xs">Overdraft Limit</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const getCategoryColor = (cat) => {
  const lower = (cat || '').toLowerCase();
  if (lower === 'income') return 'success';
  if (lower.includes('saving') || lower.includes('invest') || lower.includes('pension'))
    return 'success';
  if (
    lower.includes('bill') ||
    lower.includes('utility') ||
    lower.includes('council') ||
    lower.includes('water') ||
    lower.includes('energy')
  )
    return 'warning';
  if (lower.includes('food') || lower.includes('grocer') || lower.includes('dining'))
    return 'success';
  if (lower.includes('insur') || lower.includes('health') || lower.includes('life'))
    return 'danger';
  if (lower.includes('loan') || lower.includes('mortgage') || lower.includes('finance'))
    return 'danger';
  if (
    lower.includes('sub') ||
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('amazon')
  )
    return 'info';
  if (lower.includes('car') || lower.includes('transport') || lower.includes('fuel'))
    return 'primary';
  return 'neutral';
};

const getRelativeDateLabel = (date) => {
  const now = startOfDay(new Date());
  const d = startOfDay(date);
  const diff = differenceInDays(d, now);

  if (diff === 0) return { label: 'Today', color: 'warning' };
  if (diff === 1) return { label: 'Tomorrow', color: 'primary' };
  if (diff > 1 && diff < 7) return { label: `In ${diff} days`, color: 'neutral' };
  if (diff >= 7) return { label: `In ${Math.floor(diff / 7)}w ${diff % 7}d`, color: 'neutral' };
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
    <Card
      variant="outlined"
      size="sm"
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'row',
        gap: 1.5,
        borderColor: inc.isPaid ? 'success.300' : 'divider',
        bgcolor: inc.isPaid ? 'success.softBg' : 'background.surface',
        boxShadow: 'xs',
      }}
    >
      <Avatar
        size="sm"
        variant="soft"
        color={inc.isPaid ? 'success' : 'neutral'}
        sx={{
          mt: 0.5,
          bgcolor: inc.isPaid ? 'success.solidBg' : undefined,
          color: inc.isPaid ? '#fff' : undefined,
        }}
      >
        {inc.icon}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          level="title-sm"
          sx={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.3 }}
        >
          {inc.label}
        </Typography>
        {isEditing ? (
          <Input
            type="date"
            size="sm"
            variant="plain"
            value={tempDate}
            onChange={(e) => setTempDate(e.target.value)}
            sx={{ fontSize: 'xs', p: 0, mt: -0.5 }}
          />
        ) : (
          <Typography level="body-xs" color="neutral">
            {format(inc.computedDate, 'do MMM')}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          textAlign: 'right',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 0.5,
        }}
      >
        {isEditing ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Input
              size="sm"
              type="number"
              variant="outlined"
              autoFocus
              value={tempAmount}
              onChange={(e) => setTempAmount(e.target.value)}
              sx={{ width: 70, fontWeight: 'bold' }}
              slotProps={{ input: { step: '0.01', style: { textAlign: 'right', padding: '4px' } } }}
            />
            <IconButton size="sm" color="success" onClick={handleSave}>
              <CheckCircle sx={{ fontSize: '1.2rem' }} />
            </IconButton>
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              level="title-sm"
              fontWeight="bold"
              color={inc.isPaid ? 'success.700' : 'neutral.700'}
            >
              {formatCurrency(inc.amount)}
            </Typography>
            {!inc.isPaid && (
              <IconButton size="sm" variant="plain" onClick={() => setIsEditing(true)}>
                <CalendarMonth sx={{ fontSize: '1rem', opacity: 0.6 }} />
              </IconButton>
            )}
            {inc.frequency === 'one_off' && (
              <IconButton
                size="sm"
                variant="plain"
                color="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(inc.id);
                }}
              >
                <DeleteForever sx={{ fontSize: '1rem' }} />
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
  const {
    api,
    id: householdId,
    isDark,
    showNotification,
    members = [],
    setStatusBarData,
    confirmAction,
  } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(new Set());
  const [viewDate, setViewDate] = useState(new Date());
  const [bankHolidays, setBankHolidays] = useState([]);
  const [hidePaid, setHidePaid] = useState(false);

  const [incomes, setIncomes] = useState([]);
  const [progress, setProgress] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [currentAccounts, setCurrentAccounts] = useState([]);

  const [liabilities, setLiabilities] = useState({
    recurring_costs: [],
    credit_cards: [],
    pensions: [],
    vehicles: [],
    assets: [],
    savings: [],
    investments: [],
    mortgages: [],
    vehicle_finance: [],
    house_details: {},
  });
  const [savingsPots, setSavingsPots] = useState([]);
  const [calendarDates, setCalendarDates] = useState([]);

  // Sections State
  const [sectionsOpen, setSectionsOpen] = useState({
    income: true,
    bills: true,
    finance: true,
    wealth: true,
    skipped: true,
    birthdays: true,
  });
  const [groupBy, setGroupBy] = useState('standard'); // standard, category, object, date
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

  // Emoji Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('💰');

  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!financialProfileId) return;
      if (!silent) setLoading(true);
      try {
        const q = `?financial_profile_id=${financialProfileId}`;
        const [
          incRes,
          progRes,
          cycleRes,
          recurringRes,
          ccRes,
          pensionRes,
          potRes,
          holidayRes,
          vehRes,
          assetRes,
          saveRes,
          invRes,
          accountRes,
          dateRes,
          mortRes,
          vFinRes,
          detailRes,
        ] = await Promise.all([
          api.get(`/households/${householdId}/finance/income${q}`),
          api.get(`/households/${householdId}/finance/budget-progress${q}`),
          api.get(`/households/${householdId}/finance/budget-cycles${q}`),
          api.get(`/households/${householdId}/finance/recurring-costs${q}`),
          api.get(`/households/${householdId}/finance/credit-cards${q}`),
          api.get(`/households/${householdId}/finance/pensions${q}`),
          api.get(`/households/${householdId}/finance/savings/pots${q}`), // Should ideally filter by savings that belong to profile
          api.get(`/system/holidays`),
          api.get(`/households/${householdId}/vehicles`),
          api.get(`/households/${householdId}/assets`),
          api.get(`/households/${householdId}/finance/savings${q}`),
          api.get(`/households/${householdId}/finance/investments${q}`),
          api.get(`/households/${householdId}/finance/current-accounts${q}`),
          api.get(`/households/${householdId}/dates`),
          api.get(`/households/${householdId}/finance/mortgages${q}`),
          api.get(`/households/${householdId}/finance/vehicle-finance${q}`),
          api.get(`/households/${householdId}/details`),
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
          house_details: detailRes.data || {},
        });
        // Filter pots client side if needed, but for now assume savings accounts are filtered so pots are relevant
        setSavingsPots(potRes.data || []);
        setBankHolidays(holidayRes.data || []);
        setCalendarDates(dateRes.data || []);
      } catch (err) {
        console.error('Failed to fetch budget data', err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [api, householdId, financialProfileId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAdhoc = () => {
    setSelectedEmoji('💰');
    setAdhocIncomeOpen(true);
  };

  const handleOpenQuickAdd = () => {
    setSelectedEmoji('🧾');
    setQuickAddOpen(true);
  };

  const handleOpenRecurring = () => {
    setSelectedEmoji('🔄');
    setRecurringCategory('other');
    setRecurringMetadata({});
    setRecurringAddOpen(true);
  };

  const handleEmojiSelect = (emoji) => {
    setSelectedEmoji(emoji);
    setPickerOpen(false);
  };

  // --- Helper Logic (Date Projection) ---
  const getNextWorkingDay = useCallback(
    (date) => {
      let d = new Date(date);
      const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
      const isHoliday = (day) => bankHolidays.includes(format(day, 'yyyy-MM-dd'));
      while (isWeekend(d) || isHoliday(d)) {
        d.setDate(d.getDate() + 1);
      }
      return d;
    },
    [bankHolidays]
  );

  const getPriorWorkingDay = useCallback(
    (date) => {
      let d = new Date(date);
      const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
      const isHoliday = (day) => bankHolidays.includes(format(day, 'yyyy-MM-dd'));
      while (isWeekend(d) || isHoliday(d)) {
        d.setDate(d.getDate() - 1);
      }
      return d;
    },
    [bankHolidays]
  );

  const getAdjustedDate = useCallback(
    (input, useNwd, cycleStartDate) => {
      if (!input) return null;
      let d;
      if (input instanceof Date) {
        d = input;
      } else {
        d = setDate(startOfMonth(new Date(cycleStartDate)), parseInt(input));
        if (isAfter(cycleStartDate, d)) {
          d = addMonths(d, 1);
        }
      }
      return useNwd ? getNextWorkingDay(d) : d;
    },
    [getNextWorkingDay]
  );

  const entityGroupsOptions = useMemo(() => {
    return [
      {
        label: 'General',
        options: [{ value: 'household:null', label: 'Household (General)', emoji: '🏠' }],
      },
      {
        label: 'People',
        options: members
          .filter((m) => m.type !== 'pet')
          .map((m) => ({ value: `member:${m.id}`, label: m.name, emoji: m.emoji || '👤' })),
      },
      {
        label: 'Pets',
        options: members
          .filter((m) => m.type === 'pet')
          .map((p) => ({ value: `pet:${p.id}`, label: p.name, emoji: p.emoji || '🐾' })),
      },
      {
        label: 'Vehicles',
        options: liabilities.vehicles.map((v) => ({
          value: `vehicle:${v.id}`,
          label: `${v.make} ${v.model}`,
          emoji: v.emoji || '🚗',
        })),
      },
      {
        label: 'Assets',
        options: liabilities.assets.map((a) => ({
          value: `asset:${a.id}`,
          label: a.name,
          emoji: a.emoji || '📦',
        })),
      },
    ].filter((g) => g.options.length > 0);
  }, [members, liabilities]);

  const getCategoryOptions = useCallback(
    (entityString) => {
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
        { value: 'other', label: 'Other' },
      ];

      const VEHICLE_CATS = [
        { value: 'vehicle_fuel', label: 'Fuel' },
        { value: 'vehicle_tax', label: 'Tax' },
        { value: 'vehicle_mot', label: 'MOT' },
        { value: 'vehicle_service', label: 'Service / Plan' },
        { value: 'vehicle_breakdown', label: 'Breakdown' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'vehicle_finance', label: 'Finance' },
        { value: 'other', label: 'Other' },
      ];

      const ADULT_CATS = [
        { value: 'fun_money', label: 'Fun Money' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'insurance', label: 'Life/Health Insurance' },
        { value: 'education', label: 'Education' },
        { value: 'care', label: 'Care & Support' },
        { value: 'loan', label: 'Loan' },
        { value: 'other', label: 'Other' },
      ];

      const CHILD_CATS = [
        { value: 'pocket_money', label: 'Pocket Money' },
        { value: 'subscription', label: 'Subscription' },
        { value: 'education', label: 'Education' },
        { value: 'care', label: 'Care & Support' },
        { value: 'other', label: 'Other' },
      ];

      const PET_CATS = [
        { value: 'food', label: 'Food & Supplies' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'vet', label: 'Vet & Medical' },
        { value: 'other', label: 'Other' },
      ];

      if (type === 'vehicle') return VEHICLE_CATS;
      if (type === 'member') {
        const m = members.find((mem) => String(mem.id) === String(id));
        if (m && m.type === 'child') return CHILD_CATS;
        return ADULT_CATS;
      }
      if (type === 'pet') return PET_CATS;
      return HOUSEHOLD_CATS;
    },
    [members]
  );

  const playFeedback = useCallback((type = 'success') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      const now = audioCtx.currentTime;

      if (type === 'success') {
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
      } else {
        oscillator.frequency.setValueAtTime(660, now);
        oscillator.frequency.exponentialRampToValueAtTime(330, now + 0.1);
      }

      // Increased volume for better visibility
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.3);

      setTimeout(() => {
        audioCtx.close();
      }, 350);
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  }, []);

  const cycleData = useMemo(() => {
    const primaryIncome =
      incomes.find((i) => i.is_primary === 1) || incomes.find((i) => i.payment_day > 0);
    if (!primaryIncome || !primaryIncome.payment_day) return null;

    const payday = parseInt(primaryIncome.payment_day);
    let rawStartDate =
      viewDate.getDate() >= payday
        ? setDate(startOfMonth(viewDate), payday)
        : setDate(startOfMonth(addMonths(viewDate, -1)), payday);

    const startDate = getPriorWorkingDay(rawStartDate);
    const endDate = getPriorWorkingDay(addMonths(rawStartDate, 1));
    const cycleKey = format(startDate, 'yyyy-MM-dd');
    const budgetLabelDate =
      rawStartDate.getDate() >= 20 ? addMonths(rawStartDate, 1) : rawStartDate;
    const label = format(budgetLabelDate, 'MMMM yyyy') + ' Budget';
    const cycleDuration = differenceInDays(endDate, startDate);

    const now = startOfDay(new Date());
    let progressPct = 0;
    let daysRemaining = differenceInDays(endDate, now);
    if (isSameDay(now, startDate) || isAfter(now, startDate)) {
      progressPct = Math.min((differenceInDays(now, startDate) / cycleDuration) * 100, 100);
    }
    if (daysRemaining < 0) daysRemaining = 0;

    // Optimisation: Create a Map for O(1) lookup of progress items
    const progressMap = new Map();
    progress.forEach((p) => {
      if (p.cycle_start === cycleKey) {
        progressMap.set(p.item_key, p);
      }
    });

    const groups = {
      events: { id: 'events', label: 'Events & Holidays', items: [], order: -1, emoji: '📅' },
      bills: { id: 'bills', label: 'Household Bills', items: [], order: 0, emoji: '🏠' },
      finance: { id: 'finance', label: 'Finance & Debts', items: [], order: 5, emoji: '💳' },
      wealth: { id: 'wealth', label: 'Savings & Growth', items: [], order: 999, emoji: '📈' },
    };

    const getGroup = (groupId, groupLabel, emoji, order = 10) => {
      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          label: groupLabel || 'Other',
          items: [],
          order,
          emoji: emoji || '❓',
        };
      }
      return groups[groupId];
    };

    const skipped = [];
    const incomesCollected = [];
    const eventsPerDay = new Map(); // For progress bar
    const lowerSearch = searchQuery.toLowerCase();

    const addExpense = (
      item,
      type,
      label,
      amount,
      dateObj,
      icon,
      category,
      targetGroupKey,
      object = null
    ) => {
      if (!dateObj || !isValid(dateObj)) return;
      if (
        searchQuery &&
        !label.toLowerCase().includes(lowerSearch) &&
        !category.toLowerCase().includes(lowerSearch)
      )
        return;

      // Entity Filter Check
      if (filterEntity && filterEntity !== 'all') {
        const [fType, fId] = (filterEntity || 'household:null').split(':');
        const itemType = object?.type || (type === 'credit_card' ? 'household' : 'household');
        const itemId = String(object?.id || 'null');
        if (fType !== itemType || fId !== itemId) {
          // If it's a direct recurring cost, check its object_type/id
          if (item.object_type !== fType || String(item.object_id || 'null') !== fId) return;
        }
      }

      // Account Filter Check
      if (filterAccount && filterAccount !== 'all') {
        const accountId = item.bank_account_id;
        if (String(accountId || 'null') !== String(filterAccount)) return;
      }

      const key = `${type}_${item.id || 'fixed'}_${format(dateObj, 'ddMM')}`;
      // O(1) Lookup
      const progressItem = progressMap.get(key);

      if (hidePaid && progressItem?.is_paid === 1) return;

      const effectiveDate =
        progressItem?.actual_date && typeof progressItem.actual_date === 'string'
          ? parseISO(progressItem.actual_date)
          : dateObj;

      const expObj = {
        key,
        type,
        label: label || 'Unnamed Item',
        amount: progressItem?.actual_amount || parseFloat(amount) || 0,
        day: effectiveDate.getDate(),
        computedDate: effectiveDate,
        icon,
        category: category || 'other',
        isPaid: progressItem?.is_paid === 1,
        isDeletable: true,
        id: item.id,
        object: object || {},
        frequency: item.frequency || 'monthly',
      };

      if (['birthday', 'holiday', 'celebration'].includes(type)) {
        const dayStr = format(dateObj, 'yyyy-MM-dd');
        if (!eventsPerDay.has(dayStr)) eventsPerDay.set(dayStr, []);
        eventsPerDay.get(dayStr).push(expObj);
      }

      if (progressItem?.is_paid === -1) {
        skipped.push(expObj);
      } else {
        // Special Case: Incomes go to their own collector
        if (targetGroupKey === 'income') {
          incomesCollected.push(expObj);
          return; // Don't add to main groups
        }

        let finalGroupKey = targetGroupKey;

        if (groupBy === 'category') {
          finalGroupKey = `cat_${category}`;
          getGroup(
            finalGroupKey,
            category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' '),
            '📂'
          );
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
          else if (['birthday', 'holiday', 'celebration'].includes(type)) finalGroupKey = 'events';
          else finalGroupKey = financeCats.includes(category) ? 'finance' : 'bills';
        }

        groups[finalGroupKey].items.push(expObj);
      }
    };

    // --- INCOMES ---
    incomes.forEach((inc) => {
      const d = getAdjustedDate(inc.payment_day, inc.nearest_working_day === 1, startDate);
      const member = members.find((m) => m.id === inc.member_id);
      addExpense(
        inc,
        'income',
        `${inc.employer} Pay`,
        inc.amount,
        d,
        <Payments />,
        'income',
        'income',
        member
          ? { type: 'member', id: member.id, name: member.first_name, emoji: member.emoji }
          : null
      );
    });

    // --- BANK HOLIDAYS ---
    (bankHolidays || []).forEach((hDate) => {
      if (!hDate || typeof hDate !== 'string') return;
      const d = parseISO(hDate);
      if (isValid(d) && isWithinInterval(d, { start: startDate, end: endDate })) {
        addExpense({ id: hDate }, 'holiday', 'Bank Holiday', 0, d, '🏦', 'holiday', 'events');
      }
    });

    // --- FIXED CELEBRATIONS ---
    const FIXED_CELEBRATIONS = [
      { name: "Valentine's Day", month: 2, day: 14, emoji: '❤️' },
      { name: "St Patrick's Day", month: 3, day: 17, emoji: '☘️' },
      { name: 'Halloween', month: 10, day: 31, emoji: '🎃' },
      { name: 'Bonfire Night', month: 11, day: 5, emoji: '🎆' },
      { name: 'Christmas Eve', month: 12, day: 24, emoji: '🎄' },
      { name: 'Christmas Day', month: 12, day: 25, emoji: '🎅' },
      { name: 'Boxing Day', month: 12, day: 26, emoji: '🎁' },
      { name: "New Year's Eve", month: 12, day: 31, emoji: '🥂' },
      { name: "New Year's Day", month: 1, day: 1, emoji: '🎆' },
    ];

    FIXED_CELEBRATIONS.forEach((c) => {
      const yearsToTry = [startDate.getFullYear(), endDate.getFullYear()];
      const uniqueYears = [...new Set(yearsToTry)];
      uniqueYears.forEach((year) => {
        const d = new Date(year, c.month - 1, c.day);
        if (isValid(d) && isWithinInterval(d, { start: startDate, end: endDate })) {
          addExpense(
            { id: `fixed_${c.name}` },
            'celebration',
            c.name,
            0,
            d,
            c.emoji,
            'celebration',
            'events'
          );
        }
      });
    });

    // --- BIRTHDAYS (Members) ---
    members.forEach((m) => {
      if (!m.dob || typeof m.dob !== 'string') return;
      const dob = parseISO(m.dob);
      if (!isValid(dob)) return;

      // Project birthday into the current cycle's years
      const yearsToTry = [startDate.getFullYear(), endDate.getFullYear()];
      const uniqueYears = [...new Set(yearsToTry)];

      uniqueYears.forEach((year) => {
        const bday = new Date(year, dob.getMonth(), dob.getDate());
        if (isWithinInterval(bday, { start: startDate, end: endDate })) {
          addExpense(
            m,
            'birthday',
            `${m.alias || m.name}'s Birthday`,
            0,
            bday,
            '🎂',
            'birthday',
            'events',
            { type: 'member', id: m.id, name: m.name, emoji: m.emoji || '👤' }
          );
        }
      });
    });

    // --- BIRTHDAYS & EVENTS (Calendar) ---
    (calendarDates || []).forEach((date) => {
      if (!date.date || typeof date.date !== 'string') return;
      const d = parseISO(date.date);
      if (!isValid(d)) return;

      if (date.type === 'birthday') {
        // Only add if not already linked to a member (to avoid duplicates)
        if (date.member_id || date.parent_id) return;

        // Project birthday into current cycle years
        const yearsToTry = [startDate.getFullYear(), endDate.getFullYear()];
        const uniqueYears = [...new Set(yearsToTry)];
        uniqueYears.forEach((year) => {
          const bday = new Date(year, d.getMonth(), d.getDate());
          if (isWithinInterval(bday, { start: startDate, end: endDate })) {
            addExpense(date, 'birthday', date.title, 0, bday, '🎂', 'birthday', 'events');
          }
        });
      } else if (isWithinInterval(d, { start: startDate, end: endDate })) {
        addExpense(
          date,
          'calendar_event',
          date.title,
          0,
          d,
          date.emoji || '📅',
          date.type || 'other',
          'events'
        );
      }
    });

    // --- CONSOLIDATED RECURRING COSTS ---
    liabilities.recurring_costs
      .filter((c) => c.is_active !== 0)
      .forEach((charge) => {
        let datesToAdd = [];
        const freq = charge.frequency?.toLowerCase();
        const anchor =
          charge.start_date && typeof charge.start_date === 'string'
            ? parseISO(charge.start_date)
            : null;

        if (freq === 'one_off') {
          const dateStr = charge.exact_date || charge.start_date;
          if (dateStr && typeof dateStr === 'string') {
            const oneOffDate = parseISO(dateStr);
            if (isWithinInterval(oneOffDate, { start: startDate, end: endDate }))
              datesToAdd.push(oneOffDate);
          }
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
            datesToAdd.push(
              charge.adjust_for_working_day ? getNextWorkingDay(current) : new Date(current)
            );
            if (freq === 'weekly') current = addWeeks(current, 1);
            else if (freq === 'monthly') current = addMonths(current, 1);
            else if (freq === 'quarterly') current = addMonths(current, 3);
            else if (freq === 'yearly') current = addYears(current, 1);
            else break;
          }
        } else if (freq === 'monthly' && charge.day_of_month) {
          datesToAdd.push(
            getAdjustedDate(charge.day_of_month, charge.adjust_for_working_day, startDate)
          );
        }

        let icon = <Receipt />;
        const cat = charge.category_id;
        if (cat === 'mortgage') icon = <Home />;
        else if (cat === 'loan') icon = <RequestQuote />;
        else if (cat === 'insurance') icon = <Shield />;
        else if (cat === 'subscription') icon = <ShoppingBag />;
        else if (cat?.includes('utility') || cat === 'water' || cat === 'energy')
          icon = <ElectricBolt />;
        else if (cat?.includes('vehicle')) icon = <DirectionsCar />;
        else if (cat === 'credit_card') icon = <CreditCard />;
        else if (cat === 'income') icon = <Payments />;

        let objectInfo = null;
        if (charge.object_type === 'member') {
          const m = members.find((mem) => String(mem.id) === String(charge.object_id));
          if (m) objectInfo = { type: 'member', id: m.id, name: m.name, emoji: m.emoji || '👤' };
        } else if (charge.object_type === 'vehicle') {
          const v = liabilities.vehicles.find((veh) => String(veh.id) === String(charge.object_id));
          if (v)
            objectInfo = {
              type: 'vehicle',
              id: v.id,
              name: `${v.make} ${v.model}`,
              emoji: v.emoji || '🚗',
            };
        } else if (charge.object_type === 'asset') {
          const a = liabilities.assets.find(
            (asset) => String(asset.id) === String(charge.object_id)
          );
          if (a) objectInfo = { type: 'asset', id: a.id, name: a.name, emoji: a.emoji || '📦' };
        } else if (charge.object_type === 'pet') {
          const p = members.find(
            (mem) => String(mem.id) === String(charge.object_id) && mem.type === 'pet'
          );
          if (p) objectInfo = { type: 'pet', id: p.id, name: p.name, emoji: p.emoji || '🐾' };
        }

        datesToAdd.forEach((d) => {
          addExpense(
            charge,
            'recurring',
            charge.name,
            charge.amount,
            d,
            icon,
            charge.category_id,
            charge.category_id === 'income' ? 'income' : 'bills',
            objectInfo
          );
        });
      });

    liabilities.credit_cards.forEach((cc) =>
      addExpense(
        cc,
        'credit_card',
        `${cc.card_name}`,
        0,
        getAdjustedDate(cc.payment_day || 1, true, startDate),
        <CreditCard />,
        'credit_card',
        'finance'
      )
    );

    // 6. WEALTH items
    liabilities.savings.forEach((s) => {
      const hasPots = savingsPots.some((pot) => String(pot.savings_id) === String(s.id));
      if (!hasPots) {
        addExpense(
          s,
          'savings_deposit',
          `${s.institution} ${s.account_name}`,
          s.deposit_amount || 0,
          getAdjustedDate(s.deposit_day || 1, false, startDate),
          <SavingsIcon />,
          'savings',
          'wealth'
        );
      }
    });
    liabilities.pensions.forEach((p) =>
      addExpense(
        p,
        'pension',
        `${p.provider} Pension`,
        p.monthly_contribution || 0,
        getAdjustedDate(p.payment_day || 1, true, startDate),
        <Assignment />,
        'pension',
        'wealth'
      )
    );
    liabilities.investments.forEach((i) =>
      addExpense(
        i,
        'investment',
        `${i.name} Investment`,
        i.monthly_contribution || 0,
        getAdjustedDate(i.payment_day || 1, true, startDate),
        <TrendingUp />,
        'investment',
        'wealth'
      )
    );
    savingsPots.forEach((pot) =>
      addExpense(
        pot,
        'pot',
        pot.name,
        0,
        getAdjustedDate(pot.deposit_day || 1, false, startDate),
        <SavingsIcon />,
        'savings',
        'wealth'
      )
    );

    const sorter = (a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === 'computedDate') {
        valA = a.computedDate.getTime();
        valB = b.computedDate.getTime();
      }
      if (typeof valA === 'string')
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    };

    const groupList = Object.values(groups)
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.order - b.order);
    groupList.forEach((g) => {
      g.items.sort(sorter);
      g.total = g.items.reduce((sum, i) => sum + i.amount, 0);
      g.paid = g.items.filter((i) => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
      g.unpaid = g.total - g.paid;
    });

    incomesCollected.sort(sorter);
    const incomeGroup = {
      id: 'income',
      label: 'Incomes',
      items: incomesCollected,
      total: incomesCollected.reduce((sum, i) => sum + i.amount, 0),
      paid: incomesCollected.filter((i) => i.isPaid).reduce((sum, i) => sum + i.amount, 0),
      unpaid: incomesCollected.reduce((sum, i) => sum + (i.isPaid ? 0 : i.amount), 0),
    };

    return {
      startDate,
      endDate,
      label,
      cycleKey,
      progressPct,
      daysRemaining,
      cycleDuration,
      groupList,
      skipped,
      budgetLabelDate,
      incomeGroup,
      eventsPerDay,
    };
  }, [
    incomes,
    liabilities,
    progress,
    viewDate,
    getPriorWorkingDay,
    getAdjustedDate,
    savingsPots,
    getNextWorkingDay,
    members,
    sortConfig,
    searchQuery,
    groupBy,
    filterEntity,
    filterAccount,
    hidePaid,
    calendarDates,
    bankHolidays,
  ]);

  const currentCycleRecord = useMemo(
    () => cycles.find((c) => c.cycle_start === cycleData?.cycleKey),
    [cycles, cycleData]
  );

  useEffect(() => {
    if (cycleData && !loading) {
      if (currentCycleRecord) {
        setActualPay(currentCycleRecord.actual_pay);
        setCurrentBalance(currentCycleRecord.current_balance);
        setSelectedAccountId(currentCycleRecord.bank_account_id || null);
        setSetupModalOpen(false);
      } else {
        setSetupModalOpen(true);
      }
    }
  }, [currentCycleRecord, cycleData, loading]);

  const projectedIncomeTotal = useMemo(() => {
    if (!cycleData) return 0;
    return cycleData.incomeGroup.total;
  }, [cycleData]);

  const handleSetupBudget = async (mode) => {
    let initialPay = projectedIncomeTotal;
    let initialBalance = projectedIncomeTotal;
    let initialAccountId = null;

    if (mode === 'copy') {
      const sortedCycles = [...cycles].sort((a, b) => b.cycle_start.localeCompare(a.cycle_start));
      const lastRecord = sortedCycles.find((c) => c.cycle_start < cycleData.cycleKey);
      if (lastRecord) {
        initialPay = lastRecord.actual_pay;
        initialBalance = lastRecord.actual_pay;
        initialAccountId = lastRecord.bank_account_id;
      }
    }
    await saveCycleData(initialPay, initialBalance, initialAccountId);
    setSetupModalOpen(false);
  };

  const saveCycleData = async (pay, balance, accountId = selectedAccountId) => {
    if (!cycleData) return;
    try {
      await api.post(`/households/${householdId}/finance/budget-cycles`, {
        cycle_start: cycleData.cycleKey,
        actual_pay: parseFloat(pay) || 0,
        current_balance: parseFloat(balance) || 0,
        bank_account_id: accountId,
        financial_profile_id: financialProfileId,
      });
      const res = await api.get(
        `/households/${householdId}/finance/budget-cycles?financial_profile_id=${financialProfileId}`
      );
      setCycles(res.data || []);
    } catch (err) {
      console.error('Failed to save cycle data', err);
    }
  };

  const updateActualAmount = async (itemKey, amount, actualDate = null, isPaidOverride = null) => {
    const progressItem = progress.find(
      (p) => p.item_key === itemKey && p.cycle_start === cycleData?.cycleKey
    );
    const isPaid =
      isPaidOverride !== null
        ? isPaidOverride
          ? 1
          : 0
        : progressItem
          ? progressItem.is_paid || 0
          : 0;
    try {
      await api.post(`/households/${householdId}/finance/budget-progress`, {
        cycle_start: cycleData.cycleKey,
        item_key: itemKey,
        is_paid: isPaid,
        actual_amount: parseFloat(amount) || 0,
        actual_date: actualDate,
        financial_profile_id: financialProfileId,
      });
      fetchData(true);
    } catch (err) {
      console.error('Failed to update actual amount', err);
    }
  };

  const togglePaid = async (itemKey, amount = 0) => {
    if (savingProgress.has(itemKey)) return;

    const currentProgress = [...progress];
    const existingItemIndex = currentProgress.findIndex(
      (p) => p.item_key === itemKey && p.cycle_start === cycleData.cycleKey
    );
    const isCurrentlyPaid =
      existingItemIndex !== -1 && currentProgress[existingItemIndex].is_paid === 1;

    // Optimistic Update
    let newProgress;
    if (isCurrentlyPaid) {
      playFeedback('undo');
      newProgress = currentProgress.filter((_, i) => i !== existingItemIndex);
    } else {
      playFeedback('success');
      const newItem = {
        cycle_start: cycleData.cycleKey,
        item_key: itemKey,
        is_paid: 1,
        actual_amount: amount,
      };
      if (existingItemIndex !== -1) {
        newProgress = [...currentProgress];
        newProgress[existingItemIndex] = newItem;
      } else {
        newProgress = [...currentProgress, newItem];
      }
    }
    setProgress(newProgress);
    setSavingProgress((prev) => new Set(prev).add(itemKey));

    try {
      if (isCurrentlyPaid) {
        await api.delete(
          `/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}?financial_profile_id=${financialProfileId}`
        );
      } else {
        await api.post(`/households/${householdId}/finance/budget-progress`, {
          cycle_start: cycleData.cycleKey,
          item_key: itemKey,
          is_paid: 1,
          actual_amount: amount,
          financial_profile_id: financialProfileId,
        });
      }
      fetchData(true);
    } catch (err) {
      console.error('Failed to toggle paid status', err);
      // Revert on error
      setProgress(currentProgress);
      showNotification('Failed to update status.', 'danger');
    } finally {
      setSavingProgress((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleResetCycle = () => {
    confirmAction('Reset Month?', 'Are you sure? This clears progress.', async () => {
      try {
        await api.delete(
          `/households/${householdId}/finance/budget-cycles/${cycleData.cycleKey}?financial_profile_id=${financialProfileId}`
        );
        showNotification('Budget cycle reset.', 'success');
        fetchData();
      } catch {
        showNotification('Failed to reset cycle.', 'danger');
      }
    });
  };

  const handleDeleteRecurringCost = (id) => {
    confirmAction('Delete Item?', 'Permanently remove this item from the database?', async () => {
      try {
        await api.delete(`/households/${householdId}/finance/recurring-costs/${id}`);
        showNotification('Item deleted.', 'success');
        fetchData();
      } catch {
        showNotification('Failed.', 'danger');
      }
    });
  };

  const handleDisableItem = (itemKey, frequency = 'monthly', id = null) => {
    if (frequency === 'one_off' && id) {
      handleDeleteRecurringCost(id);
      return;
    }

    confirmAction('Disable Item?', "Remove from this month's budget?", async () => {
      try {
        await api.post(`/households/${householdId}/finance/budget-progress`, {
          cycle_start: cycleData.cycleKey,
          item_key: itemKey,
          is_paid: -1,
          actual_amount: 0,
          financial_profile_id: financialProfileId,
        });
        showNotification('Item skipped.', 'success');
        fetchData(true);
      } catch {
        showNotification('Failed.', 'danger');
      }
    });
  };

  const handleRestoreItem = async (itemKey) => {
    try {
      await api.delete(
        `/households/${householdId}/finance/budget-progress/${cycleData.cycleKey}/${itemKey}?financial_profile_id=${financialProfileId}`
      );
      showNotification('Item restored.', 'success');
      fetchData(true);
    } catch {
      showNotification('Failed.', 'danger');
    }
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
      adjust_for_working_day: 1,
      bank_account_id: data.bank_account_id || null,
      financial_profile_id: financialProfileId || null,
      emoji: selectedEmoji,
    };
    try {
      await api.post(`/households/${householdId}/finance/recurring-costs`, payload);
      showNotification('Expense added.', 'success');
      fetchData();
      setQuickAddOpen(false);
    } catch {
      showNotification('Failed.', 'danger');
    }
  };

  const handleAdhocIncome = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const payload = {
      name: data.name,
      amount: parseFloat(data.amount) || 0,
      frequency: 'one_off',
      start_date: data.start_date,
      category_id: 'income',
      object_type: 'household',
      object_id: null,
      adjust_for_working_day: 1,
      bank_account_id: data.bank_account_id || null,
      financial_profile_id: financialProfileId || null,
      emoji: selectedEmoji,
    };
    try {
      await api.post(`/households/${householdId}/finance/recurring-costs`, payload);
      showNotification('Adhoc income added.', 'success');
      fetchData();
      setAdhocIncomeOpen(false);
    } catch {
      showNotification('Failed.', 'danger');
    }
  };

  const handleRecurringAdd = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const [type, id] = (selectedEntity || 'household:null').split(':');

    const payload = {
      name: data.name,
      amount: parseFloat(data.amount) || 0,
      frequency: recurringType,
      start_date: data.start_date,
      category_id: data.category || 'other',
      object_type: type,
      object_id: id === 'null' ? null : id,
      adjust_for_working_day: data.nearest_working_day === '1' ? 1 : 0,
      bank_account_id: data.bank_account_id || null,
      financial_profile_id: financialProfileId || null,
      emoji: selectedEmoji,
      metadata: recurringMetadata,
    };

    try {
      await api.post(`/households/${householdId}/finance/recurring-costs`, payload);
      showNotification('Recurring expense added.', 'success');
      fetchData();
      setRecurringAddOpen(false);
    } catch {
      showNotification('Failed.', 'danger');
    }
  };

  const cycleTotals = useMemo(() => {
    if (!cycleData) return { total: 0, paid: 0, unpaid: 0 };
    const allItems = cycleData.groupList.flatMap((g) => g.items);
    const total = allItems.reduce((sum, e) => sum + e.amount, 0);
    const paid = allItems.filter((e) => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    return { total, paid, unpaid: total - paid };
  }, [cycleData]);

  const selectedAccount = useMemo(
    () => currentAccounts.find((a) => a.id === selectedAccountId),
    [currentAccounts, selectedAccountId]
  );

  const overdraftLimit = selectedAccount?.overdraft_limit || 0;

  const drawdownData = useMemo(() => {
    if (!cycleData || currentBalance === undefined) return [];

    const now = startOfDay(new Date());
    const days = eachDayOfInterval({ start: cycleData.startDate, end: cycleData.endDate });

    const allExpenses = cycleData.groupList.flatMap((g) => g.items);
    const allIncomes = cycleData.incomeGroup.items;

    // Calculate "Adjusted Start Balance" (Current Balance minus all unpaid items from BEFORE TODAY)
    const pastUnpaidExpenses = allExpenses.filter(
      (e) => isBefore(startOfDay(e.computedDate), now) && !e.isPaid
    );
    const pastUnpaidIncomes = allIncomes.filter(
      (e) => isBefore(startOfDay(e.computedDate), now) && !e.isPaid
    );
    const overdueAdjustment =
      pastUnpaidIncomes.reduce((s, i) => s + i.amount, 0) -
      pastUnpaidExpenses.reduce((s, e) => s + e.amount, 0);

    let runningBalance = (parseFloat(currentBalance) || 0) + overdueAdjustment;

    return days.map((day) => {
      // We only apply items that occur ON or AFTER Today in the projection loop,
      // because past items are already handled by the overdueAdjustment.
      if (isAfter(day, now) || isSameDay(day, now)) {
        const expensesDueToday = allExpenses.filter(
          (e) => isSameDay(e.computedDate, day) && !e.isPaid
        );
        const totalDueToday = expensesDueToday.reduce((sum, i) => sum + i.amount, 0);

        const incomeDueToday = allIncomes.filter(
          (e) => isSameDay(e.computedDate, day) && !e.isPaid
        );
        const totalIncomeToday = incomeDueToday.reduce((sum, i) => sum + i.amount, 0);

        runningBalance = runningBalance - totalDueToday + totalIncomeToday;
      }

      return { date: day, balance: runningBalance };
    });
  }, [cycleData, currentBalance]);

  const lowestProjected = useMemo(() => {
    const now = startOfDay(new Date());
    const futureData = drawdownData.filter((d) => isAfter(d.date, now) || isSameDay(d.date, now));
    if (!futureData.length) return 0;
    return Math.min(...futureData.map((d) => d.balance));
  }, [drawdownData]);

  const isOverdrawnRisk = lowestProjected < 0;
  const isLimitRisk = lowestProjected < -overdraftLimit;

  const overdraftRemedy = useMemo(() => {
    if (lowestProjected >= 0) return null;

    // Find the first date it dips below zero
    const firstDip = drawdownData.find((d) => d.balance < 0);
    // Find the first date it dips below limit
    const firstLimitDip = drawdownData.find((d) => d.balance < -overdraftLimit);

    return {
      amountToClear: Math.abs(lowestProjected),
      amountToBuffer: Math.abs(Math.min(0, lowestProjected + overdraftLimit)),
      deadline: firstDip ? firstDip.date : null,
      limitDeadline: firstLimitDip ? firstLimitDip.date : null,
    };
  }, [lowestProjected, drawdownData, overdraftLimit]);

  const trueDisposable =
    (parseFloat(currentBalance) || 0) - cycleTotals.unpaid + (cycleData?.incomeGroup.unpaid || 0);

  const overdraftPeriods = useMemo(() => {
    if (!drawdownData.length || !cycleData) return [];
    const periods = [];
    let currentPeriod = null;

    const totalDuration = cycleData.cycleDuration || 1;

    drawdownData.forEach((d, i) => {
      // Logic:
      // Red: balance < -overdraftLimit
      // Amber: 0 > balance >= -overdraftLimit
      let severity = null;
      if (d.balance < -overdraftLimit) severity = 'danger';
      else if (d.balance < 0) severity = 'warning';

      // Use segments: Day i covers from (i/total) to ((i+1)/total)
      const startPct = (i / totalDuration) * 100;
      const endPct = ((i + 1) / totalDuration) * 100;

      if (severity && (!currentPeriod || currentPeriod.severity !== severity)) {
        if (currentPeriod) periods.push(currentPeriod);
        currentPeriod = { severity, startPct, startDate: d.date, endDate: d.date, endPct };
      } else if (severity && currentPeriod && currentPeriod.severity === severity) {
        currentPeriod.endDate = d.date;
        currentPeriod.endPct = endPct;
      } else if (!severity && currentPeriod) {
        periods.push(currentPeriod);
        currentPeriod = null;
      }
    });

    if (currentPeriod) periods.push(currentPeriod);
    return periods;
  }, [drawdownData, cycleData, overdraftLimit]);

  const overdraftGradient = useMemo(() => {
    if (overdraftPeriods.length === 0) return 'var(--joy-palette-primary-softBg)';

    let stops = [];
    let lastPct = 0;

    overdraftPeriods.forEach((p) => {
      const colorVar =
        p.severity === 'danger'
          ? 'var(--joy-palette-danger-400)'
          : 'var(--joy-palette-warning-400)';

      // Only add a background segment if there is a gap between the last risk zone and this one
      if (p.startPct > lastPct) {
        stops.push(`var(--joy-palette-primary-softBg) ${lastPct}%`);
        stops.push(`var(--joy-palette-primary-softBg) ${p.startPct}%`);
      }

      // The risk zone (Warning or Danger)
      stops.push(`${colorVar} ${p.startPct}%`);
      stops.push(`${colorVar} ${p.endPct}%`);
      lastPct = p.endPct;
    });

    // Fill the remainder of the bar with the background color
    if (lastPct < 100) {
      stops.push(`var(--joy-palette-primary-softBg) ${lastPct}%`);
      stops.push(`var(--joy-palette-primary-softBg) 100%`);
    }

    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }, [overdraftPeriods]);

  const itemRiskStatuses = useMemo(() => {
    if (!cycleData || currentBalance === undefined) return new Map();

    const now = startOfDay(new Date());
    const allExpenses = cycleData.groupList.flatMap((g) => g.items);
    const allIncomes = cycleData.incomeGroup.items;

    // Get all items sorted chronologically
    const allItems = [
      ...allExpenses.map((i) => ({ ...i, isExpense: true })),
      ...allIncomes.map((i) => ({ ...i, isExpense: false })),
    ].sort((a, b) => a.computedDate.getTime() - b.computedDate.getTime());

    // However, we MUST adjust this starting balance by any unpaid items in the PAST,
    // because those items are expected to leave/enter the account "now".
    // Wait, actually, the most consistent way is to simulate the whole cycle
    // from the first unpaid item, assuming currentBalance is the anchor for "Today".

    // Let's stick to the Drawdown logic:
    // Initial = currentBalance + overdueAdjustment.
    const pastUnpaidExpenses = allExpenses.filter(
      (e) => isBefore(startOfDay(e.computedDate), now) && !e.isPaid
    );
    const pastUnpaidIncomes = allIncomes.filter(
      (e) => isBefore(startOfDay(e.computedDate), now) && !e.isPaid
    );
    const overdueAdjustment =
      pastUnpaidIncomes.reduce((s, i) => s + i.amount, 0) -
      pastUnpaidExpenses.reduce((s, e) => s + e.amount, 0);

    let simBalance = (parseFloat(currentBalance) || 0) + overdueAdjustment;
    const riskMap = new Map();

    // Now, iterate through all UNPAID items chronologically.
    // Items in the past should be flagged if the starting simBalance (after adjustment) is negative.
    // Items in the future are flagged based on the running balance.
    const unpaidItems = allItems.filter((i) => !i.isPaid);

    unpaidItems.forEach((item) => {
      if (isBefore(startOfDay(item.computedDate), now)) {
        // Past items: Their impact is already in simBalance, but we flag them if they are causing risk.
        let status = null;
        if (simBalance < -overdraftLimit) status = 'danger';
        else if (simBalance < 0) status = 'warning';
        riskMap.set(item.key, status);
      } else {
        // Today or Future items: Subtract/Add and then check balance.
        if (item.isExpense) simBalance -= item.amount;
        else simBalance += item.amount;

        let status = null;
        if (simBalance < -overdraftLimit) status = 'danger';
        else if (simBalance < 0) status = 'warning';
        riskMap.set(item.key, status);
      }
    });

    return riskMap;
  }, [cycleData, currentBalance, overdraftLimit]);

  const selectedTotals = useMemo(() => {
    if (!selectedKeys.length || !cycleData) return null;
    const allItems = [
      ...cycleData.groupList.flatMap((g) => g.items),
      ...cycleData.incomeGroup.items,
    ];
    const selected = allItems.filter((e) => selectedKeys.includes(e.key));
    const total = selected.reduce((sum, e) => sum + e.amount, 0);
    const paid = selected.filter((e) => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    return { count: selected.length, total, paid, unpaid: total - paid };
  }, [selectedKeys, cycleData]);

  useEffect(() => {
    setStatusBarData(selectedTotals);
    return () => setStatusBarData(null);
  }, [selectedTotals, setStatusBarData]);

  const handleSelectToggle = (key) =>
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  if (!cycleData)
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography level="h4">No Primary Income Set</Typography>
        <Button sx={{ mt: 2 }} onClick={fetchData}>
          Refresh
        </Button>
      </Box>
    );

  const incomeGroup = cycleData.incomeGroup;

  const renderItemRow = (exp) => {
    const rel = getRelativeDateLabel(exp.computedDate);
    const isAdhoc = exp.frequency === 'one_off';
    const riskStatus = itemRiskStatuses.get(exp.key);

    const getBgColor = () => {
      if (selectedKeys.includes(exp.key)) return 'primary.softBg';
      if (riskStatus === 'danger') return 'danger.softBg';
      if (riskStatus === 'warning') return 'warning.softBg';
      return 'transparent';
    };

    const isPot = exp.type === 'pot';
    const isSavingsDeposit = exp.type === 'savings_deposit';

    return (
      <Box
        component="tr"
        key={exp.key}
        onClick={() => handleSelectToggle(exp.key)}
        sx={{
          cursor: 'pointer',
          bgcolor: getBgColor(),
          opacity: exp.isPaid ? 0.6 : 1,
          '&:hover': {
            bgcolor: selectedKeys.includes(exp.key) ? 'primary.softBg' : 'background.level1',
          },
        }}
      >
        <td style={{ width: 40, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            size="sm"
            checked={selectedKeys.includes(exp.key)}
            onChange={() => handleSelectToggle(exp.key)}
          />
        </td>
        <td>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar size="sm" sx={{ bgcolor: getEmojiColor(exp.label || '?', isDark) }}>
              {exp.icon}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                level="body-sm"
                fontWeight="bold"
                sx={{
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {exp.label}
              </Typography>
              {isPot && (
                <Typography level="body-xs" color="success">
                  Pot Transfer
                </Typography>
              )}
              {isSavingsDeposit && (
                <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                  Savings Account
                </Typography>
              )}
            </Box>
          </Box>
        </td>
        <td style={{ width: 140 }}>
          <Chip
            size="sm"
            variant="soft"
            color={getCategoryColor(exp.category)}
            sx={{ fontSize: '0.65rem', textTransform: 'capitalize' }}
          >
            {isPot ? 'Pot' : exp.category.replace('_', ' ')}
          </Chip>
        </td>
        <td style={{ width: 160 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography level="body-xs" fontWeight="bold" sx={{ color: 'text.primary' }}>
              {format(exp.computedDate, 'do MMM')}
            </Typography>
            <Typography level="body-xs" color={rel.color}>
              {rel.label}
            </Typography>
          </Box>
        </td>
        <td style={{ textAlign: 'right', width: 110 }}>
          <Input
            size="sm"
            type="number"
            variant="soft"
            sx={{ width: 100, textAlign: 'right', '& input': { textAlign: 'right' } }}
            defaultValue={Number(exp.amount).toFixed(2)}
            onBlur={(e) => updateActualAmount(exp.key, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            slotProps={{ input: { step: '0.01' } }}
          />
        </td>
        <td style={{ textAlign: 'center', width: 60 }}>
          <Checkbox
            size="sm"
            variant="plain"
            checked={exp.isPaid}
            onChange={() => togglePaid(exp.key, exp.amount)}
            disabled={savingProgress.has(exp.key)}
            uncheckedIcon={<RadioButtonUnchecked sx={{ fontSize: '1.2rem' }} />}
            checkedIcon={<CheckCircle color="success" sx={{ fontSize: '1.2rem' }} />}
            onClick={(e) => e.stopPropagation()}
            sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent' } }}
          />
        </td>
        <td style={{ textAlign: 'center', width: 60 }}>
          <IconButton
            size="sm"
            variant="plain"
            color="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDisableItem(exp.key, exp.frequency, exp.id);
            }}
            sx={{ '--IconButton-size': '28px' }}
          >
            {isAdhoc ? <DeleteForever fontSize="small" /> : <Block fontSize="small" />}
          </IconButton>
        </td>
      </Box>
    );
  };

  const renderMobileItem = (exp) => {
    const isAdhoc = exp.frequency === 'one_off';
    const riskStatus = itemRiskStatuses.get(exp.key);

    let cardColor = 'neutral';
    if (selectedKeys.includes(exp.key)) cardColor = 'primary';
    else if (riskStatus === 'danger') cardColor = 'danger';
    else if (riskStatus === 'warning') cardColor = 'warning';

    return (
      <Card
        key={exp.key}
        variant="soft"
        color={cardColor}
        sx={{
          p: 1.5,
          mb: 1,
          opacity: exp.isPaid ? 0.6 : 1,
          position: 'relative',
          transition: 'all 0.2s',
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
          <Avatar
            size="md"
            sx={{ bgcolor: getEmojiColor(exp.label || '?', isDark), flexShrink: 0 }}
          >
            {exp.icon}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 0.5,
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  level="title-sm"
                  sx={{
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {exp.label}
                </Typography>
                <Typography level="body-xs" color="neutral">
                  {format(exp.computedDate, 'do MMM')} (
                  {getRelativeDateLabel(exp.computedDate).label})
                </Typography>
              </Box>
              <Chip
                size="sm"
                variant="soft"
                color={getCategoryColor(exp.category)}
                sx={{ fontSize: '0.6rem', textTransform: 'capitalize', flexShrink: 0 }}
              >
                {exp.category}
              </Chip>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 1,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Input
                size="sm"
                type="number"
                variant="outlined"
                sx={{ width: { xs: '100%', sm: 100 }, textAlign: 'right', order: { xs: 2, sm: 1 } }}
                defaultValue={Number(exp.amount).toFixed(2)}
                onBlur={(e) => updateActualAmount(exp.key, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                slotProps={{ input: { step: '0.01' } }}
              />
              <Stack direction="row" spacing={1} sx={{ order: { xs: 1, sm: 2 }, ml: 'auto' }}>
                <Checkbox
                  size="lg"
                  variant="plain"
                  checked={exp.isPaid}
                  onChange={() => togglePaid(exp.key, exp.amount)}
                  disabled={savingProgress.has(exp.key)}
                  uncheckedIcon={<RadioButtonUnchecked sx={{ fontSize: '1.5rem' }} />}
                  checkedIcon={<CheckCircle color="success" sx={{ fontSize: '1.5rem' }} />}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ minHeight: 44, minWidth: 44 }}
                />
                <IconButton
                  size="sm"
                  variant="plain"
                  color="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDisableItem(exp.key, exp.frequency, exp.id);
                  }}
                  sx={{ minHeight: 44, minWidth: 44 }}
                >
                  {isAdhoc ? <DeleteForever /> : <Block />}
                </IconButton>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Card>
    );
  };

  const renderSection = (group) => {
    const isOpen = sectionsOpen[group.id] ?? true;
    const toggle = () => setSectionsOpen((prev) => ({ ...prev, [group.id]: !prev[group.id] }));

    return (
      <Accordion
        expanded={isOpen}
        onChange={toggle}
        variant="outlined"
        sx={{
          borderRadius: 'md',
          mb: 2,
          boxShadow: 'sm',
          overflow: 'hidden',
        }}
        key={group.id}
      >
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ py: { xs: 1.5, sm: 1 } }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              justifyContent: 'space-between',
              width: '100%',
              alignItems: 'center',
              mr: 2,
              overflow: 'hidden',
              gap: 1.5,
            }}
          >
            <Typography
              level="title-lg"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                minWidth: 0,
                flexBasis: { xs: '100%', sm: 'auto' },
              }}
            >
              <Avatar size="sm" sx={{ bgcolor: 'background.level3' }}>
                {group.emoji}
              </Avatar>
              <Box
                component="span"
                sx={{
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {group.label}
              </Box>
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              sx={{
                flexShrink: 0,
                justifyContent: { xs: 'space-between', sm: 'flex-end' },
                width: { xs: '100%', sm: 'auto' },
                mt: { xs: 1, sm: 0 },
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography level="body-xs">Total</Typography>
                <Typography level="body-sm" fontWeight="bold" sx={{ color: 'text.primary' }}>
                  {formatCurrency(group.total)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography level="body-xs" color="success">
                  Paid
                </Typography>
                <Typography level="body-sm" fontWeight="bold" color="success">
                  {formatCurrency(group.paid)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography level="body-xs" color="danger">
                  Unpaid
                </Typography>
                <Typography level="body-sm" fontWeight="bold" color="danger">
                  {formatCurrency(group.unpaid)}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </AccordionSummary>
        {isOpen && <Divider />}
        <AccordionDetails sx={{ p: { xs: 1, sm: 0 }, bgcolor: 'background.surface' }}>
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {group.items.map(renderMobileItem)}
          </Box>
          <Sheet
            variant="plain"
            sx={{ borderRadius: 'md', overflow: 'hidden', display: { xs: 'none', md: 'block' } }}
          >
            <Table
              hoverRow
              sx={{
                '--TableCell-paddingX': '16px',
                tableLayout: 'fixed',
                '& th': { bgcolor: 'background.level1' },
                '& tr > td': { borderBottom: '1px solid', borderColor: 'divider' },
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <Checkbox
                      size="sm"
                      onChange={(e) => {
                        const keys = group.items.map((exp) => exp.key);
                        if (e.target.checked)
                          setSelectedKeys((prev) => Array.from(new Set([...prev, ...keys])));
                        else setSelectedKeys((prev) => prev.filter((k) => !keys.includes(k)));
                      }}
                    />
                  </th>
                  <th onClick={() => requestSort('label')} style={{ cursor: 'pointer' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Item{' '}
                      <Sort
                        sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'label' ? 1 : 0.3 }}
                      />
                    </Box>
                  </th>
                  <th
                    onClick={() => requestSort('category')}
                    style={{ width: 140, cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Category{' '}
                      <Sort
                        sx={{
                          fontSize: '0.8rem',
                          opacity: sortConfig.key === 'category' ? 1 : 0.3,
                        }}
                      />
                    </Box>
                  </th>
                  <th
                    onClick={() => requestSort('computedDate')}
                    style={{ width: 160, cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Due Date{' '}
                      <Sort
                        sx={{
                          fontSize: '0.8rem',
                          opacity: sortConfig.key === 'computedDate' ? 1 : 0.3,
                        }}
                      />
                    </Box>
                  </th>
                  <th
                    onClick={() => requestSort('amount')}
                    style={{ width: 110, textAlign: 'right', cursor: 'pointer' }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                      }}
                    >
                      Amount{' '}
                      <Sort
                        sx={{ fontSize: '0.8rem', opacity: sortConfig.key === 'amount' ? 1 : 0.3 }}
                      />
                    </Box>
                  </th>
                  <th style={{ width: 60, textAlign: 'center' }}>Paid</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Delete / Skip</th>
                </tr>
              </thead>
              <tbody>{group.items.map(renderItemRow)}</tbody>
            </Table>
          </Sheet>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box sx={{ userSelect: 'none', pb: 12, overflowX: 'hidden' }}>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            width: { xs: '100%', md: 'auto' },
            justifyContent: { xs: 'center', md: 'flex-start' },
          }}
        >
          <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, -1))}>
            <ChevronLeft />
          </IconButton>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              level="h2"
              sx={{
                color: 'text.primary',
                fontWeight: 'lg',
                mb: 0.5,
                fontSize: { xs: '1.2rem', sm: '1.5rem' },
              }}
            >
              {cycleData.label}
            </Typography>
            <Typography level="body-xs" color="neutral">
              {format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}
            </Typography>
          </Box>
          <IconButton variant="outlined" onClick={() => setViewDate(addMonths(viewDate, 1))}>
            <ChevronRight />
          </IconButton>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap', gap: 1 }}
        >
          <Input
            startDecorator={<Search />}
            placeholder="Search items..."
            size="sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            endDecorator={
              searchQuery && (
                <IconButton variant="plain" size="sm" onClick={() => setSearchQuery('')}>
                  <Clear />
                </IconButton>
              )
            }
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
              <Typography
                key={`label-${idx}`}
                level="body-xs"
                sx={{ px: 2, py: 1, fontWeight: 'bold' }}
              >
                {group.label}
              </Typography>,
              ...group.options.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </Option>
              )),
            ])}
          </Select>

          <Select
            size="sm"
            value={filterAccount}
            onChange={(e, val) => setFilterAccount(val)}
            placeholder="All Accounts"
            startDecorator={<AccountBalanceWallet />}
            sx={{ width: { xs: '100%', sm: 160 } }}
          >
            <Option value="all">All Accounts</Option>
            <Divider />
            {currentAccounts.map((acc) => (
              <Option key={acc.id} value={String(acc.id)}>
                {acc.emoji} {acc.account_name}
              </Option>
            ))}
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

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            width: { xs: '100%', md: 'auto' },
            justifyContent: { xs: 'center', md: 'flex-end' },
          }}
        >
          <Tooltip title="Toggle Paid Items">
            <FormControl orientation="horizontal" size="sm" sx={{ mr: 1 }}>
              <FormLabel sx={{ mr: 1, display: { xs: 'none', lg: 'inline' } }}>Hide Paid</FormLabel>
              <Switch
                checked={hidePaid}
                onChange={(e) => setHidePaid(e.target.checked)}
                size="sm"
              />
            </FormControl>
          </Tooltip>
          {currentCycleRecord && (
            <Button
              variant="outlined"
              color="danger"
              size="sm"
              startDecorator={<RestartAlt />}
              onClick={handleResetCycle}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Reset
            </Button>
          )}
          {selectedKeys.length > 0 && (
            <Button
              variant="outlined"
              color="neutral"
              size="sm"
              onClick={() => setSelectedKeys([])}
            >
              Clear
            </Button>
          )}
          <Dropdown>
            <MenuButton
              variant="solid"
              color="primary"
              size="sm"
              startDecorator={<Add />}
              endDecorator={<ArrowDropDown />}
            >
              Add
            </MenuButton>
            <Menu placement="bottom-end" size="sm">
              <MenuItem onClick={handleOpenAdhoc}>Add Adhoc Income</MenuItem>
              <Divider />
              <MenuItem onClick={handleOpenQuickAdd}>Add One-off Expense</MenuItem>
              <MenuItem onClick={handleOpenRecurring}>Add Recurring Expense</MenuItem>
            </Menu>
          </Dropdown>
        </Box>
      </Box>

      <Box sx={{ mb: 2, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', mb: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            {overdraftRemedy && (
              <>
                <Typography
                  level="body-xs"
                  variant="soft"
                  sx={{
                    px: 1,
                    borderRadius: 'xs',
                    fontWeight: 'bold',
                    bgcolor: 'warning.softBg',
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'warning.200',
                  }}
                >
                  Action Required: Going into overdraft on{' '}
                  {format(overdraftRemedy.deadline, 'do MMM')} and need{' '}
                  {formatCurrency(overdraftRemedy.amountToClear)} by{' '}
                  {format(overdraftRemedy.deadline, 'do MMM')} to stay positive.
                </Typography>
                {overdraftRemedy.limitDeadline && (
                  <Typography
                    level="body-xs"
                    variant="soft"
                    sx={{
                      px: 1,
                      borderRadius: 'xs',
                      fontWeight: 'bold',
                      bgcolor: 'danger.softBg',
                      color: 'text.primary',
                      border: '1px solid',
                      borderColor: 'danger.200',
                    }}
                  >
                    CRITICAL: {formatCurrency(overdraftRemedy.amountToBuffer)} needed by{' '}
                    {format(overdraftRemedy.limitDeadline, 'do MMM')} to avoid bounce.
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>
        <Tooltip
          variant="solid"
          color={
            overdraftPeriods.some((p) => p.severity === 'danger')
              ? 'danger'
              : overdraftPeriods.length > 0
                ? 'warning'
                : 'neutral'
          }
          placement="top"
          title={
            overdraftPeriods.length > 0 ? (
              <Box sx={{ p: 0.5, maxWidth: 280 }}>
                <Typography
                  level="title-sm"
                  color="inherit"
                  sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Warning />{' '}
                  {overdraftPeriods.some((p) => p.severity === 'danger')
                    ? 'Overdraft Limit Risk'
                    : 'Overdraft Buffer Used'}
                </Typography>

                {overdraftRemedy && (
                  <Box sx={{ mb: 1.5, p: 1, borderRadius: 'xs', bgcolor: 'rgba(0,0,0,0.2)' }}>
                    <Typography level="body-xs" fontWeight="bold" color="inherit">
                      Action Required:
                    </Typography>
                    <Typography level="body-xs" color="inherit">
                      Deposit {formatCurrency(overdraftRemedy.amountToClear)} by{' '}
                      {format(overdraftRemedy.deadline, 'do MMM')} to stay positive.
                    </Typography>
                    {overdraftRemedy.limitDeadline && (
                      <Typography
                        level="body-xs"
                        color="inherit"
                        sx={{ mt: 0.5, fontWeight: 'bold' }}
                      >
                        CRITICAL: {formatCurrency(overdraftRemedy.amountToBuffer)} needed by{' '}
                        {format(overdraftRemedy.limitDeadline, 'do MMM')} to avoid bounce.
                      </Typography>
                    )}
                  </Box>
                )}

                <Typography level="body-xs" fontWeight="bold" color="inherit" sx={{ mb: 0.5 }}>
                  Risk Periods:
                </Typography>
                {overdraftPeriods.map((p, i) => (
                  <Typography
                    key={i}
                    level="body-xs"
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: p.severity === 'danger' ? 'danger.200' : 'warning.200',
                      }}
                    />
                    {format(p.startDate, 'do MMM')} — {format(p.endDate, 'do MMM')}
                  </Typography>
                ))}
              </Box>
            ) : (
              'No projected overdraft'
            )
          }
        >
          <Box sx={{ position: 'relative', pt: 0.5, pb: 2.5, px: 2 }}>
            <LinearProgress
              determinate
              value={cycleData.progressPct}
              thickness={12}
              variant="soft"
              color="primary"
              sx={{
                borderRadius: 'sm',
                '--LinearProgress-radius': '6px',
                background: overdraftGradient,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
                position: 'relative',
                zIndex: 1,
              }}
            />
            {/* Day Ticks & Faint Numbers */}
            {Array.from({ length: cycleData.cycleDuration + 1 }).map((_, i) => {
              const tickDate = addDays(cycleData.startDate, i);
              const leftPct = (i / cycleData.cycleDuration) * 100;
              const isToday = isSameDay(tickDate, new Date());
              const dayEvents = cycleData.eventsPerDay?.get(format(tickDate, 'yyyy-MM-dd'));

              return (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    left: `calc(${leftPct}% + 16px)`, // Offset for px: 2
                    top: 4,
                    height: 16,
                    width: '1px',
                    bgcolor: isToday ? 'primary.solidBg' : 'rgba(0,0,0,0.1)',
                    zIndex: 2,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {dayEvents && dayEvents.length > 0 && (
                    <Tooltip title={dayEvents.map((b) => b.label).join(', ')}>
                      <Typography
                        level="body-xs"
                        sx={{
                          position: 'absolute',
                          top: -18,
                          fontSize: '1rem',
                          pointerEvents: 'auto',
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {dayEvents[0].icon}
                      </Typography>
                    </Tooltip>
                  )}
                  <Typography
                    level="body-xs"
                    sx={{
                      position: 'absolute',
                      top: 18,
                      fontSize: '0.65rem',
                      color: isToday ? 'text.primary' : 'neutral.500',
                      fontWeight: isToday ? 'bold' : 'normal',
                      opacity: i % 2 === 0 ? 0.4 : 0, // Show every 2nd day to avoid crowding
                      whiteSpace: 'nowrap',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {format(tickDate, 'd')}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        <Grid xs={12} md={3}>
          <Stack spacing={3}>
            {/* Income Source Cards */}
            {incomeGroup && (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1.5,
                  }}
                >
                  <Typography
                    level="title-md"
                    startDecorator={<Payments />}
                    sx={{ color: 'text.primary' }}
                  >
                    Income Sources
                  </Typography>
                  <Typography level="body-xs" fontWeight="bold" color="success">
                    {formatCurrency(incomeGroup.total)}
                  </Typography>
                </Box>
                <Stack spacing={1.5}>
                  {incomeGroup.items.map((inc) => (
                    <IncomeSourceCard
                      key={inc.key}
                      inc={inc}
                      onUpdate={updateActualAmount}
                      onDelete={handleDeleteRecurringCost}
                    />
                  ))}
                  {incomeGroup.items.length === 0 && (
                    <Typography
                      level="body-xs"
                      sx={{
                        textAlign: 'center',
                        py: 2,
                        fontStyle: 'italic',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 'sm',
                      }}
                    >
                      No income records for this cycle.
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            <Card
              variant="outlined"
              sx={{ p: 2, boxShadow: 'sm', bgcolor: 'primary.softBg', borderColor: 'primary.200' }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                }}
              >
                <Typography
                  level="title-md"
                  startDecorator={<BankIcon />}
                  sx={{ color: 'text.primary' }}
                >
                  Liquidity Control
                </Typography>
              </Box>

              <FormControl sx={{ mb: 2 }}>
                <FormLabel
                  sx={{
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    letterSpacing: '0.05em',
                    mb: 1,
                  }}
                >
                  Linked Bank Account
                </FormLabel>
                <Select
                  value={selectedAccountId}
                  onChange={(e, val) => {
                    setSelectedAccountId(val);
                    const acc = currentAccounts.find((a) => a.id === val);
                    if (acc) {
                      setCurrentBalance(acc.current_balance);
                      saveCycleData(actualPay, acc.current_balance, val);
                    } else {
                      saveCycleData(actualPay, currentBalance, val);
                    }
                  }}
                  placeholder="Select Account..."
                  size="sm"
                  startDecorator={selectedAccount?.emoji || <BankIcon />}
                  sx={{ bgcolor: 'background.surface' }}
                >
                  <Option value={null}>None (Manual Balance)</Option>
                  <Divider />
                  {currentAccounts.map((acc) => (
                    <Option key={acc.id} value={acc.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {acc.emoji} {acc.account_name}
                      </Box>
                    </Option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel
                  sx={{
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    letterSpacing: '0.05em',
                    mb: 1,
                  }}
                >
                  Current Bank Balance
                </FormLabel>
                <Input
                  size="lg"
                  type="number"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  onBlur={(e) => saveCycleData(actualPay, e.target.value)}
                  color="neutral"
                  variant="outlined"
                  startDecorator={
                    <Typography level="h4" sx={{ color: 'text.primary' }}>
                      £
                    </Typography>
                  }
                  sx={{
                    fontWeight: 'xl',
                    fontSize: '1.5rem',
                    bgcolor: 'background.surface',
                    '& input': { textAlign: 'right', color: 'text.primary' },
                  }}
                  slotProps={{ input: { step: '0.01' } }}
                />
              </FormControl>
            </Card>

            <Card variant="outlined" sx={{ p: 2, boxShadow: 'sm' }}>
              <Typography
                level="title-md"
                startDecorator={<TrendingDown />}
                sx={{ color: 'text.primary', mb: 2 }}
              >
                Drawdown Projection
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography level="body-xs" color="neutral">
                    Lowest Point
                  </Typography>
                  <Typography
                    level="body-sm"
                    fontWeight="bold"
                    color={isOverdrawnRisk ? 'danger' : 'success'}
                  >
                    {formatCurrency(lowestProjected)}
                  </Typography>
                </Box>
                <DrawdownChart
                  data={drawdownData}
                  limit={-overdraftLimit}
                  cycleStartDate={cycleData.startDate}
                  cycleEndDate={cycleData.endDate}
                  eventsPerDay={cycleData.eventsPerDay}
                />
              </Box>

              {isOverdrawnRisk && (
                <Sheet
                  color={isLimitRisk ? 'danger' : 'warning'}
                  variant="soft"
                  sx={{
                    p: 1,
                    borderRadius: 'sm',
                    mb: 2,
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
                  <Warning sx={{ fontSize: '1rem' }} />
                  <Typography level="body-xs" fontWeight="bold" sx={{ color: 'text.primary' }}>
                    {isLimitRisk ? 'Overdraft Limit Warning!' : 'Temporary deficit projected.'}
                  </Typography>
                </Sheet>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography level="body-xs">Safe to Spend Now</Typography>
                  <Typography
                    level="body-sm"
                    fontWeight="bold"
                    color={lowestProjected > 0 ? 'success' : 'danger'}
                  >
                    {formatCurrency(Math.max(0, lowestProjected))}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography level="body-xs">End of Cycle</Typography>
                  <Typography
                    level="body-sm"
                    fontWeight="bold"
                    color={trueDisposable > 0 ? 'success' : 'danger'}
                  >
                    {formatCurrency(trueDisposable)}
                  </Typography>
                </Box>
              </Stack>

              <Typography
                level="body-xs"
                color="neutral"
                sx={{ mt: 2, fontStyle: 'italic', fontSize: '0.65rem' }}
              >
                * Projection assumes all future income is received on time.
              </Typography>
            </Card>
          </Stack>
        </Grid>

        {/* Main Content: Expense Groups */}
        <Grid xs={12} md={9}>
          {cycleData.groupList.map(renderSection)}
          {cycleData.groupList.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
              <Typography level="h4">No expenses found.</Typography>
              <Typography>Add recurring costs or transactions to build your budget.</Typography>
            </Box>
          )}

          {cycleData.skipped.length > 0 && (
            <Accordion
              variant="soft"
              sx={{ borderRadius: 'md', mt: 4, bgcolor: 'background.level1' }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography level="title-sm">Skipped Items ({cycleData.skipped.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {cycleData.skipped.map((item) => (
                    <Box
                      key={item.key}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                      }}
                    >
                      <Typography
                        level="body-sm"
                        sx={{ textDecoration: 'line-through', opacity: 0.7 }}
                      >
                        {item.label}
                      </Typography>
                      <Button
                        size="sm"
                        variant="plain"
                        startDecorator={<Restore />}
                        onClick={() => handleRestoreItem(item.key)}
                      >
                        Restore
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}
        </Grid>
      </Grid>

      {/* --- MODALS --- */}
      <Modal open={setupModalOpen} onClose={() => {}}>
        <ModalDialog>
          <DialogTitle>Budget Setup: {cycleData.label}</DialogTitle>
          <DialogContent>
            <Typography level="body-sm" sx={{ mb: 2 }}>
              New budget cycle detected ({format(cycleData.startDate, 'do MMM')}). How should we
              start?
            </Typography>
            <Stack spacing={2}>
              <Button
                size="lg"
                variant="solid"
                color="primary"
                onClick={() => handleSetupBudget('fresh')}
              >
                Start Fresh (Zero Balance)
              </Button>
              <Button
                size="lg"
                variant="soft"
                color="neutral"
                onClick={() => handleSetupBudget('copy')}
              >
                Copy Last Month's Balance
              </Button>
              <Divider>OR</Divider>
              <Typography level="body-xs">Auto-set to projected income:</Typography>
              <Button
                size="lg"
                variant="outlined"
                color="success"
                onClick={() => handleSetupBudget('income')}
              >
                Set to {formatCurrency(projectedIncomeTotal)}
              </Button>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>

      {/* Quick Add Modal */}
      <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)}>
        <ModalDialog>
          <DialogTitle>Add One-off Expense</DialogTitle>
          <DialogContent>
            <form onSubmit={handleQuickAdd}>
              <Stack spacing={2}>
                <FormControl required>
                  <FormLabel>Item Name</FormLabel>
                  <Input name="name" autoFocus />
                </FormControl>
                <FormControl required>
                  <FormLabel>Amount (£)</FormLabel>
                  <Input name="amount" type="number" step="0.01" />
                </FormControl>
                <FormControl required>
                  <FormLabel>Date</FormLabel>
                  <Input
                    name="start_date"
                    type="date"
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                  />
                </FormControl>
                <AppSelect
                  label="Category"
                  name="category"
                  defaultValue="other"
                  options={getCategoryOptions()}
                />
                <FormControl>
                  <FormLabel>Paid From</FormLabel>
                  <AppSelect
                    name="bank_account_id"
                    options={currentAccounts.map((a) => ({ value: a.id, label: a.account_name }))}
                  />
                </FormControl>
                <Button type="submit">Add Expense</Button>
              </Stack>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>

      {/* Adhoc Income Modal */}
      <Modal open={adhocIncomeOpen} onClose={() => setAdhocIncomeOpen(false)}>
        <ModalDialog>
          <DialogTitle>Add Adhoc Income</DialogTitle>
          <DialogContent>
            <form onSubmit={handleAdhocIncome}>
              <Stack spacing={2}>
                <FormControl required>
                  <FormLabel>Source / Description</FormLabel>
                  <Input name="name" autoFocus />
                </FormControl>
                <FormControl required>
                  <FormLabel>Amount (£)</FormLabel>
                  <Input name="amount" type="number" step="0.01" />
                </FormControl>
                <FormControl required>
                  <FormLabel>Date Received</FormLabel>
                  <Input
                    name="start_date"
                    type="date"
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Deposit To</FormLabel>
                  <AppSelect
                    name="bank_account_id"
                    options={currentAccounts.map((a) => ({ value: a.id, label: a.account_name }))}
                  />
                </FormControl>
                <Button type="submit" color="success">
                  Add Income
                </Button>
              </Stack>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>

      {/* Recurring Modal */}
      <Modal open={recurringAddOpen} onClose={() => setRecurringAddOpen(false)}>
        <ModalDialog sx={{ maxWidth: 600, width: '100%', overflow: 'auto' }}>
          <DialogTitle>Add Recurring Expense</DialogTitle>
          <DialogContent>
            <form onSubmit={handleRecurringAdd}>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <FormControl required>
                      <FormLabel>Name</FormLabel>
                      <Input name="name" />
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl required>
                      <FormLabel>Amount (£)</FormLabel>
                      <Input name="amount" type="number" step="0.01" />
                    </FormControl>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <AppSelect
                      label="Frequency"
                      value={recurringType}
                      onChange={setRecurringType}
                      options={[
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'quarterly', label: 'Quarterly' },
                        { value: 'yearly', label: 'Yearly' },
                      ]}
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl required>
                      <FormLabel>Start Date</FormLabel>
                      <Input
                        name="start_date"
                        type="date"
                        defaultValue={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </FormControl>
                  </Grid>
                </Grid>

                <AppSelect
                  label="Link to Entity (Optional)"
                  value={selectedEntity}
                  onChange={(val) => {
                    setSelectedEntity(val);
                    setRecurringCategory(getCategoryOptions(val)[0]?.value || 'other');
                  }}
                  options={entityGroupsOptions}
                />

                <AppSelect
                  label="Category"
                  name="category"
                  value={recurringCategory}
                  onChange={setRecurringCategory}
                  options={getCategoryOptions(selectedEntity)}
                />

                <MetadataFormFields
                  category={recurringCategory}
                  metadata={recurringMetadata}
                  onChange={setRecurringMetadata}
                />

                <FormControl>
                  <Checkbox
                    label="Adjust for weekends (Nearest Working Day)"
                    name="nearest_working_day"
                    defaultChecked
                    value="1"
                  />
                </FormControl>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 2,
                  }}
                >
                  <Button
                    variant="plain"
                    color="neutral"
                    onClick={() => setRecurringAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Recurring</Button>
                </Box>
              </Stack>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onEmojiSelect={handleEmojiSelect}
        isDark={isDark}
      />
    </Box>
  );
}
