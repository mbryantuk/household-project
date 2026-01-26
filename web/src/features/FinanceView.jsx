import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Box, Typography, Sheet, Grid, Card, Avatar, IconButton } from '@mui/joy';
import { 
  Payments, AccountBalance, Savings, CreditCard, RequestQuote, Home, 
  TrendingUp, HourglassBottom, PieChart, ArrowBack, ChevronRight, 
  DirectionsCar, Assignment, Receipt
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
import AgreementsView from './finance/AgreementsView';
import BudgetView from './finance/BudgetView';
import ChargesView from './finance/ChargesView';
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
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const viewMap = useMemo(() => ({
    budget: { label: 'Budget', icon: PieChart, desc: 'Analyze your financial health and spending limits.' },
    income: { label: 'Income', icon: Payments, desc: 'Manage salary, contracting, and other income streams.' },
    banking: { label: 'Banking', icon: AccountBalance, desc: 'Track balances, overdrafts, and account holders.' },
    savings: { label: 'Savings', icon: Savings, desc: 'Monitor savings goals and rainy day funds.' },
    invest: { label: 'Investments', icon: TrendingUp, desc: 'Monitor stocks, bonds, and crypto assets.' },
    pensions: { label: 'Pensions', icon: HourglassBottom, desc: 'Plan for your future retirement.' },
    credit: { label: 'Credit Cards', icon: CreditCard, desc: 'Track credit utilization and repayments.' },
    loans: { label: 'Loans', icon: RequestQuote, desc: 'Manage unsecured debts and repayment schedules.' },
    mortgage: { label: 'Mortgage', icon: Home, desc: 'Track property loans and home equity.' },
    charges: { label: 'Charges', icon: Receipt, desc: 'Manage household bills, utilities, and subscriptions.' },
    car: { label: 'Car Finance', icon: DirectionsCar, desc: 'Track loans and leases for your fleet.' },
    agreements: { label: 'Agreements', icon: Assignment, desc: 'Track mobile contracts and other obligations.' },
  }), []);

  const activeTabKey = tabParam === 'subscriptions' ? 'charges' : (tabParam || (isMobile ? null : 'budget'));
  const activeView = activeTabKey ? viewMap[activeTabKey] : null;

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
      if (activeTabKey === 'charges') return <ChargesView initialTab={tabParam} />;
      if (activeTabKey === 'car') return <VehicleFinanceView />;
      if (activeTabKey === 'agreements') return <AgreementsView />;
      
      if (!activeView) return null;
      
      return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{activeView?.label || 'Finance'}</Typography>
                <Typography level="body-md" color="neutral">{activeView?.desc || 'Manage your finances.'}</Typography>
            </Box>
            <Sheet variant="outlined" sx={{ borderRadius: 'md', p: 2, minHeight: '500px', bgcolor: 'background.surface' }}>
                <ComingSoonPlaceholder title={activeView?.label || 'Finance'} icon={activeView?.icon || Payments} />
            </Sheet>
        </Box>
      );
  };

  if (isMobile && !activeTabKey) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Finance</Typography>
          <Typography level="body-md" color="neutral">Manage your household wealth.</Typography>
        </Box>
        <Grid container spacing={2}>
          {Object.entries(viewMap).map(([key, config]) => (
            <Grid xs={12} key={key}>
              <Card variant="outlined" onClick={() => navigate(`?tab=${key}`)} sx={{ flexDirection: 'row', gap: 2, alignItems: 'center', cursor: 'pointer', '&:active': { bgcolor: 'background.level1' } }}>
                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(config.label ? config.label[0] : '?', isDark) }}><config.icon /></Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{config.label}</Typography>
                  <Typography level="body-xs" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{config.desc}</Typography>
                </Box>
                <ChevronRight sx={{ color: 'neutral.400' }} />
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (isMobile && activeTabKey) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton variant="plain" onClick={() => navigate('.')}>
            <ArrowBack />
          </IconButton>
          <Typography level="title-lg">{activeView?.label || 'Finance'}</Typography>
        </Box>
        {renderContent()}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {activeView && !isMobile && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography level="h2" sx={{ fontWeight: 'lg' }}>{activeView.label}</Typography>
          </Box>
      )}
      {renderContent()}
    </Box>
  );
}
