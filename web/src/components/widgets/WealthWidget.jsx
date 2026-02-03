import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Stack, LinearProgress, Divider, Chip, List, ListItem, ListItemContent, ListItemDecorator, CircularProgress } from '@mui/joy';
import { Savings as SavingsIcon, Home, DirectionsCar, Assignment, TrendingUp } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function WealthWidget({ api, household }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
      pensions: [], savings: [], investments: [], mortgages: [], 
      vehicles: [], vehicle_finance: [], house_details: {}, savings_pots: []
  });

  const fetchData = useCallback(async () => {
    if (!api || !household?.id) return;
    setLoading(true);
    try {
      const [
          pensionRes, saveRes, invRes, mortRes, vehRes, vFinRes, detailRes, potRes
      ] = await Promise.all([
          api.get(`/households/${household.id}/finance/pensions`),
          api.get(`/households/${household.id}/finance/savings`),
          api.get(`/households/${household.id}/finance/investments`),
          api.get(`/households/${household.id}/finance/mortgages`),
          api.get(`/households/${household.id}/vehicles`),
          api.get(`/households/${household.id}/finance/vehicle-finance`),
          api.get(`/households/${household.id}/details`),
          api.get(`/households/${household.id}/finance/savings/pots`)
      ]);

      setData({
          pensions: pensionRes.data || [],
          savings: saveRes.data || [],
          investments: invRes.data || [],
          mortgages: mortRes.data || [],
          vehicles: vehRes.data || [],
          vehicle_finance: vFinRes.data || [],
          house_details: detailRes.data || {},
          savings_pots: potRes.data || []
      });
    } catch (err) {
      console.error("Failed to fetch wealth data", err);
    } finally {
      setLoading(false);
    }
  }, [api, household?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const houseEquity = useMemo(() => {
      const valuation = data.house_details?.current_valuation || 0;
      const mortgageTotal = data.mortgages?.reduce((sum, m) => sum + (m.remaining_balance || 0), 0) || 0;
      return { valuation, mortgageTotal, equity: valuation - mortgageTotal };
  }, [data]);

  const vehicleEquity = useMemo(() => {
      const value = data.vehicles.reduce((sum, v) => sum + (v.current_value || v.purchase_value || 0), 0);
      const financeTotal = data.vehicle_finance?.reduce((sum, f) => sum + (f.remaining_balance || 0), 0) || 0;
      return { value, financeTotal, equity: value - financeTotal };
  }, [data]);

  const totalPensions = useMemo(() => data.pensions.reduce((sum, p) => sum + (p.current_value || 0), 0), [data.pensions]);
  const totalInvestments = useMemo(() => data.investments.reduce((sum, i) => sum + (i.current_value || 0), 0), [data.investments]);
  const totalSavings = useMemo(() => data.savings.reduce((sum, s) => sum + (s.current_balance || 0), 0), [data.savings]);

  const netWorth = useMemo(() => {
      return houseEquity.equity + vehicleEquity.equity + totalPensions + totalInvestments + totalSavings;
  }, [houseEquity, vehicleEquity, totalPensions, totalInvestments, totalSavings]);

  if (loading) return (
    <WidgetWrapper title="Wealth Tracking" icon={<SavingsIcon />} color="success">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size="sm" />
        </Box>
    </WidgetWrapper>
  );

  return (
    <WidgetWrapper title="Wealth Tracking" icon={<SavingsIcon />} color="success">
      <Stack spacing={2} sx={{ overflowY: 'auto', pr: 1 }}>
        
        <Box sx={{ textAlign: 'center', py: 1, bgcolor: 'success.softBg', borderRadius: 'md' }}>
            <Typography level="body-xs" color="success" textTransform="uppercase" fontWeight="bold">Net Worth Estimate</Typography>
            <Typography level="h3" color="success">{formatCurrency(netWorth)}</Typography>
        </Box>

        <Stack spacing={2}>
            {/* House Equity */}
            {houseEquity.valuation > 0 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography level="body-xs" fontWeight="bold" startDecorator={<Home sx={{ fontSize: '1rem' }} />}>House Equity</Typography>
                        <Typography level="body-xs" fontWeight="bold">{formatCurrency(houseEquity.equity)}</Typography>
                    </Box>
                    <LinearProgress 
                        determinate 
                        value={Math.min(100, Math.max(0, (1 - (houseEquity.mortgageTotal / houseEquity.valuation)) * 100))} 
                        size="sm" 
                        color="primary" 
                        sx={{ borderRadius: 'xs' }}
                    />
                </Box>
            )}

            {/* Vehicle Equity */}
            {vehicleEquity.value > 0 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography level="body-xs" fontWeight="bold" startDecorator={<DirectionsCar sx={{ fontSize: '1rem' }} />}>Vehicle Equity</Typography>
                        <Typography level="body-xs" fontWeight="bold">{formatCurrency(vehicleEquity.equity)}</Typography>
                    </Box>
                    <LinearProgress 
                        determinate 
                        value={Math.min(100, Math.max(0, (1 - (vehicleEquity.financeTotal / vehicleEquity.value)) * 100))} 
                        size="sm" 
                        color="warning" 
                        sx={{ borderRadius: 'xs' }}
                    />
                </Box>
            )}

            <Divider />

            {/* Pensions & Investments */}
            <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                    <Typography level="body-xs" color="neutral" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Assignment sx={{ fontSize: '0.9rem' }} /> Pensions
                    </Typography>
                    <Typography level="title-sm">{formatCurrency(totalPensions)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography level="body-xs" color="neutral" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUp sx={{ fontSize: '0.9rem' }} /> Investments
                    </Typography>
                    <Typography level="title-sm">{formatCurrency(totalInvestments)}</Typography>
                </Box>
            </Stack>

            {/* Savings Accounts & Pots */}
            <Box>
                <Typography level="body-xs" color="neutral" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SavingsIcon sx={{ fontSize: '0.9rem' }} /> Savings & Pots
                </Typography>
                <Typography level="title-sm" sx={{ mb: 1 }}>{formatCurrency(totalSavings)}</Typography>
                
                <List size="sm" sx={{ '--ListItem-paddingLeft': '0px' }}>
                    {data.savings.slice(0, 2).map(acc => (
                        <ListItem key={acc.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                                <Typography level="body-xs" fontWeight="bold">{acc.emoji} {acc.account_name}</Typography>
                                <Typography level="body-xs">{formatCurrency(acc.current_balance)}</Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {data.savings_pots.filter(p => p.savings_id === acc.id).map(pot => (
                                    <Chip key={pot.id} size="sm" variant="soft" color="success" sx={{ fontSize: '0.6rem' }}>
                                        {pot.emoji} {formatCurrency(pot.current_amount)}
                                    </Chip>
                                ))}
                            </Stack>
                        </ListItem>
                    ))}
                    {data.savings.length > 2 && (
                        <Typography level="body-xs" color="neutral" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                            + {data.savings.length - 2} more accounts
                        </Typography>
                    )}
                </List>
            </Box>
        </Stack>
      </Stack>
    </WidgetWrapper>
  );
}
