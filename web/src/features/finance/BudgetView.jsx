import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Checkbox, Tooltip, LinearProgress, List, ListItem, ListItemDecorator, ListItemContent
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
  AccountBalance,
  Add,
  Shield,
  HistoryEdu,
  ShoppingBag,
  PriceCheck
} from '@mui/icons-material';
import { format, addMonths, startOfMonth, endOfMonth, setDate } from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BudgetView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  
  // Data State
  const [incomes, setIncomes] = useState([]);
  const [progress, setProgress] = useState([]); 
  const [liabilities, setLiabilities] = useState({
      mortgages: [], loans: [], agreements: [], vehicle_finance: [], 
      recurring_costs: [], credit_cards: [], water: null, council: null, energy: []
  });
  const [savingsPots, setSavingsPots] = useState([]);

  // User Inputs (Cycle override)
  const [actualPay, setActualPay] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');

  // Modal State
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
          incRes, progRes, mortRes, loanRes, agreeRes, carRes, costRes, ccRes, waterRes, councilRes, energyRes, potRes
      ] = await Promise.all([
          api.get(`/households/${householdId}/finance/income`),
          api.get(`/households/${householdId}/finance/budget-progress`),
          api.get(`/households/${householdId}/finance/mortgages`),
          api.get(`/households/${householdId}/finance/loans`),
          api.get(`/households/${householdId}/finance/agreements`),
          api.get(`/households/${householdId}/finance/vehicle-finance`),
          api.get(`/households/${householdId}/costs`),
          api.get(`/households/${householdId}/finance/credit-cards`),
          api.get(`/households/${householdId}/water`),
          api.get(`/households/${householdId}/council`),
          api.get(`/households/${householdId}/energy`),
          api.get(`/households/${householdId}/finance/savings/pots`)
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
      setSavingsPots(potRes.data || []);

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
      const primaryIncome = incomes.find(i => i.is_primary === 1) || incomes.find(i => i.payment_day > 0);
      if (!primaryIncome || !primaryIncome.payment_day) return null;

      const now = new Date();
      const payday = parseInt(primaryIncome.payment_day);
      
      let startDate;
      if (now.getDate() >= payday) {
          startDate = setDate(startOfMonth(now), payday);
      } else {
          startDate = setDate(startOfMonth(addMonths(now, -1)), payday);
      }

      const endDate = addMonths(startDate, 1);
      const label = format(startDate, 'MMM yyyy') + " Cycle";

      const expenses = [];

      const addExpense = (item, type, label, amount, day, icon, category) => {
          if (!day && type !== 'pot') return;
          const expenseDay = parseInt(day) || 1;
          const key = `${type}_${item.id || 'fixed'}`;
          const progressItem = progress.find(p => p.item_key === key && p.cycle_start === format(startDate, 'yyyy-MM-dd'));
          
          expenses.push({
              key,
              type,
              label,
              amount: progressItem?.actual_amount || parseFloat(amount) || 0,
              baseAmount: parseFloat(amount) || 0,
              day: type === 'pot' ? null : expenseDay,
              icon,
              category,
              isPaid: !!progressItem,
              isPot: type === 'pot',
              rawItem: item
          });
      };

      // 1. Mortgages
      liabilities.mortgages.forEach(m => addExpense(m, 'mortgage', `${m.lender} (${m.mortgage_type})`, m.monthly_payment, m.payment_day, <Home />, 'Liability'));
      // 2. Loans
      liabilities.loans.forEach(l => addExpense(l, 'loan', `${l.lender} Loan`, l.monthly_payment, l.payment_day, <TrendingDown />, 'Liability'));
      // 3. Agreements
      liabilities.agreements.forEach(a => addExpense(a, 'agreement', a.agreement_name, a.monthly_payment, a.payment_day, <Assignment />, 'Agreement'));
      // 4. Vehicle Finance
      liabilities.vehicle_finance.forEach(v => addExpense(v, 'car_finance', `${v.provider} (Car)`, v.monthly_payment, v.payment_day, <DirectionsCar />, 'Liability'));
      // 5. Recurring Costs (General + Asset-linked)
      liabilities.recurring_costs.forEach(c => {
          let icon = <Payments />;
          if (c.category === 'insurance') icon = <Shield />;
          if (c.category === 'subscription') icon = <ShoppingBag />;
          if (c.category === 'service') icon = <HistoryEdu />;
          addExpense(c, 'cost', c.name, c.amount, c.payment_day, icon, c.category || 'Cost');
      });
      // 6. Credit Cards
      liabilities.credit_cards.forEach(cc => addExpense(cc, 'credit', `${cc.card_name}`, 0, cc.payment_day, <CreditCard />, 'Credit Card'));
      // 7. Utilities
      if (liabilities.water) addExpense(liabilities.water, 'water', 'Water Bill', liabilities.water.monthly_amount, liabilities.water.payment_day, <WaterDrop />, 'Utility');
      if (liabilities.council) addExpense(liabilities.council, 'council', 'Council Tax', liabilities.council.monthly_amount, liabilities.council.payment_day, <AccountBalance />, 'Utility');
      liabilities.energy.forEach(e => addExpense(e, 'energy', `${e.provider} (${e.type})`, e.monthly_amount, e.payment_day, <ElectricBolt />, 'Utility'));

      // 8. Savings Pots
      savingsPots.forEach(pot => {
          addExpense(pot, 'pot', `Fund Pot: ${pot.name}`, 0, null, <SavingsIcon />, 'Saving');
      });

      return { startDate, endDate, label, expenses };
  }, [incomes, liabilities, progress, savingsPots]);

  const updateActualAmount = async (itemKey, amount) => {
      const cycleStart = format(cycleData.startDate, 'yyyy-MM-dd');
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
      const cycleStart = format(cycleData.startDate, 'yyyy-MM-dd');
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
      data.frequency = 'monthly';

      try {
          await api.post(`/households/${householdId}/costs`, data);
          showNotification("Expense added.", "success");
          fetchData();
          setQuickAddOpen(false);
      } catch (err) { alert("Failed to add"); }
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
                <Button startDecorator={<Add />} onClick={() => setQuickAddOpen(true)}>Add One-off Expense</Button>
                <Chip variant="soft" color="primary" startDecorator={<Event />}>Payday: {format(cycleData.startDate, 'do')}</Chip>
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
                                <th>Expense / Allocation</th>
                                <th style={{ width: 80 }}>Day</th>
                                <th style={{ width: 150 }}>Amount (£)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cycleData.expenses
                                .sort((a, b) => (a.day || 99) - (b.day || 99))
                                .map((exp) => (
                                <tr key={exp.key} style={exp.isPaid ? { opacity: 0.6, backgroundColor: 'var(--joy-palette-background-level1)' } : {}}>
                                    <td>
                                        <Checkbox 
                                            size="lg"
                                            checked={exp.isPaid}
                                            onChange={() => togglePaid(exp.key, exp.amount)}
                                            disabled={savingProgress}
                                            uncheckedIcon={<RadioButtonUnchecked />}
                                            checkedIcon={<CheckCircle color="success" />}
                                        />
                                    </td>
                                    <td>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar size="sm" sx={{ bgcolor: 'background.level2' }}>{exp.icon}</Avatar>
                                            <Box>
                                                <Typography level="title-sm">{exp.label}</Typography>
                                                <Typography level="body-xs" color="neutral">{exp.category.toUpperCase()}</Typography>
                                            </Box>
                                        </Box>
                                    </td>
                                    <td>{exp.day || '-'}</td>
                                    <td>
                                        <Input 
                                            size="sm"
                                            type="number"
                                            variant="soft"
                                            defaultValue={exp.amount}
                                            onBlur={(e) => updateActualAmount(exp.key, e.target.value)}
                                            slotProps={{ input: { step: 'any' } }}
                                            sx={{ maxWidth: 100, ml: 'auto' }}
                                            endDecorator={exp.isPaid && <PriceCheck color="success" sx={{ fontSize: '1rem' }}/>}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Sheet>
            </Grid>
        </Grid>

        <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)}>
            <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
                <DialogTitle>Quick Add Expense</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleQuickAdd}>
                        <Stack spacing={2}>
                            <FormControl required><FormLabel>Name</FormLabel><Input name="name" autoFocus /></FormControl>
                            <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: 'any' } }} /></FormControl>
                            <FormControl required><FormLabel>Payment Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={new Date().getDate()} /></FormControl>
                            <AppSelect 
                                label="Category"
                                name="category"
                                defaultValue="other"
                                options={[
                                    { value: 'subscription', label: 'Subscription' },
                                    { value: 'utility', label: 'Utility' },
                                    { value: 'insurance', label: 'Insurance' },
                                    { value: 'service', label: 'Warranty/Service' },
                                    { value: 'other', label: 'Other' }
                                ]}
                            />
                            <Button type="submit">Add to Budget</Button>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>
    </Box>
  );
}
