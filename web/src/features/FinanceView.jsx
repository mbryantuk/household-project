import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Box, Typography, Sheet, Tabs, TabList, Tab, tabClasses, Grid, Card, Avatar, Button, IconButton } from '@mui/joy';
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
  Construction,
  ArrowBack,
  ChevronRight
} from '@mui/icons-material';

import IncomeView from './finance/IncomeView';
import BankingView from './finance/BankingView';
import { getEmojiColor } from '../theme';

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
  const { isDark } = useOutletContext();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
  // Responsive Check
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
    credit: { label: 'Credit Cards', icon: CreditCard, desc: 'Track credit utilization and repayments.' },
    loans: { label: 'Loans', icon: RequestQuote, desc: 'Manage unsecured debts and repayment schedules.' },
    mortgage: { label: 'Mortgage', icon: Home, desc: 'Track property loans and equity.' },
    invest: { label: 'Investments', icon: TrendingUp, desc: 'Monitor stocks, bonds, and crypto assets.' },
    pensions: { label: 'Pensions', icon: HourglassBottom, desc: 'Plan for your future retirement.' },
  }), []);

  // Determine active tab. 
  // Desktop default: 'budget'. 
  // Mobile default: null (triggers menu) unless explicitly set.
  const activeTabKey = tabParam || (isMobile ? null : 'budget');
  const activeView = activeTabKey ? viewMap[activeTabKey] : null;

  const handleTabChange = (event, newValue) => {
    navigate(`?tab=${newValue}`);
  };

  const renderContent = () => {
      if (activeTabKey === 'income') return <IncomeView />;
      if (activeTabKey === 'banking') return <BankingView />;
      
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
                {activeTabKey === 'savings' ? (
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

  // MOBILE: Dashboard / Menu View
  if (isMobile && !activeTabKey) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
            Finance
          </Typography>
          <Typography level="body-md" color="neutral">
            Manage your household wealth.
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {Object.entries(viewMap).map(([key, config]) => (
            <Grid xs={12} key={key}>
              <Card 
                variant="outlined" 
                onClick={() => navigate(`?tab=${key}`)}
                sx={{ 
                  flexDirection: 'row', 
                  gap: 2, 
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:active': { bgcolor: 'background.level1' } 
                }}
              >
                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(config.label[0], isDark) }}>
                  <config.icon />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{config.label}</Typography>
                  <Typography level="body-xs" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {config.desc}
                  </Typography>
                </Box>
                <ChevronRight sx={{ color: 'neutral.400' }} />
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // MOBILE: Detail View (with Back button)
  if (isMobile && activeTabKey) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton variant="plain" onClick={() => navigate('.')}>
            <ArrowBack />
          </IconButton>
          <Typography level="title-lg">
             {activeView.label}
          </Typography>
        </Box>
        {renderContent()}
      </Box>
    );
  }

  // DESKTOP: Tabs + Content
  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={activeTabKey}
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