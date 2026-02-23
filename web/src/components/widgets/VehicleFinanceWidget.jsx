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
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import WidgetWrapper from './WidgetWrapper';
import { useVehicleFinance } from '../../hooks/useFinanceData';

export default function VehicleFinanceWidget({ api, household }) {
  const { data: finance = [], isLoading: loading } = useVehicleFinance(api, household?.id);

  if (loading)
    return (
      <WidgetWrapper title="Car Finance" icon={<DirectionsCar />} color="danger">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  const total = finance.reduce((sum, f) => sum + (f.balance || 0), 0);

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
          {finance.map((f) => (
            <ListItem key={f.id}>
              <ListItemContent>
                <Typography level="title-sm">{f.provider}</Typography>
                <Typography level="body-xs">
                  {f.vehicle_make} {f.vehicle_model}
                </Typography>
              </ListItemContent>
              <Typography level="title-sm" color="danger">
                £{f.balance?.toLocaleString()}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
