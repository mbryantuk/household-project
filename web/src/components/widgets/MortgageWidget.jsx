import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, CircularProgress, List, ListItem, ListItemContent, ListItemDecorator } from '@mui/joy';
import Home from '@mui/icons-material/Home';
import WidgetWrapper from './WidgetWrapper';

export default function MortgageWidget({ api, household }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !household?.id) return;
    api.get(`/households/${household.id}/finance/mortgages`)
      .then(res => setData(res.data || []))
      .finally(() => setLoading(false));
  }, [api, household]);

  if (loading) return <WidgetWrapper title="Mortgages" icon={<Home />} color="danger"><CircularProgress size="sm" /></WidgetWrapper>;

  const total = data.reduce((sum, m) => sum + (parseFloat(m.remaining_balance) || 0), 0);

  return (
    <WidgetWrapper title="Mortgages" icon={<Home />} color="danger">
      <Stack spacing={2}>
        <Box>
            <Typography level="body-xs">Total Mortgage Debt</Typography>
            <Typography level="h4" color="danger">£{total.toLocaleString()}</Typography>
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {data.map(m => (
            <ListItem key={m.id}>
              <ListItemDecorator>{m.emoji || '🏠'}</ListItemDecorator>
              <ListItemContent>
                <Typography level="title-sm">{m.lender}</Typography>
                <Typography level="body-xs">£{m.monthly_payment}/mo</Typography>
              </ListItemContent>
              <Typography level="title-sm">£{parseFloat(m.remaining_balance || 0).toLocaleString()}</Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
