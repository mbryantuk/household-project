import { useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Sheet, Grid, Button, Chip, Alert, Input } from '@mui/joy';
import { Build, Warning, Speed, History } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import GenericObjectView from '../components/objects/GenericObjectView';
import MileageLogTab from '../components/objects/MileageLogTab';

const VEHICLE_TYPES = [
  { value: 'Car', label: 'Car' },
  { value: 'Van', label: 'Van' },
  { value: 'Truck', label: 'Truck' },
  { value: 'Motorbike', label: 'Motorbike' },
  { value: 'Bicycle', label: 'Bicycle' },
  { value: 'Boat', label: 'Boat' },
  { value: 'Other', label: 'Other' },
];

export default function VehiclesView() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    api,
    id: householdId,
    user: currentUser,
    showNotification,
    confirmAction,
    fetchVehicles: refreshSidebar,
    vehicles = [],
  } = useOutletContext();
  const { vehicleId } = useParams();
  const isAdmin = currentUser?.role === 'admin';

  const queryParams = new URLSearchParams(location.search);
  const searchName = queryParams.get('search');
  const logMileage = queryParams.get('mileage');

  // Auto-navigate to vehicle matching search (Command Bar support)
  useEffect(() => {
    if (searchName && !vehicleId && vehicles.length > 0) {
      const match = vehicles.find(
        (v) =>
          v.make?.toLowerCase().includes(searchName.toLowerCase()) ||
          v.model?.toLowerCase().includes(searchName.toLowerCase()) ||
          v.registration?.toLowerCase().includes(searchName.toLowerCase())
      );
      if (match) {
        navigate(`${match.id}${location.search}`, { replace: true });
      }
    }
  }, [searchName, vehicleId, vehicles, navigate, location.search]);

  // Fetch Maintenance Forecast (Item 224)
  const { data: forecasts = [] } = useQuery({
    queryKey: ['households', householdId, 'vehicles', 'forecast'],
    queryFn: () =>
      api.get(`/households/${householdId}/vehicles/forecast/maintenance`).then((res) => res.data),
    enabled: !!householdId,
  });

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === parseInt(vehicleId)),
    [vehicles, vehicleId]
  );

  const selectedForecast = useMemo(
    () => forecasts.find((f) => f.vehicleId === parseInt(vehicleId)),
    [forecasts, vehicleId]
  );

  const groupedVehicles = useMemo(() => {
    const groups = {};
    vehicles.forEach((v) => {
      const type = v.type || 'Other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(v);
    });
    return groups;
  }, [vehicles]);

  const FIELDS = [
    { name: 'emoji', type: 'emoji' },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: VEHICLE_TYPES,
      required: true,
      gridSpan: { md: 5 },
    },
    { name: 'make', label: 'Make', required: true, gridSpan: { md: 5 } },
    { name: 'model', label: 'Model', required: true, gridSpan: { md: 5 } },
    { name: 'registration', label: 'Registration', gridSpan: { md: 4 } },

    { type: 'header', label: 'Asset Valuation' },
    {
      name: 'purchase_value',
      label: 'Purchase Value (£)',
      type: 'number',
      gridSpan: { xs: 6, md: 3 },
    },
    {
      name: 'current_value',
      label: 'Current Value (£)',
      type: 'number',
      gridSpan: { xs: 6, md: 3 },
    },
    {
      name: 'replacement_cost',
      label: 'Replacement Cost (£)',
      type: 'number',
      gridSpan: { xs: 6, md: 3 },
    },
    {
      name: 'depreciation_rate',
      label: 'Depreciation %',
      type: 'number',
      gridSpan: { xs: 6, md: 3 },
    },

    { type: 'header', label: 'Maintenance & Usage (Item 224)' },
    { name: 'mot_due', label: 'MOT Due Date', type: 'date', gridSpan: { md: 4 } },
    { name: 'tax_due', label: 'Tax Due Date', type: 'date', gridSpan: { md: 4 } },
    {
      name: 'current_mileage',
      label: 'Current Odometer',
      type: 'number',
      gridSpan: { xs: 12, md: 4 },
    },
    {
      name: 'avg_monthly_mileage',
      label: 'Avg. Monthly Miles',
      type: 'number',
      gridSpan: { xs: 6, md: 4 },
    },
    {
      name: 'service_interval_miles',
      label: 'Service Interval (Miles)',
      type: 'number',
      gridSpan: { xs: 6, md: 4 },
    },
  ];

  const COST_SEGMENTS = [
    { id: 'vehicle_finance', label: 'Finance' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'vehicle_service', label: 'Service / Plan' },
    { id: 'vehicle_tax', label: 'Tax' },
    { id: 'vehicle_mot', label: 'MOT' },
    { id: 'vehicle_fuel', label: 'Fuel' },
    { id: 'vehicle_breakdown', label: 'Breakdown' },
    { id: 'other', label: 'Other' },
  ];

  const handleQuickMileageUpdate = async () => {
    try {
      await api.put(`/households/${householdId}/vehicles/${vehicleId}`, {
        ...selectedVehicle,
        current_mileage: parseInt(logMileage),
      });
      showNotification('Mileage updated successfully!', 'success');
      refreshSidebar();
      navigate('.', { replace: true });
    } catch {
      showNotification('Failed to update mileage.', 'danger');
    }
  };

  if (!vehicleId) {
    return (
      <Box data-testid="vehicles-view">
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              level="h2"
              data-testid="vehicles-heading"
              sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}
            >
              Vehicle Management
            </Typography>
            <Typography level="body-md" color="neutral">
              Track maintenance, fuel, and vehicle history.
            </Typography>
          </Box>
          <Box>
            {isAdmin && (
              <Button variant="solid" onClick={() => navigate('new')}>
                Add Vehicle
              </Button>
            )}
          </Box>
        </Box>

        {Object.keys(groupedVehicles).length === 0 && (
          <Typography level="body-lg" textAlign="center" sx={{ mt: 5, color: 'neutral.500' }}>
            No vehicles found.
          </Typography>
        )}

        {Object.entries(groupedVehicles).map(([type, groupVehicles]) => (
          <Box key={type} sx={{ mb: 4 }}>
            <Typography
              level="h4"
              sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 'sm', opacity: 0.7 }}
            >
              {type}s
            </Typography>
            <Grid container spacing={2}>
              {groupVehicles.map((v) => {
                const forecast = forecasts.find((f) => f.vehicleId === v.id);
                return (
                  <Grid xs={12} sm={6} md={4} key={v.id}>
                    <Sheet
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 'md',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: 'background.level1', boxShadow: 'sm' },
                      }}
                      onClick={() => navigate(String(v.id))}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ fontSize: '2.5rem' }}>{v.emoji || '🚗'}</Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography level="title-md" sx={{ fontWeight: 'lg' }}>
                            {v.make} {v.model}
                          </Typography>
                          <Typography level="body-xs" color="neutral">
                            {v.registration}
                          </Typography>
                        </Box>
                        {forecast?.isOverdue && (
                          <Chip
                            color="danger"
                            variant="solid"
                            size="sm"
                            startDecorator={<Warning />}
                          >
                            Overdue
                          </Chip>
                        )}
                      </Box>
                      {forecast && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'background.level2', borderRadius: 'xs' }}>
                          <Typography
                            level="body-xs"
                            startDecorator={<Build sx={{ fontSize: '0.75rem' }} />}
                          >
                            Next Service:{' '}
                            <b>{new Date(forecast.predictedServiceDate).toLocaleDateString()}</b>
                          </Typography>
                          <Typography level="body-xs" color="neutral">
                            Approx. {Math.max(0, forecast.milesToNextService).toLocaleString()}{' '}
                            miles remaining
                          </Typography>
                        </Box>
                      )}
                    </Sheet>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {logMileage && selectedVehicle && (
        <Alert
          variant="solid"
          color="primary"
          startDecorator={<Speed />}
          endDecorator={
            <Button size="sm" variant="solid" color="primary" onClick={handleQuickMileageUpdate}>
              Update to {logMileage}
            </Button>
          }
        >
          <Box>
            <Typography level="title-sm" color="inherit">
              Log New Mileage
            </Typography>
            <Typography level="body-sm" color="inherit">
              Would you like to update{' '}
              <b>
                {selectedVehicle.make} {selectedVehicle.model}
              </b>{' '}
              to <b>{parseInt(logMileage).toLocaleString()}</b> miles?
            </Typography>
          </Box>
        </Alert>
      )}

      {selectedForecast && (
        <Alert
          variant="soft"
          color={selectedForecast.isOverdue ? 'danger' : 'warning'}
          startDecorator={selectedForecast.isOverdue ? <Warning /> : <Build />}
          sx={{ mb: 1 }}
        >
          <Box sx={{ width: '100%' }}>
            <Typography level="title-sm">
              {selectedForecast.isOverdue
                ? 'Maintenance Overdue'
                : 'Upcoming Maintenance Prediction'}
            </Typography>
            <Typography level="body-sm" sx={{ mt: 0.5 }}>
              Based on your average mileage <b>({selectedForecast.dailyRate} miles/day)</b>, this
              vehicle will reach its service interval around{' '}
              <b>{new Date(selectedForecast.predictedServiceDate).toLocaleDateString()}</b>.
            </Typography>
            <Typography level="body-xs" sx={{ mt: 1, opacity: 0.8 }}>
              Prediction Confidence: <b>{selectedForecast.confidence.toUpperCase()}</b>
              {selectedForecast.confidence === 'low' && ' (Log more miles to improve accuracy)'}
            </Typography>
          </Box>
        </Alert>
      )}

      <GenericObjectView
        key={vehicleId}
        type="vehicle"
        id={vehicleId}
        householdId={householdId}
        api={api}
        endpoint={`/households/${householdId}/vehicles`}
        initialData={selectedVehicle}
        defaultValues={{ emoji: '🚗', type: 'Car', make: '', model: '' }}
        fields={FIELDS}
        costSegments={COST_SEGMENTS}
        extraTabs={[
          {
            id: 'mileage',
            label: 'Mileage',
            icon: History,
            content: () => (
              <MileageLogTab api={api} householdId={householdId} vehicleId={vehicleId} />
            ),
          },
        ]}
        onSave={() => refreshSidebar()}
        onDelete={() => {
          refreshSidebar();
          navigate('..');
        }}
        onCancel={() => navigate('..')}
        scope={{ isAdmin, showNotification, confirmAction }}
        title={(data) => (vehicleId === 'new' ? 'Add New Vehicle' : `${data.make} ${data.model}`)}
        subtitle={
          vehicleId === 'new' ? 'Enter vehicle details below.' : 'View and manage vehicle details.'
        }
      />
    </Box>
  );
}
