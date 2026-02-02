import React, { useMemo } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Box, Typography, Sheet, Grid, Card, Avatar, IconButton } from '@mui/joy';
import { 
  Payments, AccountBalance, Savings, CreditCard, RequestQuote, Home, 
  TrendingUp, HourglassBottom, PieChart, ArrowBack, ChevronRight, 
  DirectionsCar
} from '@mui/icons-material';

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
import { getEmojiColor } from '../theme';

const ComingSoonPlaceholder = ({ title, icon }) => {
  const IconComponent = icon;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: 2, color: 'neutral.400' }}>
      <IconComponent sx={{ fontSize: 64, opacity: 0.5 }} />
      <Typography level="h3" sx={{ color: 'inherit' }}>{title}</Typography>
      <Typography level="body-md">Coming Soon</Typography>
    </Box>
  );
};

export default function FinanceView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useOutletContext();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
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

  const activeTabKey = tabParam; // No default on any device to show landing page

  const renderContent = () => {
      if (activeTabKey === 'budget') return <BudgetView />;
      if (activeTabKey === 'income') return <IncomeView />;
      if (activeTabKey === 'banking') return <BankingView />;
      if (activeTabKey === 'savings') return <SavingsView />;
      if (activeTabKey === 'invest') return <InvestmentsView />;
      if (activeTabKey === 'pensions') return <PensionsView />;
      if (activeTabKey === 'credit') return <CreditCardsView />;
      if (activeTabKey === 'loans') return <LoansView />;
      if (activeTabKey === 'mortgage') return <MortgagesView />;
      if (activeTabKey === 'car') return <VehicleFinanceView />;
      return null;
  };

  // Selector view (LANDING PAGE) for all devices when no tab is selected
  if (!activeTabKey) {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Financial Matrix</Typography>
          <Typography level="body-md" color="neutral">Select a domain to manage your household wealth and liabilities.</Typography>
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
                <Avatar 
                    size="lg" 
                    sx={{ 
                        bgcolor: getEmojiColor(config.label ? config.label[0] : '?', isDark),
                        '--Avatar-size': '64px'
                    }}
                >
                    <config.icon sx={{ fontSize: '2rem' }} />
                </Avatar>
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

  // Active Tab view
  return (
    <Box sx={{ width: '100%' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton variant="outlined" color="neutral" onClick={() => navigate('.')}>
            <ArrowBack />
          </IconButton>
          <Typography level="title-lg" sx={{ ml: 1 }}>Back to Overview</Typography>
        </Box>
        {renderContent()}
    </Box>
  );
}
