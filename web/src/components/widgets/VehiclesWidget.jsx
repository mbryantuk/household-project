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
  Chip,
} from '@mui/joy';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import WidgetWrapper from './WidgetWrapper';
import { useHouseholdVehicles } from '../../hooks/useHouseholdData';

export default function VehiclesWidget({ api, household }) {
  const { data: vehicles = [], isLoading: loading } = useHouseholdVehicles(api, household?.id);

  if (loading)
    return (
      <WidgetWrapper title="Vehicles" icon={<DirectionsCar />} color="danger">
        <CircularProgress size="sm" />
      </WidgetWrapper>
    );

  return (
    <WidgetWrapper title="Vehicles" icon={<DirectionsCar />} color="danger">
      <Stack spacing={2}>
        <Box>
          <Typography level="body-xs">Fleet Status</Typography>
          <Typography level="h4">{vehicles.length} Active</Typography>
        </Box>
        <List size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          {vehicles.map((v) => (
            <ListItem key={v.id}>
              <ListItemDecorator>{v.emoji || '🚗'}</ListItemDecorator>
              <ListItemContent>
                <Typography level="title-sm">
                  {v.make} {v.model}
                </Typography>
                <Typography level="body-xs">{v.registration}</Typography>
              </ListItemContent>
              <Chip size="sm" variant="soft" color="success">
                OK
              </Chip>
            </ListItem>
          ))}
        </List>
      </Stack>
    </WidgetWrapper>
  );
}
