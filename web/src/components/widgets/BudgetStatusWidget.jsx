import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Stack, LinearProgress, CircularProgress, Tooltip, Sheet, Chip, Divider } from '@mui/joy';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import Warning from '@mui/icons-material/Warning';
import TrendingDown from '@mui/icons-material/TrendingDown';
import Speed from '@mui/icons-material/Speed';
import { 
    format, addMonths, startOfMonth, setDate, 
    isSameDay, isAfter, isBefore, startOfDay, isWithinInterval, parseISO, addWeeks, addYears, eachDayOfInterval,
    differenceInDays
} from 'date-fns';
import WidgetWrapper from './WidgetWrapper';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BudgetStatusWidget({ api, household }) {
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
      incomes: [], progress: [], cycles: [], recurring_costs: [], 
      credit_cards: [], current_accounts: [], bank_holidays: []
  });

  const fetchData = useCallback(async () => {
    if (!api || !household?.id) return;
    setLoading(true);
    try {
      const [
          incRes, progRes, cycleRes, recurringRes, ccRes, accountRes, holidayRes
      ] = await Promise.all([
          api.get(`/households/${household.id}/finance/income`).catch(() => ({ data: [] })),
          api.get(`/households/${household.id}/finance/budget-progress`).catch(() => ({ data: [] })),
          api.get(`/households/${household.id}/finance/budget-cycles`).catch(() => ({ data: [] })),
          api.get(`/households/${household.id}/finance/recurring-costs`).catch(() => ({ data: [] })),
          api.get(`/households/${household.id}/finance/credit-cards`).catch(() => ({ data: [] })),
          api.get(`/households/${household.id}/finance/current-accounts`).catch(() => ({ data: [] })),
          api.get(`/system/holidays`).catch(() => ({ data: [] }))
      ]);

      setFinanceData({
          incomes: incRes?.data || [],
          progress: progRes?.data || [],
          cycles: cycleRes?.data || [],
          recurring_costs: recurringRes?.data || [],
          credit_cards: ccRes?.data || [],
          current_accounts: accountRes?.data || [],
          bank_holidays: holidayRes?.data || []
      });
    } catch (err) {
      console.error("Failed to fetch budget status data", err);
    } finally {
      setLoading(false);
    }
  }, [api, household?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const projection = useMemo(() => {
    const { incomes, recurring_costs, credit_cards, progress, cycles, current_accounts, bank_holidays } = financeData;
    
    if (!incomes || incomes.length === 0) return null;
    
    const primaryIncome = incomes.find(i => i.is_primary === 1) || incomes.find(i => i.payment_day > 0);
    if (!primaryIncome) return null;

    const now = startOfDay(new Date());
    const payday = parseInt(primaryIncome.payment_day) || 1;
    let rawStartDate = now.getDate() >= payday ? setDate(startOfMonth(now), payday) : setDate(startOfMonth(addMonths(now, -1)), payday);
    
    const getPriorWorkingDay = (date) => {
        let d = new Date(date);
        const isWeekend = (day) => day.getDay() === 0 || day.getDay() === 6;
        const isHoliday = (day) => Array.isArray(bank_holidays) && bank_holidays.includes(format(day, 'yyyy-MM-dd'));
        while (isWeekend(d) || isHoliday(d)) { d.setDate(d.getDate() - 1); }
        return d;
    };

    const startDate = getPriorWorkingDay(rawStartDate);
    const nextPaydayRaw = setDate(startOfMonth(addMonths(rawStartDate, 1)), payday);
    const endDate = getPriorWorkingDay(nextPaydayRaw);
    const cycleKey = format(startDate, 'yyyy-MM-dd');

    const daysInCycle = differenceInDays(endDate, startDate);
    const daysElapsed = differenceInDays(now, startDate);
    const daysRemaining = Math.max(0, differenceInDays(endDate, now));
    const cycleProgress = Math.min(100, Math.max(0, (daysElapsed / daysInCycle) * 100));

    const currentCycleRecord = Array.isArray(cycles) ? cycles.find(c => c.cycle_start === cycleKey) : null;
    if (!currentCycleRecord) return { noCycle: true, cycleLabel: format(rawStartDate, 'MMMM yyyy'), daysRemaining };

    const currentBalance = parseFloat(currentCycleRecord.current_balance) || 0;
    const linkedAccount = Array.isArray(current_accounts) ? current_accounts.find(a => a.id === currentCycleRecord.bank_account_id) : null;
    const overdraftLimit = linkedAccount?.overdraft_limit || 0;

    const progressMap = new Map();
    if (Array.isArray(progress)) {
        progress.filter(p => p.cycle_start === cycleKey).forEach(p => progressMap.set(p.item_key, p));
    }

    const getAdjustedDate = (input, useNwd) => {
        let d = setDate(startOfMonth(new Date(startDate)), parseInt(input) || 1);
        if (isAfter(startDate, d)) { d = addMonths(d, 1); }
        if (!useNwd) return d;
        let nd = new Date(d);
        const isHoliday = (day) => Array.isArray(bank_holidays) && bank_holidays.includes(format(day, 'yyyy-MM-dd'));
        while (nd.getDay() === 0 || nd.getDay() === 6 || isHoliday(nd)) { nd.setDate(nd.getDate() + 1); }
        return nd;
    };

    const allExpenses = [];
    const allIncomes = [];

    // Recurring Costs
    if (Array.isArray(recurring_costs)) {
        recurring_costs.filter(c => c.is_active !== 0).forEach(charge => {
            let datesToAdd = [];
            const freq = charge.frequency?.toLowerCase();
            const anchor = charge.start_date ? parseISO(charge.start_date) : null;
            
            if (freq === 'one_off') {
                const d = parseISO(charge.exact_date || charge.start_date);
                if (d && isWithinInterval(d, { start: startDate, end: endDate })) datesToAdd.push(d);
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
                    let d = new Date(current);
                    if (charge.adjust_for_working_day) {
                        const isHoliday = (day) => Array.isArray(bank_holidays) && bank_holidays.includes(format(day, 'yyyy-MM-dd'));
                        while (d.getDay() === 0 || d.getDay() === 6 || isHoliday(d)) { d.setDate(d.getDate() + 1); }
                    }
                    datesToAdd.push(d);
                    if (freq === 'weekly') current = addWeeks(current, 1);
                    else if (freq === 'monthly') current = addMonths(current, 1);
                    else if (freq === 'quarterly') current = addMonths(current, 3);
                    else if (freq === 'yearly') current = addYears(current, 1);
                    else break;
                }
            }

            datesToAdd.forEach(d => {
                const key = `recurring_${charge.id}_${format(d, 'ddMM')}`;
                const prog = progressMap.get(key);
                if (prog?.is_paid === -1) return;
                const item = { key, amount: prog?.actual_amount || charge.amount, date: d, isPaid: prog?.is_paid === 1 };
                if (charge.category_id === 'income') allIncomes.push(item);
                else allExpenses.push(item);
            });
        });
    }

    // Income
    incomes.forEach(inc => {
        const d = getAdjustedDate(inc.payment_day, inc.nearest_working_day === 1);
        const key = `income_${inc.id}_${format(d, 'ddMM')}`;
        const prog = progressMap.get(key);
        if (prog?.is_paid === -1) return;
        allIncomes.push({ key, amount: prog?.actual_amount || inc.amount, date: d, isPaid: prog?.is_paid === 1 });
    });

    // Credit Cards
    if (Array.isArray(credit_cards)) {
        credit_cards.forEach(cc => {
            const d = getAdjustedDate(cc.payment_day || 1, true);
            const key = `credit_card_${cc.id}_${format(d, 'ddMM')}`;
            const prog = progressMap.get(key);
            if (prog?.is_paid === -1) return;
            allExpenses.push({ key, amount: prog?.actual_amount || 0, date: d, isPaid: prog?.is_paid === 1 });
        });
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const pastUnpaidExpenses = allExpenses.filter(e => isBefore(startOfDay(e.date), now) && !e.isPaid);
    const pastUnpaidIncomes = allIncomes.filter(e => isBefore(startOfDay(e.date), now) && !e.isPaid);
    const overdueAdjustment = pastUnpaidIncomes.reduce((s, i) => s + i.amount, 0) - pastUnpaidExpenses.reduce((s, e) => s + e.amount, 0);

    let runningBalance = currentBalance + overdueAdjustment;
    let lowestPoint = runningBalance;
    
    days.forEach(day => {
        if (isAfter(day, now) || isSameDay(day, now)) {
            const exp = allExpenses.filter(e => isSameDay(e.date, day) && !e.isPaid).reduce((s, e) => s + e.amount, 0);
            const inc = allIncomes.filter(i => isSameDay(i.date, day) && !i.isPaid).reduce((s, i) => s + i.amount, 0);
            runningBalance = runningBalance - exp + inc;
            if (runningBalance < lowestPoint) lowestPoint = runningBalance;
        }
    });

    const totalToPay = allExpenses.reduce((s, e) => s + e.amount, 0);
    const paidAmount = allExpenses.filter(e => e.isPaid).reduce((s, e) => s + e.amount, 0);
    const billsPct = (paidAmount / (totalToPay || 1)) * 100;
    const endOfCycle = runningBalance;

    return {
        lowestPoint, endOfCycle, billsPct, currentBalance, overdraftLimit,
        isOverdrawn: lowestPoint < 0,
        isLimitRisk: lowestPoint < -overdraftLimit,
        unpaidCount: allExpenses.filter(e => !e.isPaid).length,
        cycleLabel: format(startDate, 'MMMM yyyy'),
        daysRemaining,
        cycleProgress
    };

  }, [financeData]);

  if (loading) return (
    <WidgetWrapper title="Budget Health" icon={<Speed />} color="primary">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size="sm" />
        </Box>
    </WidgetWrapper>
  );

  if (!projection) return (
    <WidgetWrapper title="Budget Health" icon={<Speed />} color="primary">
        <Typography level="body-sm" color="neutral" sx={{ textAlign: 'center', mt: 4 }}>
            Set up a primary income source to track budget health.
        </Typography>
    </WidgetWrapper>
  );

  if (projection.noCycle) return (
    <WidgetWrapper title="Budget Health" icon={<Speed />} color="primary">
        <Stack spacing={2}>
            <Typography level="body-sm" color="neutral" sx={{ textAlign: 'center', mt: 2 }}>
                Setup required for <b>{projection.cycleLabel}</b> budget.
            </Typography>
            <Divider />
            <Box>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography level="body-xs">Cycle Progress</Typography>
                    <Typography level="body-xs" fontWeight="bold">{projection.daysRemaining} days to payday</Typography>
                </Stack>
                <LinearProgress determinate value={projection.cycleProgress} thickness={8} color="neutral" sx={{ borderRadius: 'xs' }} />
            </Box>
        </Stack>
    </WidgetWrapper>
  );

  return (
    <WidgetWrapper title="Budget Health" icon={<Speed />} color="primary">
      <Stack spacing={2}>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography level="title-sm">{projection.cycleLabel}</Typography>
            <Chip size="sm" color={projection.isOverdrawn ? 'danger' : 'success'} variant="soft">
                {projection.isOverdrawn ? (projection.isLimitRisk ? 'Limit Warning' : 'Overdrawn') : 'Healthy'}
            </Chip>
        </Box>

        <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography level="body-xs">Time until Payday</Typography>
                <Typography level="body-xs" fontWeight="bold">{projection.daysRemaining} days remaining</Typography>
            </Stack>
            <LinearProgress 
                determinate 
                value={projection.cycleProgress} 
                thickness={8} 
                color={projection.isOverdrawn ? 'warning' : 'primary'} 
                sx={{ borderRadius: 'xs' }} 
            />
        </Box>

        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography level="body-xs">Bills Paid</Typography>
                <Typography level="body-xs" fontWeight="bold">{Math.round(projection.billsPct)}%</Typography>
            </Box>
            <LinearProgress determinate value={projection.billsPct} thickness={8} color="success" sx={{ borderRadius: 'xs' }} />
        </Box>

        <Divider />

        <Stack spacing={1.5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography level="body-xs" color="neutral" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingDown sx={{ fontSize: '0.9rem' }} /> Lowest Point
                    </Typography>
                    <Typography level="title-sm" color={projection.isOverdrawn ? 'danger' : 'success'}>
                        {formatCurrency(projection.lowestPoint)}
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography level="body-xs" color="neutral" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                        <AccountBalanceWallet sx={{ fontSize: '0.9rem' }} /> End Balance
                    </Typography>
                    <Typography level="title-sm">
                        {formatCurrency(projection.endOfCycle)}
                    </Typography>
                </Box>
            </Box>

            {projection.isOverdrawn && (
                <Sheet variant="soft" color={projection.isLimitRisk ? 'danger' : 'warning'} sx={{ p: 1, borderRadius: 'sm', display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Warning sx={{ fontSize: '1.1rem' }} />
                    <Typography level="body-xs" fontWeight="bold">
                        {projection.isLimitRisk ? 'CRITICAL: Overdraft Limit Risk' : 'Deficit projected this month.'}
                    </Typography>
                </Sheet>
            )}
        </Stack>
      </Stack>
    </WidgetWrapper>
  );
}
