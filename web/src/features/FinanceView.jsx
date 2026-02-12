import React, { useMemo, useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Box, Typography, Sheet, Grid, Card, IconButton } from '@mui/joy';
import { 
  Payments, AccountBalance, Savings, CreditCard, RequestQuote, Home, 
  TrendingUp, HourglassBottom, PieChart, ArrowBack, ChevronRight, 
  DirectionsCar, Receipt
} from '@mui/icons-material';

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

export default function FinanceView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, api, id: householdId, showNotification } = useOutletContext();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  const profileParam = queryParams.get('financial_profile_id');
  
  const [profiles, setProfiles] = useState([]);

  // Fetch profiles on mount to pass to the selector
  useEffect(() => {
    api.get(`/households/${householdId}/finance/profiles`)
       .then(res => {
          setProfiles(res.data);
          // Auto-select default if no param
          if (!profileParam && res.data.length > 0) {
             const def = res.data.find(p => p.is_default) || res.data[0];
             const newParams = new URLSearchParams(location.search);
             newParams.set('financial_profile_id', def.id);
             navigate(`?${newParams.toString()}`, { replace: true });
          }
       })
       .catch(err => console.error("Failed to fetch profiles", err));
  }, [api, householdId, profileParam, location.search, navigate]);

  const handleCreateProfile = async (data) => {
      try {
          const res = await api.post(`/households/${householdId}/finance/profiles`, data);
          setProfiles(prev => [...prev, res.data]);
          // Switch to new profile
          const newParams = new URLSearchParams(location.search);
          newParams.set('financial_profile_id', res.data.id);
          navigate(`?${newParams.toString()}`);
          showNotification("Profile created", "success");
      } catch (err) {
          showNotification("Failed to create profile: " + err.message, "danger");
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
          const def = profiles.find(p => p.is_default) || profiles[0];
          targetProfileId = def.id;
      }
      navigate(`?tab=${key}&financial_profile_id=${targetProfileId || ''}`);
  };

  const handleBack = () => {
      const newParams = new URLSearchParams(location.search);
      newParams.delete('tab');
      navigate(`?${newParams.toString()}`);
  };

  const viewMap = useMemo(() => ({
    budget: { label: 'Monthly Budget', icon: PieChart, desc: 'Analyze your financial health and spending limits.' },
    charges: { label: 'Recurring Charges', icon: Receipt, desc: 'Manage bills, insurance, and subscriptions.' },
    income: { label: 'Income Sources', icon: Payments, desc: 'Manage salary, contracting, and other income streams.' },
    banking: { label: 'Current Accounts', icon: AccountBalance, desc: 'Track balances, overdrafts, and account holders.' },
    savings: { label: 'Savings & Pots', icon: Savings, desc: 'Monitor savings goals and rainy day funds.' },
    invest: { label: 'Investments', icon: TrendingUp, desc: 'Monitor stocks, bonds, and crypto assets.' },
    pensions: { label: 'Pensions', icon: HourglassBottom, desc: 'Plan for your future retirement.' },
    credit: { label: 'Credit Cards', icon: CreditCard, desc: 'Track credit utilization and repayments.' },
    loans: { label: 'Personal Loans', icon: RequestQuote, desc: 'Manage unsecured debts and repayment schedules.' },
    mortgage: { label: 'Mortgage & Equity', icon: Home, desc: 'Track property loans and home equity.' },
    car: { label: 'Car Finance', icon: DirectionsCar, desc: 'Track loans and leases for your fleet.' }
  }), []);

  const activeTabKey = tabParam;

  const renderContent = () => {
      if (!activeTabKey) return null;
      if (!profileParam) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Loading Profile...</Typography></Box>;

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

  // Only show switcher if there are profiles
  const profileSwitcher = profiles.length > 0 ? (
      <Box sx={{ width: 200 }}>
        <FinancialProfileSelector 
            profiles={profiles} 
            value={Number(profileParam)} 
            onChange={handleProfileSelect} 
            onProfileCreated={handleCreateProfile}
            label={null} // Low key: no label
        />
      </Box>
  ) : null;

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
                    p: 3, gap: 2, alignItems: 'center', cursor: 'pointer', 
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'background.level1', transform: 'translateY(-4px)', boxShadow: 'md' },
                    '&:active': { transform: 'translateY(0)' }
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
                  <Typography level="title-lg" sx={{ fontWeight: 'lg' }}>{config.label}</Typography>
                  <Typography level="body-xs" sx={{ mt: 1, opacity: 0.7 }}>{config.desc}</Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton variant="outlined" color="neutral" onClick={handleBack}>
                <ArrowBack />
            </IconButton>
            <Typography level="title-lg" sx={{ ml: 1 }}>Back to Overview</Typography>
          </Box>
          {profileSwitcher}
        </Box>
        {renderContent()}
    </Box>
  );
}