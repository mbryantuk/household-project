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
import RequestQuote from '@mui/icons-material/RequestQuote';
import WidgetWrapper from './WidgetWrapper';
import { useLoans } from '../../hooks/useFinanceData';

export default function LoansWidget({ api, household }) {
  const { data: loans = [], isLoading: loading } = useLoans(api, household?.id);

  if (loading)
    return (
      <WidgetWrapper title="Loans" icon={<RequestQuote />} color="danger">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  const total = loans.reduce((sum, l) => sum + (l.balance || 0), 0);

  return (
    <WidgetWrapper title="Loans" icon={<RequestQuote />} color="danger">
      <Stack spacing={2}>
        <Box>
          <Typography level="body-xs">Total Outstanding</Typography>
          <Typography level="h4" color="danger">
            £{total.toLocaleString()}
          </Typography>
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {loans.map((loan) => (
            <ListItem key={loan.id}>
              <ListItemContent>
                <Typography level="title-sm">{loan.provider}</Typography>
                <Typography level="body-xs">{loan.loan_type}</Typography>
              </ListItemContent>
              <Typography level="title-sm" color="danger">
                £{loan.balance?.toLocaleString()}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
