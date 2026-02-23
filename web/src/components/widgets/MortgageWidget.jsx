import React from 'react';
import { Box, Typography, Stack, CircularProgress, LinearProgress, Divider } from '@mui/joy';
import Home from '@mui/icons-material/Home';
import WidgetWrapper from './WidgetWrapper';
import { useMortgages } from '../../hooks/useFinanceData';

export default function MortgageWidget({ api, household }) {
  const { data: mortgages = [], isLoading: loading } = useMortgages(api, household?.id);

  if (loading)
    return (
      <WidgetWrapper title="Mortgage" icon={<Home />} color="primary">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  const totalBalance = mortgages.reduce((sum, m) => sum + (m.balance || 0), 0);
  const totalEquity = mortgages.reduce((sum, m) => sum + (m.equity || 0), 0);
  const totalValue = totalBalance + totalEquity;
  const ltv = totalValue > 0 ? (totalBalance / totalValue) * 100 : 0;

  return (
    <WidgetWrapper title="Mortgage" icon={<Home />} color="primary">
      <Stack spacing={2}>
        <Box>
          <Typography level="body-xs">Total Outstanding</Typography>
          <Typography level="h4">£{totalBalance.toLocaleString()}</Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography level="body-xs">LTV Ratio</Typography>
            <Typography level="body-xs" fontWeight="bold">
              {ltv.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            determinate
            value={ltv}
            color={ltv > 80 ? 'danger' : ltv > 60 ? 'warning' : 'success'}
            thickness={8}
            sx={{ borderRadius: 'sm' }}
          />
        </Box>

        <Divider />

        <Stack spacing={1}>
          {mortgages.map((m) => (
            <Box key={m.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography level="body-sm" sx={{ opacity: 0.7 }}>
                {m.provider}
              </Typography>
              <Typography level="body-sm" fontWeight="md">
                £{m.balance?.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>
    </WidgetWrapper>
  );
}
