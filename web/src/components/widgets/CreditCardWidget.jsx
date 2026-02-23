import React from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemContent,
  LinearProgress,
} from '@mui/joy';
import CreditCard from '@mui/icons-material/CreditCard';
import WidgetWrapper from './WidgetWrapper';
import { useCreditCards } from '../../hooks/useFinanceData';

export default function CreditCardWidget({ api, household }) {
  const { data: cards = [], isLoading: loading } = useCreditCards(api, household?.id);

  if (loading)
    return (
      <WidgetWrapper title="Credit Cards" icon={<CreditCard />} color="danger">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  const totalBalance = cards.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalLimit = cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  return (
    <WidgetWrapper title="Credit Cards" icon={<CreditCard />} color="danger">
      <Stack spacing={2}>
        <Box>
          <Typography level="body-xs">Total Utilization ({utilization.toFixed(0)}%)</Typography>
          <Typography level="h4" color={utilization > 50 ? 'danger' : 'warning'}>
            £{totalBalance.toLocaleString()}
          </Typography>
          <LinearProgress
            determinate
            value={utilization}
            color={utilization > 75 ? 'danger' : utilization > 30 ? 'warning' : 'success'}
            sx={{ mt: 1 }}
          />
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {cards.map((card) => (
            <ListItem key={card.id}>
              <ListItemContent>
                <Typography level="title-sm">{card.provider}</Typography>
                <Typography level="body-xs">{card.card_name}</Typography>
              </ListItemContent>
              <Typography level="title-sm" color="danger">
                £{card.balance?.toLocaleString()}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
