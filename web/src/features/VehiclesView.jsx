import { useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Sheet, Grid, Button } from '@mui/joy';
import GenericObjectView from '../components/objects/GenericObjectView';

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

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === parseInt(vehicleId)),
    [vehicles, vehicleId]
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

    { type: 'header', label: 'Maintenance Schedule' },
    { name: 'mot_due', label: 'MOT Due Date', type: 'date', gridSpan: { md: 4 } },
    { name: 'tax_due', label: 'Tax Due Date', type: 'date', gridSpan: { md: 4 } },
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
              {groupVehicles.map((v) => (
                <Grid xs={12} sm={6} md={4} key={v.id}>
                  <Sheet
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 'md',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: 'background.level1' },
                    }}
                    onClick={() => navigate(String(v.id))}
                  >
                    <Box sx={{ fontSize: '2.5rem' }}>{v.emoji || '🚗'}</Box>
                    <Box>
                      <Typography level="title-md" sx={{ fontWeight: 'lg' }}>
                        {v.make} {v.model}
                      </Typography>
                      <Typography level="body-sm" color="neutral">
                        {v.registration}
                      </Typography>
                    </Box>
                  </Sheet>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Box>
    );
  }

  return (
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
  );
}
