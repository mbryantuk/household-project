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
  PieChart 
} from '@mui/icons-material';

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

export default function FinanceView() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tab = queryParams.get('tab') || 'budget';

  const viewMap = useMemo(() => ({
    income: { label: 'Income Sources', icon: Payments, desc: 'Manage your salary and other income streams.' },
    banking: { label: 'Current Accounts', icon: AccountBalance, desc: 'Track daily spending accounts and overdrafts.' },
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
    <Box sx={{ p: { xs: 2, md: 4 } }}>
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
        <ComingSoonPlaceholder 
          title={activeView.label} 
          icon={activeView.icon} 
        />
      </Sheet>
    </Box>
  );
}
