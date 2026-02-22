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
} from '@mui/joy';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import WidgetWrapper from './WidgetWrapper';

export default function VehicleFinanceWidget({ api, household }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !household?.id) return;
    api
      .get(`/households/${household.id}/finance/vehicle-finance`)
      .then((res) => setData(res.data || []))
      .finally(() => setLoading(false));
  }, [api, household]);

  if (loading)
    return (
      <WidgetWrapper title="Vehicle Finance" icon={<DirectionsCar />} color="danger">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  const total = data.reduce((sum, v) => sum + (parseFloat(v.remaining_balance) || 0), 0);

  return (
    <WidgetWrapper title="Car Finance" icon={<DirectionsCar />} color="danger">
      <Stack spacing={2}>
        <Box>
          <Typography level="body-xs">Total Outstanding</Typography>
          <Typography level="h4" color="danger">
            £{total.toLocaleString()}
          </Typography>
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {data.map((v) => (
            <ListItem key={v.id}>
              <ListItemDecorator>{v.emoji || '🚗'}</ListItemDecorator>
              <ListItemContent>
                <Typography level="title-sm">{v.lender}</Typography>
                <Typography level="body-xs">£{v.monthly_payment}/mo</Typography>
              </ListItemContent>
              <Typography level="title-sm">
                £{parseFloat(v.remaining_balance || 0).toLocaleString()}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
