import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, CircularProgress, List, ListItem, ListItemContent, ListItemDecorator } from '@mui/joy';
import ReceiptLong from '@mui/icons-material/ReceiptLong';
import WidgetWrapper from './WidgetWrapper';

export default function LoansWidget({ api, household }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !household?.id) return;
    api.get(`/households/${household.id}/finance/loans`)
      .then(res => setData(res.data || []))
      .finally(() => setLoading(false));
  }, [api, household]);

  if (loading) return <WidgetWrapper title="Loans" icon={<ReceiptLong />} color="danger"><CircularProgress size="sm" /></WidgetWrapper>;

  const total = data.reduce((sum, l) => sum + (parseFloat(l.remaining_balance) || 0), 0);

  return (
    <WidgetWrapper title="Personal Loans" icon={<ReceiptLong />} color="danger">
      <Stack spacing={2}>
        <Box>
            <Typography level="body-xs">Total Debt</Typography>
            <Typography level="h4" color="danger">£{total.toLocaleString()}</Typography>
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {data.map(l => (
            <ListItem key={l.id}>
              <ListItemDecorator>{l.emoji || '📝'}</ListItemDecorator>
              <ListItemContent>
                <Typography level="title-sm">{l.lender}</Typography>
                <Typography level="body-xs">£{l.monthly_payment}/mo</Typography>
              </ListItemContent>
              <Typography level="title-sm">£{parseFloat(l.remaining_balance || 0).toLocaleString()}</Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
