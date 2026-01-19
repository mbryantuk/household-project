import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Sheet } from '@mui/joy';
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
  Construction
} from '@mui/icons-material';

import IncomeView from './finance/IncomeView';
import BankingView from './finance/BankingView';

const ComingSoonPlaceholder = ({ title, icon: Icon }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '400px', 
    gap: 2,
    color: 'neutral.400'
  }}>
    <Icon sx={{ fontSize: 64, opacity: 0.5 }} />
    <Typography level="h3" sx={{ color: 'inherit' }}>{title}</Typography>
    <Typography level="body-md">Coming Soon</Typography>
  </Box>
);

const WipPlaceholder = ({ title }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '400px', 
    gap: 2,
    color: 'warning.500'
  }}>
    <Construction sx={{ fontSize: 64, opacity: 0.8 }} />
    <Typography level="h3" sx={{ color: 'inherit' }}>{title}</Typography>
    <Typography level="body-lg" sx={{ fontWeight: 'lg' }}>Work In Progress</Typography>
    <Typography level="body-sm" sx={{ color: 'neutral.500' }}>We are currently rebuilding this feature to serve you better.</Typography>
  </Box>
);

export default function FinanceView() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tab = queryParams.get('tab') || 'budget';

  if (tab === 'income') return <IncomeView />;
  if (tab === 'banking') return <BankingView />;

  const viewMap = useMemo(() => ({
    savings: { label: 'Savings & Pots', icon: Savings, desc: 'Monitor savings goals and rainy day funds.' },
    credit: { label: 'Credit Cards', icon: CreditCard, desc: 'Track credit utilization and repayments.' },
    loans: { label: 'Personal Loans', icon: RequestQuote, desc: 'Manage unsecured debts and repayment schedules.' },
    mortgage: { label: 'Mortgages', icon: Home, desc: 'Track property loans and equity.' },
    invest: { label: 'Investments', icon: TrendingUp, desc: 'Monitor stocks, bonds, and crypto assets.' },
    pensions: { label: 'Pensions', icon: HourglassBottom, desc: 'Plan for your future retirement.' },
    budget: { label: 'Budget Overview', icon: PieChart, desc: 'Analyze your financial health and spending limits.' },
  }), []);

  const activeView = viewMap[tab] || viewMap.budget;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{activeView.label}</Typography>
        <Typography level="body-md" color="neutral">{activeView.desc}</Typography>
      </Box>

      {/* Content Area */}
      <Sheet 
        variant="outlined" 
        sx={{ 
          borderRadius: 'md', 
          p: 2, 
          minHeight: '500px',
          bgcolor: 'background.surface'
        }}
      >
        {tab === 'savings' ? (
          <WipPlaceholder title={activeView.label} />
        ) : (
          <ComingSoonPlaceholder 
            title={activeView.label} 
            icon={activeView.icon} 
          />
        )}
      </Sheet>
    </Box>
  );
}