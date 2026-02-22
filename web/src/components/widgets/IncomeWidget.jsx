import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemContent,
  ListItemDecorator,
} from '@mui/joy';
import AttachMoney from '@mui/icons-material/AttachMoney';
import WidgetWrapper from './WidgetWrapper';

export default function IncomeWidget({ api, household }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !household?.id) return;
    api
      .get(`/households/${household.id}/finance/income`)
      .then((res) => setData(res.data || []))
      .finally(() => setLoading(false));
  }, [api, household]);

  if (loading)
    return (
      <WidgetWrapper title="Income" icon={<AttachMoney />} color="success">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  const total = data.reduce((sum, inc) => sum + (inc.amount || 0), 0);

  return (
    <WidgetWrapper title="Income" icon={<AttachMoney />} color="success">
      <Stack spacing={2}>
        <Box>
          <Typography level="body-xs">Total Net Monthly</Typography>
          <Typography level="h4" color="success">
            £{total.toLocaleString()}
          </Typography>
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {data.map((inc) => (
            <ListItem key={inc.id}>
              <ListItemDecorator>{inc.emoji || '💰'}</ListItemDecorator>
              <ListItemContent>
                <Typography level="title-sm">{inc.employer || inc.role}</Typography>
                <Typography level="body-xs">Day {inc.payment_day}</Typography>
              </ListItemContent>
              <Typography level="title-sm">£{inc.amount?.toLocaleString()}</Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
