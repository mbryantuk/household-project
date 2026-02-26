import React, { useMemo } from 'react';
import { Box, Typography, Stack, Avatar, Chip, LinearProgress, Divider } from '@mui/joy';
import { Bolt, WaterDrop, DeleteSweep, AccountBalance, ErrorOutline } from '@mui/icons-material';
import DashboardWidget from '../DashboardWidget';
import { useQuery } from '@tanstack/react-query';

/**
 * UTILITY HEALTH WIDGET
 * Item 216: Displays overview of household utility accounts and renewals.
 */
export default function UtilityHealthWidget({ api, householdId, currency = '£' }) {
  const { data: energy = [], isLoading: energyLoading } = useQuery({
    queryKey: ['households', householdId, 'utilities', 'energy'],
    queryFn: () =>
      api.get(`/households/${householdId}/utilities/energy`).then((res) => res.data || []),
    enabled: !!householdId,
  });

  const { data: water = [], isLoading: waterLoading } = useQuery({
    queryKey: ['households', householdId, 'utilities', 'water'],
    queryFn: () =>
      api.get(`/households/${householdId}/utilities/water`).then((res) => res.data || []),
    enabled: !!householdId,
  });

  const { data: waste = [], isLoading: wasteLoading } = useQuery({
    queryKey: ['households', householdId, 'utilities', 'waste'],
    queryFn: () =>
      api.get(`/households/${householdId}/utilities/waste`).then((res) => res.data || []),
    enabled: !!householdId,
  });

  const { data: council = [], isLoading: councilLoading } = useQuery({
    queryKey: ['households', householdId, 'utilities', 'council'],
    queryFn: () =>
      api.get(`/households/${householdId}/utilities/council`).then((res) => res.data || []),
    enabled: !!householdId,
  });

  const loading = energyLoading || waterLoading || wasteLoading || councilLoading;

  const stats = useMemo(() => {
    const all = [...energy, ...water, ...waste, ...council];
    const monthlyTotal = all.reduce((sum, item) => sum + (parseFloat(item.monthly_amount) || 0), 0);

    // Item 181: Ensure purity by calculating threshold outside the filter
    const soonThreshold = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;

    const expiringSoon = energy.filter((e) => {
      if (!e.contractend) return false;
      const end = new Date(e.contractend).getTime();
      return end < soonThreshold;
    });

    return { monthlyTotal, expiringSoon };
  }, [energy, water, waste, council]);

  return (
    <DashboardWidget title="Utility Health" icon={Bolt} color="primary" loading={loading}>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography level="body-xs" color="neutral">
              Monthly Commitments
            </Typography>
            <Typography level="h3">
              {currency}
              {stats.monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
          {stats.expiringSoon.length > 0 && (
            <Chip color="danger" variant="soft" startDecorator={<ErrorOutline />}>
              {stats.expiringSoon.length} Renewal Needed
            </Chip>
          )}
        </Box>

        <Divider />

        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar size="sm" variant="soft" color="warning">
              <Bolt />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography level="body-sm">Energy</Typography>
                <Typography level="body-sm" fontWeight="bold">
                  {energy.length} Active
                </Typography>
              </Box>
              <LinearProgress
                determinate
                value={energy.length > 0 ? 100 : 0}
                color="warning"
                size="sm"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar size="sm" variant="soft" color="primary">
              <WaterDrop />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography level="body-sm">Water</Typography>
                <Typography level="body-sm" fontWeight="bold">
                  {water.length} Active
                </Typography>
              </Box>
              <LinearProgress
                determinate
                value={water.length > 0 ? 100 : 0}
                color="primary"
                size="sm"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar size="sm" variant="soft" color="neutral">
              <AccountBalance />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography level="body-sm">Council</Typography>
                <Typography level="body-sm" fontWeight="bold">
                  {council.length} Active
                </Typography>
              </Box>
              <LinearProgress
                determinate
                value={council.length > 0 ? 100 : 0}
                color="neutral"
                size="sm"
              />
            </Box>
          </Box>
        </Stack>
      </Stack>
    </DashboardWidget>
  );
}
