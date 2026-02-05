import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Box, Typography, Sheet, Grid, Card, IconButton } from '@mui/joy';
import { 
  Payments, AccountBalance, Savings, CreditCard, RequestQuote, Home, 
  TrendingUp, HourglassBottom, PieChart, ArrowBack, ChevronRight, 
  DirectionsCar
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
import FinancialProfileSelector from '../components/ui/FinancialProfileSelector';

export default function FinanceView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, api, id: householdId, showNotification } = useOutletContext();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  useEffect(() => {
    api.get(`/households/${householdId}/finance/profiles`)
       .then(res => {
          setProfiles(res.data);
          if (res.data.length > 0) {
              const def = res.data.find(p => p.is_default) || res.data[0];
              setSelectedProfileId(def.id);
          }
       })
       .catch(err => console.error("Failed to fetch profiles", err));
  }, [api, householdId]);

  const handleCreateProfile = async (data) => {
      try {
          const res = await api.post(`/households/${householdId}/finance/profiles`, data);
          setProfiles(prev => [...prev, res.data]);
          setSelectedProfileId(res.data.id);
          showNotification("Profile created", "success");
      } catch (err) {
          showNotification("Failed to create profile: " + err.message, "danger");
      }
  };
  
  const viewMap = useMemo(() => ({
    budget: { label: 'Monthly Budget', icon: PieChart, desc: 'Analyze your financial health and spending limits.' },
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
      if (!selectedProfileId) return null; // Wait for profile
      const props = { financialProfileId: selectedProfileId };

      if (activeTabKey === 'budget') return <BudgetView {...props} />;
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

  const ProfileSelector = () => (
      <FinancialProfileSelector 
        profiles={profiles} 
        selectedProfileId={selectedProfileId} 
        onSelect={setSelectedProfileId} 
        onCreate={handleCreateProfile}
        isDark={isDark}
      />
  );

  if (!activeTabKey) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <AppHeader 
            title="Financial Matrix" 
            description="Select a domain to manage your household wealth and liabilities." 
            />
            <ProfileSelector />
        </Box>
        <Grid container spacing={3}>
          {Object.entries(viewMap).map(([key, config]) => (
            <Grid xs={12} sm={6} md={4} lg={3} key={key}>
              <Card 
                variant="outlined" 
                onClick={() => navigate(`?tab=${key}`)} 
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
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton variant="outlined" color="neutral" onClick={() => navigate('.')}>
                <ArrowBack />
            </IconButton>
            <Typography level="title-lg" sx={{ ml: 1 }}>Back to Overview</Typography>
          </Box>
          <ProfileSelector />
        </Box>
        {renderContent()}
    </Box>
  );
}