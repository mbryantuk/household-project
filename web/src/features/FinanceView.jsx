import React, { useState } from 'react';
import { Box, Typography, Tabs, TabList, Tab, Sheet } from '@mui/joy';
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
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: 'Income', icon: Payments },
    { label: 'Banking', icon: AccountBalance },
    { label: 'Savings', icon: Savings },
    { label: 'Credit', icon: CreditCard },
    { label: 'Loans', icon: RequestQuote },
    { label: 'Mortgage', icon: Home },
    { label: 'Invest', icon: TrendingUp },
    { label: 'Pensions', icon: HourglassBottom },
    { label: 'Budget', icon: PieChart },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Finance</Typography>
        <Typography level="body-md" color="neutral">Manage your household wealth, debts, and budgets.</Typography>
      </Box>

      {/* Category Bar */}
      <Tabs 
        value={activeTab} 
        onChange={(e, v) => setActiveTab(v)} 
        sx={{ bgcolor: 'transparent' }}
      >
        <TabList 
          sx={{ 
            p: 0.5, 
            gap: 0.5, 
            borderRadius: 'xl', 
            bgcolor: 'background.level1', 
            overflow: 'auto',
            scrollSnapType: 'x mandatory',
            '&::-webkit-scrollbar': { display: 'none' }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab 
              key={index}
              variant={activeTab === index ? 'solid' : 'plain'} 
              color={activeTab === index ? 'primary' : 'neutral'} 
              sx={{ flex: 'none', scrollSnapAlign: 'start', borderRadius: 'md' }}
            >
              <tab.icon sx={{ mr: 1 }}/> {tab.label}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      {/* Content Area */}
      <Sheet 
        variant="outlined" 
        sx={{ 
          mt: 2, 
          borderRadius: 'md', 
          p: 2, 
          minHeight: '500px',
          bgcolor: 'background.surface'
        }}
      >
        <ComingSoonPlaceholder 
          title={tabs[activeTab].label} 
          icon={tabs[activeTab].icon} 
        />
      </Sheet>
    </Box>
  );
}
