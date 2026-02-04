import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Divider, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel,
  Tooltip, IconButton, Grid, CircularProgress
} from '@mui/joy';
import { 
  Delete, Add, Info, Payments, PhotoCamera
} from '@mui/icons-material';
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';
import EmojiPicker from '../components/EmojiPicker';
import AppSelect from '../components/ui/AppSelect';

const VEHICLE_TYPES = [
    { value: 'Car', label: 'Car' },
    { value: 'Van', label: 'Van' },
    { value: 'Truck', label: 'Truck' },
    { value: 'Motorbike', label: 'Motorbike' },
    { value: 'Bicycle', label: 'Bicycle' },
    { value: 'Boat', label: 'Boat' },
    { value: 'Other', label: 'Other' }
];

export default function VehiclesView() {
  const { api, id: householdId, household, user: currentUser, showNotification, confirmAction, fetchVehicles: refreshSidebar } = useOutletContext();
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🚗');
  
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [vehicleType, setVehicleType] = useState('Car');

  const isAdmin = currentUser?.role === 'admin';

  const fetchVehiclesList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/vehicles`);
      setVehicles(res.data || []);
    } catch (err) {
      console.error("Failed to fetch vehicles", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === parseInt(vehicleId)), 
  [vehicles, vehicleId]);

  useEffect(() => {
    if (selectedVehicle) {
        Promise.resolve().then(() => {
            setSelectedEmoji(selectedVehicle.emoji || '🚗');
            setVehicleType(selectedVehicle.type || 'Car');
        });
    } else if (vehicleId === 'new') {
        Promise.resolve().then(() => {
            setSelectedEmoji('🚗');
            setVehicleType('Car');
        });
    }
  }, [selectedVehicle, vehicleId]);

  useEffect(() => { fetchVehiclesList(); }, [fetchVehiclesList]);

  const handleSubmitVehicle = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    data.type = vehicleType;

    try {
      if (vehicleId === 'new') {
        const res = await api.post(`/households/${householdId}/vehicles`, data);
        showNotification("Vehicle added.", "success");
        
        // Manual update for immediate availability
        setVehicles(prev => [...prev, res.data]);
        
        // Await synchronization
        await Promise.all([
            refreshSidebar(),
            fetchVehiclesList()
        ]);
        
        navigate(`/household/${householdId}/house`, { replace: true });
      } else {
        await api.put(`/households/${householdId}/vehicles/${vehicleId}`, data);
        showNotification("Vehicle updated.", "success");
        fetchVehiclesList();
        refreshSidebar();
      }
    } catch {
      showNotification("Error saving vehicle.", "danger");
    }
  };

  const handleDeleteVehicle = () => {
    confirmAction(
        "Remove Vehicle",
        `Permanently remove ${selectedVehicle.make} ${selectedVehicle.model} from the fleet? All history and financial data will be lost.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/vehicles/${vehicleId}`);
                showNotification("Vehicle removed.", "neutral");
                refreshSidebar();
                navigate('..');
            } catch {
                showNotification("Failed to delete.", "danger");
            }
        }
    );
  };

  const groupedVehicles = useMemo(() => {
    const groups = {};
    vehicles.forEach(v => {
        const type = v.type || 'Other';
        if (!groups[type]) groups[type] = [];
        groups[type].push(v);
    });
    return groups;
  }, [vehicles]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  if (vehicleId !== 'new' && !selectedVehicle) {
    return (
        <Box>
            <Box sx={{ 
                mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                flexWrap: 'wrap', gap: 2 
            }}>
              <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                  Vehicle Management
                </Typography>
                <Typography level="body-md" color="neutral">
                  Track maintenance, fuel, and vehicle history.
                </Typography>
              </Box>
              <Box>
                  {isAdmin && (
                      <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('new')}>Add Vehicle</Button>
                  )}
              </Box>
            </Box>
            
            {Object.keys(groupedVehicles).length === 0 && (
                 <Typography level="body-lg" textAlign="center" sx={{ mt: 5, color: 'neutral.500' }}>No vehicles found.</Typography>
            )}

            {Object.entries(groupedVehicles).map(([type, groupVehicles]) => (
                <Box key={type} sx={{ mb: 4 }}>
                    <Typography level="h4" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 'sm', opacity: 0.7 }}>
                        {type}s
                    </Typography>
                    <Grid container spacing={2}>
                        {groupVehicles.map(v => (
                            <Grid xs={12} sm={6} md={4} key={v.id}>
                                <Sheet 
                                    variant="outlined" 
                                    sx={{ 
                                        p: 2, borderRadius: 'md', display: 'flex', alignItems: 'center', gap: 2,
                                        cursor: 'pointer', transition: 'background-color 0.2s',
                                        '&:hover': { bgcolor: 'background.level1' }
                                    }}
                                    onClick={() => navigate(String(v.id))}
                                >
                                    <Box sx={{ fontSize: '2.5rem' }}>{v.emoji || '🚗'}</Box>
                                    <Box>
                                        <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{v.make} {v.model}</Typography>
                                        <Typography level="body-sm" color="neutral">{v.registration}</Typography>
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
    <Box key={vehicleId}>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                {vehicleId === 'new' ? 'Add New Vehicle' : `${selectedVehicle.make} ${selectedVehicle.model}`}
            </Typography>
            <Typography level="body-md" color="neutral">
                {vehicleId === 'new' ? 'Enter vehicle details below.' : 'View and manage vehicle details.'}
            </Typography>
        </Box>
        <Box>
            {vehicleId !== 'new' && isAdmin && (
                <Button color="danger" variant="soft" startDecorator={<Delete />} onClick={handleDeleteVehicle}>Remove Vehicle</Button>
            )}
        </Box>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '600px', overflow: 'hidden' }}>
        {vehicleId !== 'new' && (
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
                <TabList 
                    variant="plain" 
                    sx={{ 
                        p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2, 
                        overflow: 'auto',
                        '&::-webkit-scrollbar': { display: 'none' },
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Info sx={{ mr: 1 }}/> Identity</Tab>
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Vehicle Costs</Tab>
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {(activeTab === 0 || vehicleId === 'new') && (
            <Box>
                <form onSubmit={handleSubmitVehicle}>
                <Grid container spacing={3}>
                    <Grid xs={12} md={2}>
                        <IconButton 
                            onClick={() => setEmojiPickerOpen(true)} 
                            variant="outlined"
                            sx={{ width: 80, height: 80, borderRadius: 'xl', position: 'relative' }}
                        >
                            <Typography level="h1">{selectedEmoji}</Typography>
                            <PhotoCamera sx={{ position: 'absolute', bottom: -5, right: -5, fontSize: '1.2rem', color: 'primary.solidBg' }} />
                        </IconButton>
                    </Grid>
                    <Grid xs={12} md={5}>
                        <AppSelect 
                            label="Type" 
                            options={VEHICLE_TYPES} 
                            value={vehicleType} 
                            onChange={setVehicleType}
                            required
                        />
                    </Grid>
                    <Grid xs={12} md={5}>
                        <FormControl required>
                            <FormLabel>Make</FormLabel>
                            <Input name="make" defaultValue={selectedVehicle?.make} />
                        </FormControl>
                    </Grid>
                    <Grid xs={12} md={5}>
                        <FormControl required>
                            <FormLabel>Model</FormLabel>
                            <Input name="model" defaultValue={selectedVehicle?.model} />
                        </FormControl>
                    </Grid>
                    <Grid xs={12} md={4}>
                        <FormControl>
                            <FormLabel>Registration</FormLabel>
                            <Input name="registration" defaultValue={selectedVehicle?.registration} />
                        </FormControl>
                    </Grid>
                    
                    <Grid xs={12}><Divider>Asset Valuation</Divider></Grid>
                    <Grid xs={6} md={3}>
                        <FormControl>
                            <FormLabel>Purchase Value (£)</FormLabel>
                            <Input name="purchase_value" type="number" defaultValue={selectedVehicle?.purchase_value} />
                        </FormControl>
                    </Grid>
                    <Grid xs={6} md={3}>
                        <FormControl>
                            <FormLabel>Current Value (£)</FormLabel>
                            <Input name="current_value" type="number" defaultValue={selectedVehicle?.current_value} />
                        </FormControl>
                    </Grid>
                    <Grid xs={6} md={3}>
                        <FormControl>
                            <FormLabel>Replacement Cost (£)</FormLabel>
                            <Input name="replacement_cost" type="number" defaultValue={selectedVehicle?.replacement_cost} />
                        </FormControl>
                    </Grid>
                    <Grid xs={6} md={3}>
                        <FormControl>
                            <FormLabel>Annual Depreciation %</FormLabel>
                            <Input name="depreciation_rate" type="number" defaultValue={selectedVehicle?.depreciation_rate} />
                        </FormControl>
                    </Grid>

                    {vehicleId !== 'new' && (
                        <>
                            <Grid xs={12}><Divider>Maintenance Schedule</Divider></Grid>
                            <Grid xs={12} md={4}>
                                <FormControl>
                                    <FormLabel>MOT Due Date</FormLabel>
                                    <Input name="mot_due" type="date" defaultValue={selectedVehicle?.mot_due} />
                                </FormControl>
                            </Grid>
                            <Grid xs={12} md={4}>
                                <FormControl>
                                    <FormLabel>Tax Due Date</FormLabel>
                                    <Input name="tax_due" type="date" defaultValue={selectedVehicle?.tax_due} />
                                </FormControl>
                            </Grid>
                        </>
                    )}
                    
                    <Grid xs={12}>
                    <Button type="submit" variant="solid" size="lg">
                        {vehicleId === 'new' ? 'Create Vehicle' : 'Update Details'}
                    </Button>
                    </Grid>
                </Grid>
                </form>
            </Box>
          )}

          {activeTab === 1 && vehicleId !== 'new' && (
            <Box>
              <RecurringChargesWidget 
                api={api} 
                householdId={householdId} 
                household={household}
                entityType="vehicle" 
                entityId={vehicleId} 
                segments={[
                    { id: 'vehicle_finance', label: 'Finance' },
                    { id: 'insurance', label: 'Insurance' },
                    { id: 'vehicle_service', label: 'Service / Plan' },
                    { id: 'vehicle_tax', label: 'Tax' },
                    { id: 'vehicle_mot', label: 'MOT' },
                    { id: 'vehicle_fuel', label: 'Fuel' },
                    { id: 'vehicle_breakdown', label: 'Breakdown' },
                    { id: 'other', label: 'Other' }
                ]}
                title="Vehicle Costs"
                showNotification={showNotification}
                confirmAction={confirmAction}
              />
            </Box>
          )}
        </Box>
      </Sheet>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
            setSelectedEmoji(emoji);
            setEmojiPickerOpen(false);
        }}
        title="Select Vehicle Emoji"
      />
    </Box>
  );
}