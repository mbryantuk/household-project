import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Sheet, Tabs, TabList, Tab, tabClasses } from '@mui/joy';
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
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tab = queryParams.get('tab') || 'budget';

  const viewMap = useMemo(() => ({
    budget: { label: 'Budget', icon: PieChart, desc: 'Analyze your financial health and spending limits.' },
    income: { label: 'Income', icon: Payments, desc: 'Manage salary, contracting, and other income streams.' },
    banking: { label: 'Banking', icon: AccountBalance, desc: 'Track balances, overdrafts, and account holders.' },
    savings: { label: 'Savings', icon: Savings, desc: 'Monitor savings goals and rainy day funds.' },
    credit: { label: 'Credit Cards', icon: CreditCard, desc: 'Track credit utilization and repayments.' },
    loans: { label: 'Loans', icon: RequestQuote, desc: 'Manage unsecured debts and repayment schedules.' },
    mortgage: { label: 'Mortgage', icon: Home, desc: 'Track property loans and equity.' },
    invest: { label: 'Investments', icon: TrendingUp, desc: 'Monitor stocks, bonds, and crypto assets.' },
    pensions: { label: 'Pensions', icon: HourglassBottom, desc: 'Plan for your future retirement.' },
  }), []);

  const activeView = viewMap[tab] || viewMap.budget;

  const handleTabChange = (event, newValue) => {
    navigate(`?tab=${newValue}`);
  };

  const renderContent = () => {
      if (tab === 'income') return <IncomeView />;
      if (tab === 'banking') return <BankingView />;
      
      // Default placeholder logic
      return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{activeView.label}</Typography>
                <Typography level="body-md" color="neutral">{activeView.desc}</Typography>
            </Box>
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
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
            bgcolor: 'transparent',
            mb: 3,
            [`& .${tabClasses.root}`]: {
                bgcolor: 'transparent',
                flexGrow: 0,
                minWidth: 'auto',
                '&:hover': { bgcolor: 'transparent' },
                '&[aria-selected="true"]': {
                    bgcolor: 'transparent',
                    color: 'primary.plainColor',
                    '&::after': {
                        height: 3,
                        borderTopLeftRadius: 3,
                        borderTopRightRadius: 3,
                        bgcolor: 'primary.500',
                    },
                },
            },
            [`& .${tabClasses.tabList}`]: {
                bgcolor: 'transparent',
                borderBottom: '1px solid',
                borderColor: 'divider',
                gap: 0,
            }
        }}
      >
        <TabList disableUnderline>
            {Object.entries(viewMap).map(([key, config]) => (
                <Tab key={key} value={key} sx={{ px: 2, gap: 1 }}>
                    <config.icon fontSize="small" />
                    {config.label}
                </Tab>
            ))}
        </TabList>
      </Tabs>

      {renderContent()}
    </Box>
  );
}