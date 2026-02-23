import React, { useMemo } from 'react';
import { Box, Typography, Stack, CircularProgress } from '@mui/joy';
import { Analytics as AnalyticsIcon } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import DashboardWidget from '../DashboardWidget';
import { useWealthData, useBudgetStatusData } from '../../hooks/useFinanceData';

const COLORS = [
  'var(--joy-palette-primary-500)',
  'var(--joy-palette-success-500)',
  'var(--joy-palette-warning-500)',
  'var(--joy-palette-danger-500)',
  'var(--joy-palette-neutral-500)',
];

export default function AnalyticsWidget({ household, api }) {
  const { data: wealthData, isLoading: loadingWealth } = useWealthData(api, household?.id);
  const { data: budgetData, isLoading: loadingBudget } = useBudgetStatusData(api, household?.id);

  const chartData = useMemo(() => {
    if (!wealthData || !budgetData) return null;

    // 1. Asset Distribution for Pie Chart
    const houseValuation = wealthData.house_details?.current_valuation || 0;
    const vehicleValue =
      wealthData.vehicles?.reduce(
        (sum, v) => sum + (v.current_value || v.purchase_value || 0),
        0
      ) || 0;
    const totalPensions =
      wealthData.pensions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
    const totalInvestments =
      wealthData.investments?.reduce((sum, i) => sum + (i.current_value || 0), 0) || 0;
    const totalSavings =
      wealthData.savings?.reduce((sum, s) => sum + Math.max(0, s.current_balance || 0), 0) || 0;

    const assetsPie = [
      { name: 'Property', value: houseValuation },
      { name: 'Vehicles', value: vehicleValue },
      { name: 'Pensions', value: totalPensions },
      { name: 'Investments', value: totalInvestments },
      { name: 'Savings', value: totalSavings },
    ].filter((item) => item.value > 0);

    // 2. Income vs Expenses Bar Chart
    const totalIncome =
      budgetData.incomes?.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0) || 0;

    // Estimate monthly expenses from recurring costs
    const monthlyExpenses =
      budgetData.recurring_costs?.reduce((sum, cost) => {
        let amt = parseFloat(cost.amount) || 0;
        if (cost.frequency === 'weekly') amt *= 4.33;
        if (cost.frequency === 'yearly') amt /= 12;
        if (cost.frequency === 'quarterly') amt /= 3;
        return sum + amt;
      }, 0) || 0;

    const cashflowBar = [
      { name: 'Monthly Average', Income: totalIncome, Expenses: monthlyExpenses },
    ];

    return { assetsPie, cashflowBar };
  }, [wealthData, budgetData]);

  if (loadingWealth || loadingBudget) {
    return (
      <DashboardWidget title="Advanced Analytics" icon={AnalyticsIcon} color="primary">
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
        >
          <CircularProgress />
        </Box>
      </DashboardWidget>
    );
  }

  if (!chartData || (chartData.assetsPie.length === 0 && chartData.cashflowBar[0].Income === 0)) {
    return (
      <DashboardWidget title="Advanced Analytics" icon={AnalyticsIcon} color="primary">
        <Typography level="body-sm" color="neutral" sx={{ textAlign: 'center', mt: 4 }}>
          Not enough financial data to generate charts. Add assets, incomes, and expenses to see
          your analytics.
        </Typography>
      </DashboardWidget>
    );
  }

  return (
    <DashboardWidget title="Advanced Analytics" icon={AnalyticsIcon} color="primary">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ height: '100%', width: '100%', pb: 2 }}
      >
        {/* Assets Pie Chart */}
        {chartData.assetsPie.length > 0 && (
          <Box sx={{ flex: 1, minHeight: 250, display: 'flex', flexDirection: 'column' }}>
            <Typography level="title-sm" sx={{ mb: 1, textAlign: 'center' }}>
              Asset Distribution
            </Typography>
            <Box sx={{ flexGrow: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.assetsPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.assetsPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}

        {/* Cashflow Bar Chart */}
        <Box sx={{ flex: 1, minHeight: 250, display: 'flex', flexDirection: 'column' }}>
          <Typography level="title-sm" sx={{ mb: 1, textAlign: 'center' }}>
            Estimated Cashflow
          </Typography>
          <Box sx={{ flexGrow: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.cashflowBar}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Income" fill="var(--joy-palette-success-500)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="Expenses"
                  fill="var(--joy-palette-danger-500)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Stack>
    </DashboardWidget>
  );
}
