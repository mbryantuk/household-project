import React, { useState, useEffect } from 'react';
import { Typography, Stack, Button, Box, CircularProgress } from '@mui/joy';
import { EmojiEvents, Insights } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import MonthlyWrapUpModal from '../modals/MonthlyWrapUpModal';

export default function MonthlyWrapUpWidget({ api, household }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Get current month in YYYY-MM-DD format (first day of month)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!household?.id) return;
    
    setLoading(true);
    api.get(`/households/${household.id}/finance/wrap-up?month=${currentMonthStr}`)
      .then(res => {
        setData(res.data);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to fetch wrap-up", err);
        setError("Failed to load summary");
      })
      .finally(() => setLoading(false));
  }, [api, household?.id, currentMonthStr]);

  if (loading) {
    return (
      <WidgetWrapper title="Monthly Wrap-Up" icon={<EmojiEvents />} color="warning">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size="sm" />
        </Box>
      </WidgetWrapper>
    );
  }

  if (error) {
    return (
      <WidgetWrapper title="Monthly Wrap-Up" icon={<EmojiEvents />} color="warning">
        <Typography color="danger" level="body-sm">{error}</Typography>
      </WidgetWrapper>
    );
  }

  const formatCurrency = (val) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <WidgetWrapper title="Monthly Wrap-Up" icon={<EmojiEvents />} color="warning">
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Box sx={{ p: 2, borderRadius: 'md', bgcolor: 'warning.softBg', textAlign: 'center' }}>
          <Typography level="title-md">{monthName} Wrapped</Typography>
          <Typography level="h3" sx={{ mt: 1 }}>{formatCurrency(data?.total_spent || 0)}</Typography>
          <Typography level="body-xs" color="neutral">Total Spent This Month</Typography>
        </Box>

        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stack spacing={1} alignItems="center">
                <Insights color="warning" sx={{ fontSize: 32 }} />
                <Typography level="body-sm" textAlign="center">
                    {data?.delta_percent > 0 
                      ? `Spending is up by ${data.delta_percent.toFixed(1)}%`
                      : data?.delta_percent < 0
                      ? `Spending is down by ${Math.abs(data.delta_percent).toFixed(1)}%`
                      : "Same as last month"}
                </Typography>
            </Stack>
        </Box>

        <Button 
            variant="solid" 
            color="warning" 
            fullWidth 
            onClick={() => setModalOpen(true)}
            sx={{ borderRadius: 'md' }}
        >
          Open Wrap-Up
        </Button>
      </Stack>

      <MonthlyWrapUpModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        data={data}
        monthName={monthName.split(' ')[0]} 
      />
    </WidgetWrapper>
  );
}
