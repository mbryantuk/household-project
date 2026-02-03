import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Stack, LinearProgress, Divider, Chip, List, ListItem, CircularProgress } from '@mui/joy';
import { Savings as SavingsIcon, Home, DirectionsCar, Assignment, TrendingUp, CreditCard, AccountBalance, Warning } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function WealthWidget({ api, household }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
      pensions: [], savings: [], investments: [], mortgages: [], 
      vehicles: [], vehicle_finance: [], house_details: {}, savings_pots: [],
      loans: [], credit_cards: [], current_accounts: []
  });

  const fetchData = useCallback(async () => {
    if (!api || !household?.id) return;
    setLoading(true);
    try {
      const [
          pensionRes, saveRes, invRes, mortRes, vehRes, vFinRes, detailRes, potRes, loanRes, ccRes, accRes
      ] = await Promise.all([
          api.get(`/households/${household.id}/finance/pensions`),
          api.get(`/households/${household.id}/finance/savings`),
          api.get(`/households/${household.id}/finance/investments`),
          api.get(`/households/${household.id}/finance/mortgages`),
          api.get(`/households/${household.id}/vehicles`),
          api.get(`/households/${household.id}/finance/vehicle-finance`),
          api.get(`/households/${household.id}/details`),
          api.get(`/households/${household.id}/finance/savings/pots`),
          api.get(`/households/${household.id}/finance/loans`),
          api.get(`/households/${household.id}/finance/credit-cards`),
          api.get(`/households/${household.id}/finance/current-accounts`)
      ]);

      setData({
          pensions: pensionRes.data || [],
          savings: saveRes.data || [],
          investments: invRes.data || [],
          mortgages: mortRes.data || [],
          vehicles: vehRes.data || [],
          vehicle_finance: vFinRes.data || [],
          house_details: detailRes.data || {},
          savings_pots: potRes.data || [],
          loans: loanRes.data || [],
          credit_cards: ccRes.data || [],
          current_accounts: accRes.data || []
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

  const totalLoans = useMemo(() => data.loans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0), [data.loans]);
  const totalCreditCards = useMemo(() => data.credit_cards.reduce((sum, cc) => sum + (cc.current_balance || 0), 0), [data.credit_cards]);
  const totalOverdrafts = useMemo(() => data.current_accounts.reduce((sum, acc) => sum + (acc.current_balance < 0 ? Math.abs(acc.current_balance) : 0), 0), [data.current_accounts]);

  const netWorth = useMemo(() => {
      const assets = houseEquity.valuation + vehicleEquity.value + totalPensions + totalInvestments + 
                     data.savings.reduce((sum, s) => sum + Math.max(0, s.current_balance || 0), 0) + 
                     data.current_accounts.reduce((sum, acc) => sum + Math.max(0, acc.current_balance || 0), 0);
      
      const liabilities = houseEquity.mortgageTotal + vehicleEquity.financeTotal + totalLoans + totalCreditCards + totalOverdrafts;
      
      return assets - liabilities;
  }, [houseEquity, vehicleEquity, totalPensions, totalInvestments, data, totalLoans, totalCreditCards, totalOverdrafts]);

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
        
        <Box sx={{ textAlign: 'center', py: 1.5, bgcolor: 'success.softBg', borderRadius: 'md', border: '1px solid', borderColor: 'success.200' }}>
            <Typography level="body-xs" color="success" textTransform="uppercase" fontWeight="bold">Net Worth Estimate</Typography>
            <Typography level="h2" color="success" sx={{ my: 0.5 }}>{formatCurrency(netWorth)}</Typography>
            <Typography level="body-xs" color="neutral">Assets minus all Liabilities</Typography>
        </Box>

        <Stack spacing={2}>
            {/* House Equity */}
            {houseEquity.valuation > 0 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography level="body-xs" fontWeight="bold" startDecorator={<Home sx={{ fontSize: '1.1rem' }} />}>House Equity</Typography>
                        <Typography level="body-xs" fontWeight="bold">{formatCurrency(houseEquity.equity)}</Typography>
                    </Box>
                    <Typography level="body-xs" color="neutral" sx={{ mb: 0.5 }}>
                        {formatCurrency(houseEquity.valuation)} value vs {formatCurrency(houseEquity.mortgageTotal)} debt
                    </Typography>
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
                        <Typography level="body-xs" fontWeight="bold" startDecorator={<DirectionsCar sx={{ fontSize: '1.1rem' }} />}>Vehicle Equity</Typography>
                        <Typography level="body-xs" fontWeight="bold">{formatCurrency(vehicleEquity.equity)}</Typography>
                    </Box>
                    <Typography level="body-xs" color="neutral" sx={{ mb: 0.5 }}>
                        {formatCurrency(vehicleEquity.value)} value vs {formatCurrency(vehicleEquity.financeTotal)} debt
                    </Typography>
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
                        <Assignment sx={{ fontSize: '1rem' }} /> Pensions
                    </Typography>
                    <Typography level="title-sm" fontWeight="bold">{formatCurrency(totalPensions)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography level="body-xs" color="neutral" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUp sx={{ fontSize: '1rem' }} /> Investments
                    </Typography>
                    <Typography level="title-sm" fontWeight="bold">{formatCurrency(totalInvestments)}</Typography>
                </Box>
            </Stack>

            {/* Debts & Liabilities */}
            {(totalLoans > 0 || totalCreditCards > 0 || totalOverdrafts > 0) && (
                <Box sx={{ p: 1.5, bgcolor: 'danger.softBg', borderRadius: 'md', border: '1px dashed', borderColor: 'danger.200' }}>
                    <Typography level="body-xs" color="danger" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Warning sx={{ fontSize: '1rem' }} /> Unsecured Debt & Credit
                    </Typography>
                    <Stack spacing={1}>
                        {totalLoans > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography level="body-xs">Loans</Typography>
                                <Typography level="body-xs" fontWeight="bold" color="danger">-{formatCurrency(totalLoans)}</Typography>
                            </Box>
                        )}
                        {totalCreditCards > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography level="body-xs" startDecorator={<CreditCard sx={{ fontSize: '0.9rem' }} />}>Credit Cards</Typography>
                                <Typography level="body-xs" fontWeight="bold" color="danger">-{formatCurrency(totalCreditCards)}</Typography>
                            </Box>
                        )}
                        {totalOverdrafts > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography level="body-xs" startDecorator={<AccountBalance sx={{ fontSize: '0.9rem' }} />}>Overdrafts</Typography>
                                <Typography level="body-xs" fontWeight="bold" color="danger">-{formatCurrency(totalOverdrafts)}</Typography>
                            </Box>
                        )}
                    </Stack>
                </Box>
            )}

            {/* Savings Accounts & Pots */}
            <Box>
                <Typography level="body-xs" color="neutral" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SavingsIcon sx={{ fontSize: '1rem' }} /> Liquid Savings
                </Typography>
                <Typography level="title-sm" fontWeight="bold" sx={{ mb: 1 }}>{formatCurrency(totalSavings)}</Typography>
                
                <List size="sm" sx={{ '--ListItem-paddingLeft': '0px' }}>
                    {data.savings.slice(0, 2).map(acc => (
                        <ListItem key={acc.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                                <Typography level="body-xs" fontWeight="bold">{acc.emoji} {acc.account_name}</Typography>
                                <Typography level="body-xs" fontWeight="bold">{formatCurrency(acc.current_balance)}</Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {data.savings_pots.filter(p => p.savings_id === acc.id).map(pot => (
                                    <Chip key={pot.id} size="sm" variant="soft" color="success" sx={{ fontSize: '0.6rem', height: '18px', '--Chip-paddingInline': '6px' }}>
                                        {pot.emoji} {formatCurrency(pot.current_amount)}
                                    </Chip>
                                ))}
                            </Stack>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Stack>
      </Stack>
    </WidgetWrapper>
  );
}