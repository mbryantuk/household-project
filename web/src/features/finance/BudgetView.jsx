import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Input, FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, Tooltip, LinearProgress
} from '@mui/joy';
import { 
  PieChart, 
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
  AccountBalance
} from '@mui/icons-material';
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval, setDate, isAfter, isBefore } from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BudgetView() {
  const { api, id: householdId, user: currentUser, isDark } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  
  // Data State
  const [incomes, setIncomes] = useState([]);
  const [progress, setProgress] = useState([]); // List of paid item keys
  const [liabilities, setLiabilities] = useState({
      mortgages: [], loans: [], agreements: [], vehicle_finance: [], 
      recurring_costs: [], credit_cards: [], water: null, council: null, energy: []
  });

  // User Inputs (Cycle override)
  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
          incRes, progRes, mortRes, loanRes, agreeRes, carRes, costRes, ccRes, waterRes, councilRes, energyRes
      ] = await Promise.all([
          api.get(`/households/${householdId}/finance/income`),
          api.get(`/households/${householdId}/finance/budget-progress`), // We'll need this endpoint
          api.get(`/households/${householdId}/finance/mortgages`),
          api.get(`/households/${householdId}/finance/loans`),
          api.get(`/households/${householdId}/finance/agreements`),
          api.get(`/households/${householdId}/finance/vehicle-finance`),
          api.get(`/households/${householdId}/recurring-costs`),
          api.get(`/households/${householdId}/finance/credit-cards`),
          api.get(`/households/${householdId}/water`),
          api.get(`/households/${householdId}/council`),
          api.get(`/households/${householdId}/energy`)
      ]);

      setIncomes(incRes.data || []);
      setProgress(progRes.data || []);
      setLiabilities({
          mortgages: mortRes.data || [],
          loans: loanRes.data || [],
          agreements: agreeRes.data || [],
          vehicle_finance: carRes.data || [],
          recurring_costs: costRes.data || [],
          credit_cards: ccRes.data || [],
          water: waterRes.data,
          council: councilRes.data,
          energy: energyRes.data || []
      });

      // Default actual pay from primary income if available
      const primary = incRes.data?.find(i => i.is_primary);
      if (primary) setActualPay(primary.amount);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- LOGIC: PAYCHECK TO PAYCHECK ---
  const cycleData = useMemo(() => {
      // Find explicitly flagged primary, or fallback to any income with a payment_day
      const primaryIncome = incomes.find(i => i.is_primary === 1) || incomes.find(i => i.payment_day > 0);
      if (!primaryIncome || !primaryIncome.payment_day) return null;

      const now = new Date();
      const payday = parseInt(primaryIncome.payment_day);
      
      let startDate;
      if (now.getDate() >= payday) {
          // We are in this month's cycle
          startDate = setDate(startOfMonth(now), payday);
      } else {
          // We are in last month's cycle
          startDate = setDate(startOfMonth(addMonths(now, -1)), payday);
      }

      const endDate = addMonths(startDate, 1);
      const label = format(startDate, 'MMM yyyy') + " Cycle";

      // Aggregate all expenses falling in this window
      const expenses = [];

      const addExpense = (item, type, label, amount, day, icon) => {
          if (!day || !amount) return;
          const expenseDay = parseInt(day);
          // Simple logic: if day is < payday, it falls in the "next" calendar month of this cycle
          // e.g. Payday 19th. Bill 1st. Jan 1st is NOT in Jan 19 cycle. Feb 1st IS.
          expenses.push({
              key: `${type}_${item.id || 'fixed'}`,
              type,
              label,
              amount: parseFloat(amount),
              day: expenseDay,
              icon,
              isPaid: progress.some(p => p.item_key === `${type}_${item.id || 'fixed'}` && p.cycle_start === format(startDate, 'yyyy-MM-dd'))
          });
      };

      // 1. Mortgages
      liabilities.mortgages.forEach(m => addExpense(m, 'mortgage', `${m.lender} (${m.mortgage_type})`, m.monthly_payment, m.payment_day, <Home />));
      // 2. Loans
      liabilities.loans.forEach(l => addExpense(l, 'loan', `${l.lender} Loan`, l.monthly_payment, l.payment_day, <TrendingDown />));
      // 3. Agreements
      liabilities.agreements.forEach(a => addExpense(a, 'agreement', a.agreement_name, a.monthly_payment, a.payment_day, <Assignment />));
      // 4. Vehicle Finance
      liabilities.vehicle_finance.forEach(v => addExpense(v, 'car_finance', `${v.provider} (Car)`, v.monthly_payment, v.payment_day, <DirectionsCar />));
      // 5. Recurring Costs
      liabilities.recurring_costs.forEach(c => addExpense(c, 'cost', c.name, c.amount, c.payment_day, <Payments />));
      // 6. Credit Cards
      liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit', `${cc.card_name} Payment`, 0, cc.payment_day, <CreditCard />)); // Amount usually varies
      // 7. Utilities
      if (liabilities.water) addExpense(liabilities.water, 'water', 'Water Bill', liabilities.water.monthly_amount, liabilities.water.payment_day, <WaterDrop />);
      if (liabilities.council) addExpense(liabilities.council, 'council', 'Council Tax', liabilities.council.monthly_amount, liabilities.council.payment_day, <AccountBalance />);
      liabilities.energy.forEach(e => addExpense(e, 'energy', `${e.provider} (${e.type})`, e.monthly_amount, e.payment_day, <ElectricBolt />));

      return { startDate, endDate, label, expenses };
  }, [incomes, liabilities, progress]);

  const togglePaid = async (itemKey) => {
      if (!cycleData) return;
      setSavingProgress(true);
      const cycleStart = format(cycleData.startDate, 'yyyy-MM-dd');
      try {
          const isCurrentlyPaid = progress.some(p => p.item_key === itemKey && p.cycle_start === cycleStart);
          if (isCurrentlyPaid) {
              await api.delete(`/households/${householdId}/finance/budget-progress/${cycleStart}/${itemKey}`);
          } else {
              await api.post(`/households/${householdId}/finance/budget-progress`, {
                  cycle_start: cycleStart,
                  item_key: itemKey,
                  is_paid: 1
              });
          }
          // Refresh progress only
          const progRes = await api.get(`/households/${householdId}/finance/budget-progress`);
          setProgress(progRes.data || []);
      } catch (err) {
          console.error(err);
      } finally {
          setSavingProgress(false);
      }
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
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{cycleData.label}</Typography>
                <Typography level="body-md" color="neutral">
                    {format(cycleData.startDate, 'do MMM')} to {format(cycleData.endDate, 'do MMM')}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip variant="soft" color="primary" startDecorator={<Event />}>Payday: {format(cycleData.startDate, 'do')}</Chip>
            </Box>
        </Box>

        <Grid container spacing={3}>
            {/* COLUMN 1: SUMMARY & INPUTS */}
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
                        <LinearProgress 
                            determinate 
                            value={Math.min((totals.paid / totals.total) * 100, 100)} 
                            sx={{ mt: 2, height: 8, borderRadius: 4 }}
                        />
                        <Typography level="body-xs" sx={{ mt: 1, textAlign: 'right' }}>
                            {((totals.paid / totals.total) * 100).toFixed(0)}% Bills Paid
                        </Typography>
                    </Card>

                    <Card variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography level="body-sm">Total Expenses</Typography>
                                <Typography level="body-sm" fontWeight="bold">{formatCurrency(totals.total)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography level="body-sm">Paid So Far</Typography>
                                <Typography level="body-sm" fontWeight="bold" color="success">{formatCurrency(totals.paid)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography level="body-sm">Remaining Bills</Typography>
                                <Typography level="body-sm" fontWeight="bold" color="warning">{formatCurrency(totals.unpaid)}</Typography>
                            </Box>
                        </Stack>
                    </Card>
                </Stack>
            </Grid>

            {/* COLUMN 2: EXPENSES TABLE */}
            <Grid xs={12} md={8}>
                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
                    <Table hoverRow sx={{ '& tr > *:last-child': { textAlign: 'right' } }}>
                        <thead>
                            <tr>
                                <th style={{ width: 48 }}>Paid</th>
                                <th>Expense</th>
                                <th style={{ width: 80 }}>Day</th>
                                <th style={{ width: 120 }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cycleData.expenses
                                .sort((a, b) => a.day - b.day)
                                .map((exp) => (
                                <tr key={exp.key} style={exp.isPaid ? { opacity: 0.6, backgroundColor: 'var(--joy-palette-background-level1)' } : {}}>
                                    <td>
                                        <Checkbox 
                                            size="lg"
                                            checked={exp.isPaid}
                                            onChange={() => togglePaid(exp.key)}
                                            disabled={savingProgress}
                                            uncheckedIcon={<RadioButtonUnchecked />}
                                            checkedIcon={<CheckCircle color="success" />}
                                        />
                                    </td>
                                    <td>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar size="sm" sx={{ bgcolor: 'background.level2' }}>
                                                {exp.icon}
                                            </Avatar>
                                            <Box>
                                                <Typography level="title-sm">{exp.label}</Typography>
                                                <Typography level="body-xs" color="neutral">{exp.type.replace('_', ' ').toUpperCase()}</Typography>
                                            </Box>
                                        </Box>
                                    </td>
                                    <td>{exp.day}</td>
                                    <td>
                                        <Typography fontWeight="bold">
                                            {formatCurrency(exp.amount)}
                                        </Typography>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Sheet>
            </Grid>
        </Grid>
    </Box>
  );
}
