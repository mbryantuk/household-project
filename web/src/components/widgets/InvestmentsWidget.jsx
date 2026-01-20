import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Stack } from '@mui/joy';
import { TrendingUp } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import AppSelect from '../ui/AppSelect';

export default function InvestmentsWidget({ api, household, data, onSaveData }) {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const selectedId = data?.selectedId || 'total';

  const fetchData = useCallback(async () => {
    if (!api || !household?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/households/${household.id}/finance/investments`);
      setInvestments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, household?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedItem = selectedId === 'total' 
    ? null 
    : investments.find(a => a.id === parseInt(selectedId));

  const totalValue = investments.reduce((sum, inv) => sum + (parseFloat(inv.current_value) || 0), 0);
  const totalInvestedAll = investments.reduce((sum, inv) => sum + (parseFloat(inv.total_invested) || 0), 0);
  
  const displayValue = selectedItem ? (parseFloat(selectedItem.current_value) || 0) : totalValue;
  const investedValue = selectedItem ? (parseFloat(selectedItem.total_invested) || 0) : totalInvestedAll;
  
  const displayLabel = selectedItem ? selectedItem.name : 'Total Portfolio';
  const displayEmoji = selectedItem ? (selectedItem.emoji || '📈') : '💼';
  
  const gain = displayValue - investedValue;
  const gainPct = investedValue > 0 ? (gain / investedValue) * 100 : 0;

  return (
    <WidgetWrapper title="Investments" icon={<TrendingUp />} color="primary">
      <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
        
        {/* Selector */}
        <Box>
            <AppSelect
                placeholder="Select Investment"
                value={selectedId}
                onChange={(val) => onSaveData({ selectedId: val })}
                options={[
                    { value: 'total', label: 'Total Portfolio' },
                    ...investments.map(inv => ({ value: String(inv.id), label: `${inv.emoji || '📈'} ${inv.name}` }))
                ]}
                size="sm"
            />
        </Box>

        {/* Big Balance Display */}
        <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography level="body-sm" color="neutral" textTransform="uppercase" letterSpacing="1px">
                {displayLabel}
            </Typography>
            <Typography level="h2" color={gain >= 0 ? 'success' : 'danger'}>
                {displayEmoji} £{displayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography level="body-sm" color={gain >= 0 ? 'success.500' : 'danger.500'} fontWeight="bold">
                {gain >= 0 ? '+' : ''}£{gain.toLocaleString()} ({gainPct.toFixed(2)}%)
            </Typography>
        </Box>

        {/* Mini Details */}
        {selectedItem && (
             <Box>
                <Typography level="body-xs" sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Platform</span>
                    <span>{selectedItem.platform}</span>
                </Typography>
                <Typography level="body-xs" sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Units</span>
                    <span>{selectedItem.units || '-'}</span>
                </Typography>
             </Box>
        )}
        
        {!selectedItem && investments.length > 0 && (
            <Stack spacing={1}>
                {investments.slice(0, 3).map(inv => (
                    <Box key={inv.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography level="body-xs">{inv.emoji || '📈'} {inv.name}</Typography>
                        <Typography level="body-xs" fontWeight="bold">£{inv.current_value?.toLocaleString()}</Typography>
                    </Box>
                ))}
                {investments.length > 3 && <Typography level="body-xs" color="neutral" textAlign="center">+{investments.length - 3} more</Typography>}
            </Stack>
        )}

        {investments.length === 0 && !loading && <Typography level="body-sm" color="neutral" textAlign="center">No investments found.</Typography>}

      </Stack>
    </WidgetWrapper>
  );
}