import React, { useState } from 'react';
import { Typography, Stack, Button, Box, CircularProgress } from '@mui/joy';
import { EmojiEvents, Insights } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import MonthlyWrapUpModal from '../modals/MonthlyWrapUpModal';
import { useHousehold } from '../../contexts/HouseholdContext';

export default function MonthlyWrapUpWidget() {
  const { household, wrappedData: data } = useHousehold();
  const [modalOpen, setModalOpen] = useState(false);

  // Get current month display name
  const now = new Date();
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  if (!data && household?.id) {
    return (
      <WidgetWrapper title="Monthly Wrap-Up" icon={<EmojiEvents />} color="warning">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size="sm" />
        </Box>
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
