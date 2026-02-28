import React, { useMemo, useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Sheet,
  Grid,
  Card,
  IconButton,
  CircularProgress,
  Button,
  Stack,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  Input,
  Tooltip,
} from '@mui/joy';
import {
  Payments,
  AccountBalance,
  Savings,
  CreditCard,
  RequestQuote,
  Home,
  TrendingUp,
  HourglassBottom,
  PieChart,
  ArrowBack,
  DirectionsCar,
  Receipt,
  Add,
  List as ListIcon,
  PictureAsPdf,
  TrackChanges as Target,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';

import AppHeader from '../components/ui/AppHeader';
import AppAvatar from '../components/ui/AppAvatar';

import IncomeView from './finance/IncomeView';
import BankingView from './finance/BankingView';
import SavingsView from './finance/SavingsView';
import InvestmentsView from './finance/InvestmentsView';
import PensionsView from './finance/PensionsView';
import CreditCardsView from './finance/CreditCardsView';
import LoansView from './finance/LoansView';
import MortgagesView from './finance/MortgagesView';
import VehicleFinanceView from './finance/VehicleFinanceView';
import BudgetView from './finance/BudgetView';
import ChargesView from './finance/ChargesView';
import TransactionLedger from './finance/TransactionLedger';
import SavingsGoalsView from './finance/SavingsGoalsView';
import PlaidSandbox from './finance/PlaidSandbox';

import FinancialProfileSelector from '../components/ui/FinancialProfileSelector';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../utils/colors';
import { useFinanceProfiles } from '../hooks/useFinanceData';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Alert } from '@mui/joy';
import { Warning, Lightbulb, Timeline } from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts';

export default function FinanceView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, api, household, showNotification } = useOutletContext();
  const householdId = household?.id;
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  const profileParam = queryParams.get('financial_profile_id');

  const { data: profiles = [], isLoading: loading } = useFinanceProfiles(api, householdId);
  const { data: anomalies = [] } = useQuery({
    queryKey: ['households', householdId, 'finance-insights'],
    queryFn: () =>
      api.get(`/households/${householdId}/finance/insights`).then((res) => res.data || []),
    enabled: !!householdId && !tabParam,
  });

  const { data: projectionData } = useQuery({
    queryKey: ['households', householdId, profileParam, 'wealth-projection'],
    queryFn: () =>
      api
        .get(`/households/${householdId}/finance/projection?financial_profile_id=${profileParam}`)
        .then((res) => res.data),
    enabled: !!householdId && !tabParam && !!profileParam,
  });

  const { data: debtStrategy } = useQuery({
    queryKey: ['households', householdId, profileParam, 'debt-strategy'],
    queryFn: () =>
      api
        .get(
          `/households/${householdId}/finance/debt-strategy?financial_profile_id=${profileParam}`
        )
        .then((res) => res.data),
    enabled: !!householdId && !tabParam && !!profileParam,
  });

  const createRecurringMutation = useMutation({
    mutationFn: (data) => api.post(`/households/${householdId}/finance/recurring-costs`, data),
    onSuccess: () => {
      showNotification('Recurring cost added to your budget!', 'success');
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'finance-insights'] });
    },
  });

  const handleAcceptSuggestion = (s) => {
    createRecurringMutation.mutate({
      name: s.name,
      amount: s.amount,
      category: s.category || 'Subscription',
      frequency: s.frequency,
      payment_day: 1, // Default
      financial_profile_id: profileParam,
    });
  };

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, limit }) =>
      api.put(`/households/${householdId}/finance/budget-categories/${id}`, {
        monthly_limit: limit,
      }),
    onSuccess: () => {
      showNotification('Budget limit updated!', 'success');
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'finance-insights'] });
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'finance-summary'] });
    },
  });

  // Create Profile State
  const [openCreate, setOpenCreate] = useState(false);
  const [createEmoji, setCreateEmoji] = useState('💰');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // 1. Auto-select default profile if none selected
  useEffect(() => {
    if (!loading && profiles.length > 0 && !profileParam) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      const newParams = new URLSearchParams(location.search);
      newParams.set('financial_profile_id', def.id);
      navigate(`?${newParams.toString()}`, { replace: true });
    }
  }, [loading, profiles, profileParam, location.search, navigate]);

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      emoji: createEmoji,
      is_default: profiles.length === 0, // Make default if first one
    };

    try {
      const res = await api.post(`/households/${householdId}/finance/profiles`, data);
      const newProfile = res.data;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'finance-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'finance-summary'] });

      // Switch to new profile immediately
      const newParams = new URLSearchParams(location.search);
      newParams.set('financial_profile_id', newProfile.id);
      navigate(`?${newParams.toString()}`, { replace: true });

      showNotification('Profile created', 'success');
      setOpenCreate(false);
      setCreateEmoji('💰');
    } catch (err) {
      showNotification(
        'Failed to create profile: ' + (err.response?.data?.error || err.message),
        'danger'
      );
    }
  };

  const handleDownloadReport = async () => {
    setIsGeneratingReport(true);
    try {
      showNotification('Generating your monthly report PDF...', 'neutral');
      const res = await api.get(`/households/${householdId}/finance/report`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 7);
      link.setAttribute('download', `Hearthstone-Report-${dateStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('Report downloaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to generate report.', 'danger');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleProfileSelect = (id) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set('financial_profile_id', id);
    navigate(`?${newParams.toString()}`);
  };

  const handleCardClick = (key) => {
    let targetProfileId = profileParam;
    if (!targetProfileId && profiles.length > 0) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      targetProfileId = def.id;
    }
    navigate(`?tab=${key}&financial_profile_id=${targetProfileId || ''}`);
  };

  const handleBack = () => {
    const newParams = new URLSearchParams(location.search);
    newParams.delete('tab');
    navigate(`?${newParams.toString()}`);
  };

  const viewMap = useMemo(
    () => ({
      budget: {
        label: 'Monthly Budget',
        icon: PieChart,
        desc: 'Analyze your financial health and spending limits.',
      },
      ledger: {
        label: 'Transaction Ledger',
        icon: ListIcon,
        desc: 'Audit and reconcile all household transactions.',
      },
      charges: {
        label: 'Recurring Charges',
        icon: Receipt,
        desc: 'Manage bills, insurance, and subscriptions.',
      },
      income: {
        label: 'Income Sources',
        icon: Payments,
        desc: 'Manage salary, contracting, and other income streams.',
      },
      banking: {
        label: 'Current Accounts',
        icon: AccountBalance,
        desc: 'Track balances, overdrafts, and account holders.',
      },
      savings: {
        label: 'Savings & Pots',
        icon: Savings,
        desc: 'Monitor savings goals and rainy day funds.',
      },
      invest: {
        label: 'Investments',
        icon: TrendingUp,
        desc: 'Monitor stocks, bonds, and crypto assets.',
      },
      pensions: {
        label: 'Pensions',
        icon: HourglassBottom,
        desc: 'Plan for your future retirement.',
      },
      credit: {
        label: 'Credit Cards',
        icon: CreditCard,
        desc: 'Track credit utilization and repayments.',
      },
      loans: {
        label: 'Personal Loans',
        icon: RequestQuote,
        desc: 'Manage unsecured debts and repayment schedules.',
      },
      mortgage: {
        label: 'Mortgage & Equity',
        icon: Home,
        desc: 'Track property loans and home equity.',
      },
      car: {
        label: 'Car Finance',
        icon: DirectionsCar,
        desc: 'Track loans and leases for your fleet.',
      },
      goals: {
        label: 'Savings Goals',
        icon: Target,
        desc: 'Track and visualize long-term household savings targets.',
      },
      plaid: {
        label: 'Bank Sync (Mock)',
        icon: LinkIcon,
        desc: 'Simulate linking real-world bank accounts via Plaid sandbox.',
      },
    }),
    []
  );

  const activeTabKey = tabParam;

  // Shared Modal Component
  const createProfileModal = (
    <>
      <Modal open={openCreate} onClose={() => setOpenCreate(false)}>
        <ModalDialog>
          <DialogTitle>Create Financial Profile</DialogTitle>
          <DialogContent>
            <form onSubmit={handleCreateProfile}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, mt: 2 }}>
                <IconButton
                  onClick={() => setShowEmojiPicker(true)}
                  variant="outlined"
                  sx={{
                    width: 48,
                    height: 48,
                    fontSize: '1.5rem',
                    bgcolor: getEmojiColor(createEmoji, isDark),
                  }}
                >
                  {createEmoji}
                </IconButton>
                <FormControl sx={{ flexGrow: 1 }} required>
                  <FormLabel>Profile Name</FormLabel>
                  <Input name="name" placeholder="e.g. Joint Account..." autoFocus />
                </FormControl>
              </Box>
              <DialogActions>
                <Button variant="plain" color="neutral" onClick={() => setOpenCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </DialogActions>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>

      <EmojiPicker
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={(e) => {
          setCreateEmoji(e);
          setShowEmojiPicker(false);
        }}
        isDark={isDark}
      />
    </>
  );

  if (loading && profiles.length === 0)
    return (
      <Box sx={{ p: 10, textAlign: 'center' }}>
        <CircularProgress size="lg" />
        <Typography sx={{ mt: 2 }}>Loading Financial Data...</Typography>
      </Box>
    );

  // If no profiles exist, show empty state
  if (profiles.length === 0) {
    return (
      <Box data-testid="finance-view">
        <AppHeader
          title="Financial Matrix"
          description="Select a domain to manage your household wealth and liabilities."
          endDecorator={
            <Button
              variant="soft"
              color="primary"
              startDecorator={<Add />}
              onClick={() => setOpenCreate(true)}
            >
              New Profile
            </Button>
          }
        />
        <Sheet
          variant="soft"
          color="neutral"
          sx={{
            p: 4,
            borderRadius: 'md',
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'neutral.outlinedBorder',
            mt: 4,
          }}
        >
          <Typography level="h3">No Financial Profile Found</Typography>
          <Typography level="body-md" sx={{ mt: 1, mb: 3, maxWidth: 600, mx: 'auto' }}>
            Financial data is segmented by profiles (e.g., "Joint", "Personal"). You must create at
            least one profile to begin tracking banking, income, and liabilities.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="solid"
              color="primary"
              startDecorator={<Add />}
              onClick={() => setOpenCreate(true)}
            >
              Create Profile
            </Button>
            {activeTabKey && (
              <Button variant="outlined" color="neutral" onClick={handleBack}>
                Go Back
              </Button>
            )}
          </Stack>
        </Sheet>
        {createProfileModal}
      </Box>
    );
  }

  // Helper to render active tab content
  const renderContent = () => {
    if (!activeTabKey) return null;
    if (!profileParam) return null; // Should be handled by effect, but safe guard

    const props = { financialProfileId: profileParam };

    if (activeTabKey === 'budget') return <BudgetView {...props} />;
    if (activeTabKey === 'ledger') return <TransactionLedger api={api} householdId={householdId} />;
    if (activeTabKey === 'charges') return <ChargesView {...props} />;
    if (activeTabKey === 'income') return <IncomeView {...props} />;
    if (activeTabKey === 'banking') return <BankingView {...props} />;
    if (activeTabKey === 'savings') return <SavingsView {...props} />;
    if (activeTabKey === 'invest') return <InvestmentsView {...props} />;
    if (activeTabKey === 'pensions') return <PensionsView {...props} />;
    if (activeTabKey === 'credit') return <CreditCardsView {...props} />;
    if (activeTabKey === 'loans') return <LoansView {...props} />;
    if (activeTabKey === 'mortgage') return <MortgagesView {...props} />;
    if (activeTabKey === 'car') return <VehicleFinanceView {...props} />;
    if (activeTabKey === 'goals') return <SavingsGoalsView {...props} />;
    if (activeTabKey === 'plaid') return <PlaidSandbox {...props} />;
    return null;
  };

  const profileSwitcher = (
    <Stack direction="row" spacing={2} alignItems="center">
      <Tooltip title="Generate Monthly PDF Report (Item 222)" variant="soft">
        <Button
          variant="soft"
          color="neutral"
          startDecorator={<PictureAsPdf />}
          onClick={handleDownloadReport}
          loading={isGeneratingReport}
        >
          Report
        </Button>
      </Tooltip>
      <Box sx={{ width: 200 }}>
        <FinancialProfileSelector
          profiles={profiles}
          value={Number(profileParam)}
          onChange={handleProfileSelect}
          onProfileCreated={() =>
            queryClient.invalidateQueries({
              queryKey: ['households', householdId, 'finance-profiles'],
            })
          }
          label={null}
        />
      </Box>
    </Stack>
  );

  // Dashboard Grid View
  if (!activeTabKey) {
    return (
      <Box data-testid="finance-view">
        <AppHeader
          title="Financial Matrix"
          description="Select a domain to manage your household wealth and liabilities."
          endDecorator={profileSwitcher}
        />

        {anomalies && anomalies.anomalies?.length > 0 && (
          <Stack spacing={2} sx={{ mb: 3 }}>
            {anomalies.anomalies.map((anomaly, idx) => (
              <Alert key={idx} color="warning" startDecorator={<Warning />} variant="soft">
                <Box>
                  <Typography level="title-md">{anomaly.title}</Typography>
                  <Typography level="body-sm">{anomaly.message}</Typography>
                </Box>
              </Alert>
            ))}
          </Stack>
        )}

        {anomalies && anomalies.suggestions?.length > 0 && (
          <Stack spacing={2} sx={{ mb: 3 }}>
            {anomalies.suggestions.map((s, idx) => (
              <Alert
                key={idx}
                color="success"
                startDecorator={<Lightbulb />}
                variant="soft"
                endDecorator={
                  <Button
                    size="sm"
                    variant="solid"
                    color="success"
                    onClick={() => handleAcceptSuggestion(s)}
                    loading={createRecurringMutation.isPending}
                  >
                    Track as Recurring
                  </Button>
                }
              >
                <Box>
                  <Typography level="title-md">Recurring Cost Suggestion</Typography>
                  <Typography level="body-sm">{s.message}</Typography>
                </Box>
              </Alert>
            ))}
          </Stack>
        )}

        {anomalies && anomalies.budgetAdjustments?.length > 0 && (
          <Stack spacing={2} sx={{ mb: 3 }}>
            {anomalies.budgetAdjustments.map((adj, idx) => (
              <Alert
                key={idx}
                color="info"
                startDecorator={<Lightbulb />}
                variant="soft"
                endDecorator={
                  <Button
                    size="sm"
                    variant="solid"
                    color="info"
                    onClick={() =>
                      updateBudgetMutation.mutate({ id: adj.categoryId, limit: adj.suggestedLimit })
                    }
                    loading={updateBudgetMutation.isPending}
                  >
                    Adjust to £{adj.suggestedLimit}
                  </Button>
                }
              >
                <Box>
                  <Typography level="title-md">Budget Optimization</Typography>
                  <Typography level="body-sm">{adj.message}</Typography>
                </Box>
              </Alert>
            ))}
          </Stack>
        )}

        {debtStrategy && debtStrategy.debts?.length > 0 && (
          <Alert color="primary" startDecorator={<TrendingUp />} variant="soft" sx={{ mb: 3 }}>
            <Box>
              <Typography level="title-md">
                Debt Payoff Strategy: {debtStrategy.recommendedStrategy}
              </Typography>
              <Typography level="body-sm">{debtStrategy.message}</Typography>
              <Box sx={{ mt: 1 }}>
                <Typography level="body-xs" fontWeight="bold">
                  Recommended Order:
                </Typography>
                <Typography level="body-xs">
                  {debtStrategy[`${debtStrategy.recommendedStrategy.toLowerCase()}Order`]
                    ?.map((d, i) => `${i + 1}. ${d.name} (£${d.balance})`)
                    .join(' ➔ ')}
                </Typography>
              </Box>
            </Box>
          </Alert>
        )}

        <Grid container spacing={3}>
          {projectionData && projectionData.projection?.length > 0 && (
            <Grid xs={12}>
              <Card variant="soft" sx={{ p: 3 }}>
                <Typography level="title-lg" startDecorator={<Timeline />} sx={{ mb: 2 }}>
                  Wealth Horizon (12-Month Projection)
                </Typography>
                <Box sx={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectionData.projection}>
                      <defs>
                        <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="var(--joy-palette-primary-solidBg)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--joy-palette-primary-solidBg)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip formatter={(val) => `£${val.toLocaleString()}`} />
                      <Area
                        type="monotone"
                        dataKey="netWorth"
                        stroke="var(--joy-palette-primary-solidBg)"
                        fillOpacity={1}
                        fill="url(#colorNetWorth)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
                <Typography level="body-xs" textAlign="center" sx={{ mt: 1, opacity: 0.7 }}>
                  * Projection based on current income, recurring costs, and estimated monthly
                  growth of £{projectionData.estimatedMonthlyGrowth?.toLocaleString()}.
                </Typography>
              </Card>
            </Grid>
          )}

          {Object.entries(viewMap).map(([key, config]) => (
            <Grid xs={12} sm={6} md={4} lg={3} key={key}>
              <Card
                variant="outlined"
                onClick={() => handleCardClick(key)}
                sx={{
                  p: 3,
                  gap: 2,
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'background.level1',
                    transform: 'translateY(-4px)',
                    boxShadow: 'md',
                  },
                  '&:active': { transform: 'translateY(0)' },
                }}
              >
                <AppAvatar
                  size="lg"
                  emoji={config.label ? config.label[0] : '?'}
                  isDark={isDark}
                  sx={{ '--Avatar-size': '64px' }}
                >
                  <config.icon sx={{ fontSize: '2rem' }} />
                </AppAvatar>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography level="title-lg" sx={{ fontWeight: 'lg' }}>
                    {config.label}
                  </Typography>
                  <Typography level="body-xs" sx={{ mt: 1, opacity: 0.7 }}>
                    {config.desc}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
        {createProfileModal}
      </Box>
    );
  }

  // Active Tab View
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton variant="outlined" color="neutral" onClick={handleBack}>
            <ArrowBack />
          </IconButton>
          <Typography level="title-lg" sx={{ ml: 1 }}>
            Back to Overview
          </Typography>
        </Box>
        {profileSwitcher}
      </Box>
      {renderContent()}
      {createProfileModal}
    </Box>
  );
}
