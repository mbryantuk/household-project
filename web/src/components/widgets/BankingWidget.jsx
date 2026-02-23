import React from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  List,
  ListItem,
  ListItemContent,
  ListItemDecorator,
} from '@mui/joy';
import AccountBalance from '@mui/icons-material/AccountBalance';
import WidgetWrapper from './WidgetWrapper';
import { useCurrentAccounts } from '../../hooks/useFinanceData';

export default function BankingWidget({ api, household }) {
  const { data = [], isLoading: loading } = useCurrentAccounts(api, household?.id);

  if (loading)
    return (
      <WidgetWrapper title="Banking" icon={<AccountBalance />} color="success">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  const total = data.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  return (
    <WidgetWrapper title="Banking" icon={<AccountBalance />} color="success">
      <Stack spacing={2}>
        <Box>
          <Typography level="body-xs">Combined Balance</Typography>
          <Typography level="h4" color={total >= 0 ? 'success' : 'danger'}>
            £{total.toLocaleString()}
          </Typography>
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {data.map((acc) => (
            <ListItem key={acc.id}>
              <ListItemDecorator>{acc.emoji || '🏦'}</ListItemDecorator>
              <ListItemContent>
                <Typography level="title-sm">{acc.bank_name}</Typography>
                <Typography level="body-xs">{acc.account_name}</Typography>
              </ListItemContent>
              <Typography level="title-sm">£{acc.current_balance?.toLocaleString()}</Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
