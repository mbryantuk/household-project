import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemContent,
  Chip,
  CircularProgress,
  Avatar,
} from '@mui/joy';
import { DirectionsCar } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

export default function VehiclesWidget({ api, household }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !household) return;
    const fetchVehicles = async () => {
      try {
        const res = await api.get(`/households/${household.id}/vehicles`);
        setVehicles(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, [api, household]);

  return (
    <WidgetWrapper title="Fleet Status" icon={<DirectionsCar />} color="primary">
      {loading ? (
        <CircularProgress size="sm" />
      ) : (
        <List size="sm" sx={{ '--ListItem-paddingY': '8px' }}>
          {vehicles.map((v) => (
            <ListItem key={v.id} startDecorator={<Avatar size="sm">{v.emoji || '🚗'}</Avatar>}>
              <ListItemContent>
                <Typography level="body-sm" fontWeight="bold">
                  {v.make} {v.model}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    size="sm"
                    variant={v.mot_due ? 'outlined' : 'soft'}
                    color={v.mot_due ? 'danger' : 'neutral'}
                  >
                    MOT: {v.mot_due || 'N/A'}
                  </Chip>
                  <Chip
                    size="sm"
                    variant={v.tax_due ? 'outlined' : 'soft'}
                    color={v.tax_due ? 'warning' : 'neutral'}
                  >
                    Tax: {v.tax_due || 'N/A'}
                  </Chip>
                </Box>
              </ListItemContent>
            </ListItem>
          ))}
          {vehicles.length === 0 && <Typography level="body-xs">No vehicles tracked.</Typography>}
        </List>
      )}
    </WidgetWrapper>
  );
}
