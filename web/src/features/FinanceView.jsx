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

import FinancialProfileSelector from '../components/ui/FinancialProfileSelector';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../utils/colors';
import { useFinanceProfiles } from '../hooks/useFinanceData';

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

  // Create Profile State
  const [openCreate, setOpenCreate] = useState(false);
  const [createEmoji, setCreateEmoji] = useState('💰');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
      <Box>
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
    return null;
  };

  const profileSwitcher = (
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
  );

  // Dashboard Grid View
  if (!activeTabKey) {
    return (
      <Box>
        <AppHeader
          title="Financial Matrix"
          description="Select a domain to manage your household wealth and liabilities."
          endDecorator={profileSwitcher}
        />
        <Grid container spacing={3}>
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
