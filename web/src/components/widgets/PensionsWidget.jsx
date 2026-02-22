import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Stack } from '@mui/joy';
import { HourglassBottom } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import AppSelect from '../ui/AppSelect';

export default function PensionsWidget({ api, household, data, onSaveData }) {
  const [pensions, setPensions] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedId = data?.selectedId || 'total';

  const fetchData = useCallback(async () => {
    if (!api || !household?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/households/${household.id}/finance/pensions`);
      setPensions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, household?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedItem =
    selectedId === 'total' ? null : pensions.find((a) => a.id === parseInt(selectedId));

  const totalValue = pensions.reduce((sum, p) => sum + (parseFloat(p.current_value) || 0), 0);
  const totalMonthly = pensions.reduce(
    (sum, p) => sum + (parseFloat(p.monthly_contribution) || 0),
    0
  );

  const displayValue = selectedItem ? parseFloat(selectedItem.current_value) || 0 : totalValue;
  const displayMonthly = selectedItem
    ? parseFloat(selectedItem.monthly_contribution) || 0
    : totalMonthly;

  const displayLabel = selectedItem ? selectedItem.plan_name : 'Total Pension Pot';
  const displayEmoji = selectedItem ? selectedItem.emoji || '⏳' : '🏺';

  return (
    <WidgetWrapper title="Pensions" icon={<HourglassBottom />} color="primary">
      <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
        <Box>
          <AppSelect
            placeholder="Select Pension"
            value={selectedId}
            onChange={(val) => onSaveData({ selectedId: val })}
            options={[
              { value: 'total', label: 'Total Portfolio' },
              ...pensions.map((p) => ({
                value: String(p.id),
                label: `${p.emoji || '⏳'} ${p.plan_name}`,
              })),
            ]}
            size="sm"
          />
        </Box>

        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography level="body-sm" color="neutral" textTransform="uppercase" letterSpacing="1px">
            {displayLabel}
          </Typography>
          <Typography level="h2" color="primary">
            {displayEmoji} £
            {displayValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography level="body-sm" color="neutral" fontWeight="bold">
            +£{displayMonthly.toLocaleString()}/mo contribution
          </Typography>
        </Box>

        {selectedItem && (
          <Box>
            <Typography
              level="body-xs"
              sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}
            >
              <span>Provider</span>
              <span>{selectedItem.provider}</span>
            </Typography>
            <Typography
              level="body-xs"
              sx={{ mb: 0.5, display: 'flex', justifyContent: 'space-between' }}
            >
              <span>Type</span>
              <span>{selectedItem.type || 'Other'}</span>
            </Typography>
          </Box>
        )}

        {!selectedItem && pensions.length > 0 && (
          <Stack spacing={1}>
            {pensions.slice(0, 3).map((p) => (
              <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography level="body-xs">
                  {p.emoji || '⏳'} {p.plan_name}
                </Typography>
                <Typography level="body-xs" fontWeight="bold">
                  £{p.current_value?.toLocaleString()}
                </Typography>
              </Box>
            ))}
            {pensions.length > 3 && (
              <Typography level="body-xs" color="neutral" textAlign="center">
                +{pensions.length - 3} more
              </Typography>
            )}
          </Stack>
        )}

        {pensions.length === 0 && !loading && (
          <Typography level="body-sm" color="neutral" textAlign="center">
            No pensions found.
          </Typography>
        )}
      </Stack>
    </WidgetWrapper>
  );
}
