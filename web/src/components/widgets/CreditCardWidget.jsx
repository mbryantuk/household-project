import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemContent,
  ListItemDecorator,
  LinearProgress,
} from '@mui/joy';
import CreditCard from '@mui/icons-material/CreditCard';
import WidgetWrapper from './WidgetWrapper';

export default function CreditCardWidget({ api, household }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !household?.id) return;
    api
      .get(`/households/${household.id}/finance/credit-cards`)
      .then((res) => setData(res.data || []))
      .finally(() => setLoading(false));
  }, [api, household]);

  if (loading)
    return (
      <WidgetWrapper title="Credit Cards" icon={<CreditCard />} color="danger">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  const totalBalance = data.reduce((sum, cc) => sum + (cc.current_balance || 0), 0);
  const totalLimit = data.reduce((sum, cc) => sum + (cc.credit_limit || 0), 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  return (
    <WidgetWrapper title="Credit Cards" icon={<CreditCard />} color="danger">
      <Stack spacing={2}>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography level="body-xs">Utilization</Typography>
            <Typography level="body-xs" fontWeight="bold">
              {Math.round(utilization)}%
            </Typography>
          </Box>
          <LinearProgress
            determinate
            value={utilization}
            color={utilization > 50 ? 'danger' : 'warning'}
          />
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {data.map((cc) => (
            <ListItem key={cc.id}>
              <ListItemDecorator>{cc.emoji || '💳'}</ListItemDecorator>
              <ListItemContent>
                <Typography level="title-sm">{cc.provider}</Typography>
                <Typography level="body-xs">{cc.card_name}</Typography>
              </ListItemContent>
              <Typography level="title-sm">£{cc.current_balance?.toLocaleString()}</Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
