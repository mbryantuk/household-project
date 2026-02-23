import React from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemContent,
} from '@mui/joy';
import Receipt from '@mui/icons-material/Receipt';
import WidgetWrapper from './WidgetWrapper';
import { useRecurringCharges } from '../../hooks/useFinanceData';

export default function HomeRecurringCostsWidget({ api, household }) {
  const { data: costs = [], isLoading: loading } = useRecurringCharges(api, household?.id);

  if (loading)
    return (
      <WidgetWrapper title="Upcoming Bills" icon={<Receipt />} color="warning">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  // Filter for next 30 days or just show top 5
  const upcoming = costs.slice(0, 5);

  return (
    <WidgetWrapper title="Upcoming Bills" icon={<Receipt />} color="warning">
      <Stack spacing={2}>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {upcoming.map((cost) => (
            <ListItem key={cost.id}>
              <ListItemContent>
                <Typography level="title-sm">{cost.name}</Typography>
                <Typography level="body-xs">
                  {cost.frequency} • Day {cost.payment_day}
                </Typography>
              </ListItemContent>
              <Typography level="title-sm">£{cost.amount?.toLocaleString()}</Typography>
            </ListItem>
          ))}
          {upcoming.length === 0 && (
            <Typography level="body-xs" textAlign="center" sx={{ py: 2 }}>
              No recurring bills found.
            </Typography>
          )}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
