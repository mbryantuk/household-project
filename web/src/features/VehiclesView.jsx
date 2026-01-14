import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Select, Option, Stack, Divider,
  Tooltip, IconButton, Grid, Avatar, Chip, CircularProgress, Table
} from '@mui/joy';
import { 
  Edit, Delete, Add, Info, Shield, Payments, DirectionsCar
} from '@mui/icons-material';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

export default function VehiclesView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification, confirmAction, fetchVehicles: refreshSidebar } = useOutletContext();
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  const fetchVehiclesList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/vehicles`);
      setVehicles(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === parseInt(vehicleId)), 
  [vehicles, vehicleId]);

  useEffect(() => {
    if (selectedVehicle) setSelectedEmoji(selectedVehicle.emoji || '🚗');
    else if (vehicleId === 'new') setSelectedEmoji('🚗');
  }, [selectedVehicle, vehicleId]);

  const fetchSubData = useCallback(async () => {
    if (vehicleId === 'new' || !selectedVehicle) return;
    
    const endpoints = ['fleet', 'services', 'finance', 'insurance', 'service_plans'];
    const endpoint = endpoints[activeTab];
    
    if (!endpoint || endpoint === 'fleet') return;

    setSubLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/vehicles/${vehicleId}/${endpoint}`);
      setSubData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSubLoading(false);
    }
  }, [api, householdId, vehicleId, activeTab, selectedVehicle]);

  useEffect(() => { fetchVehiclesList(); }, [fetchVehiclesList]);
  useEffect(() => { fetchSubData(); }, [fetchSubData]);

  const handleSubmitVehicle = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;

    try {
      if (vehicleId === 'new') {
        const res = await api.post(`/households/${householdId}/vehicles`, data);
        showNotification("Vehicle added.", "success");
        refreshSidebar();
        navigate(`../${res.data.id}`);
      } else {
        await api.put(`/households/${householdId}/vehicles/${vehicleId}`, data);
        showNotification("Vehicle updated.", "success");
        fetchVehiclesList();
        refreshSidebar();
      }
    } catch (err) {
      showNotification("Error saving vehicle.", "danger");
    }
  };

  const handleSubmitSubEntry = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const endpoints = ['', 'services', 'finance', 'insurance', 'service_plans'];
    const endpoint = endpoints[activeTab];

    try {
      if (editItem.id) {
        await api.put(`/households/${householdId}/vehicles/${vehicleId}/${endpoint}/${editItem.id}`, data);
      } else {
        await api.post(`/households/${householdId}/vehicles/${vehicleId}/${endpoint}`, data);
      }
      showNotification("Entry saved.", "success");
      fetchSubData();
      setEditItem(null);
    } catch (err) {
      showNotification("Error saving entry.", "danger");
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
            } catch (err) {
                showNotification("Failed to delete.", "danger");
            }
        }
    );
  };

  if (loading && vehicles.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  if (vehicleId !== 'new' && !selectedVehicle) {
    return (
        <Box>
            <Box sx={{ 
                mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                flexWrap: 'wrap', gap: 2 
            }}>
              <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  Fleet Management
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
            <Grid container spacing={2}>
                {vehicles.map(v => (
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
    );
  }

  return (
    <Box key={vehicleId}>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
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
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Info sx={{ mr: 1 }}/> Service History</Tab>
                    <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Finance</Tab>
                    <Tab variant={activeTab === 3 ? 'solid' : 'plain'} color={activeTab === 3 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Shield sx={{ mr: 1 }}/> Insurance</Tab>
                    <Tab variant={activeTab === 4 ? 'solid' : 'plain'} color={activeTab === 4 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Info sx={{ mr: 1 }}/> Service Plans</Tab>
                    <Tab variant={activeTab === 5 ? 'solid' : 'plain'} color={activeTab === 5 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Misc Costs</Tab>
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {(activeTab === 0 || vehicleId === 'new') && (
            <form onSubmit={handleSubmitVehicle}>
              <Grid container spacing={3}>
                <Grid xs={12} md={2}>
                    <Tooltip title="Pick an emoji" variant="soft">
                        <IconButton 
                            onClick={() => setEmojiPickerOpen(true)} 
                            variant="outlined"
                            sx={{ width: 80, height: 80 }}
                        >
                            <Typography level="h1">{selectedEmoji}</Typography>
                        </IconButton>
                    </Tooltip>
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
                
                {vehicleId !== 'new' && (
                    <>
                        <Grid xs={12}><Divider>Asset Valuation</Divider></Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Purchase Value (£)</FormLabel>
                                <Input name="purchase_value" type="number" defaultValue={selectedVehicle?.purchase_value} />
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
                                <FormLabel>Maint. Forecast (£/mo)</FormLabel>
                                <Input name="monthly_maintenance_cost" type="number" defaultValue={selectedVehicle?.monthly_maintenance_cost} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Annual Depreciation %</FormLabel>
                                <Input name="depreciation_rate" type="number" defaultValue={selectedVehicle?.depreciation_rate} />
                            </FormControl>
                        </Grid>
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
          )}

          {activeTab > 0 && activeTab < 5 && vehicleId !== 'new' && (
            <Box>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography level="h3" sx={{ fontWeight: 'lg' }}>
                    {activeTab === 1 ? 'Service History' : activeTab === 2 ? 'Finance Agreements' : activeTab === 3 ? 'Insurance Policies' : 'Service Plans'}
                </Typography>
                {isAdmin && (
                    <Button size="sm" variant="outlined" startDecorator={<Add />} onClick={() => setEditItem({})}>Add Entry</Button>
                )}
              </Box>
              
              {subLoading ? <CircularProgress /> : (
                <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
                    <Table hoverRow>
                        <thead>
                            <tr>
                                <th>Date / Provider</th>
                                <th>Details</th>
                                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {subData.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <Typography level="body-sm" fontWeight="bold">{item.date || item.start_date || item.provider}</Typography>
                                        <Typography level="body-xs" color="neutral">{item.provider}</Typography>
                                    </td>
                                    <td>
                                        <Typography level="body-sm">{item.description || item.policy_number || item.details}</Typography>
                                        {item.cost && <Typography level="body-xs">Cost: £{item.cost}</Typography>}
                                        {item.monthly_payment && <Typography level="body-xs">Monthly: £{item.monthly_payment}</Typography>}
                                        {item.expiry_date && <Chip size="sm" sx={{ ml: 1 }}>Expires: {item.expiry_date}</Chip>}
                                    </td>
                                    {isAdmin && (
                                        <td style={{ textAlign: 'right' }}>
                                            <IconButton size="sm" variant="plain" onClick={() => setEditItem(item)}><Edit /></IconButton>
                                            <IconButton size="sm" variant="plain" color="danger" onClick={() => api.delete(`/households/${householdId}/vehicles/${vehicleId}/${['fleet', 'services', 'finance', 'insurance', 'service_plans'][activeTab]}/${item.id}`).then(fetchSubData)}><Delete /></IconButton>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Sheet>
              )}
            </Box>
          )}

          {activeTab === 5 && vehicleId !== 'new' && (
            <Box>
              <Typography level="h3" sx={{ fontWeight: 'lg', mb: 2 }}>Vehicle-Specific Recurring Costs</Typography>
              <RecurringCostsWidget 
                api={api} 
                householdId={householdId} 
                parentType="vehicle" 
                parentId={vehicleId} 
                isAdmin={isAdmin}
                showNotification={showNotification}
              />
            </Box>
          )}
        </Box>
      </Sheet>

      <Modal open={!!editItem} onClose={() => setEditItem(null)}>
        <ModalDialog>
            <DialogTitle>{editItem?.id ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
            <form onSubmit={handleSubmitSubEntry}>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <FormControl required>
                        <FormLabel>Provider / Garage</FormLabel>
                        <Input name="provider" defaultValue={editItem?.provider} />
                    </FormControl>
                    {(activeTab === 1 || activeTab === 2 || activeTab === 3) && (
                        <FormControl>
                            <FormLabel>Date</FormLabel>
                            <Input name="date" type="date" defaultValue={editItem?.date || editItem?.start_date} />
                        </FormControl>
                    )}
                    {(activeTab === 3 || activeTab === 4) && (
                        <FormControl>
                            <FormLabel>Expiry Date</FormLabel>
                            <Input name="expiry_date" type="date" defaultValue={editItem?.expiry_date} />
                        </FormControl>
                    )}
                    {activeTab === 1 && (
                        <FormControl>
                            <FormLabel>Cost (£)</FormLabel>
                            <Input name="cost" type="number" defaultValue={editItem?.cost} />
                        </FormControl>
                    )}
                    {activeTab === 2 && (
                        <FormControl>
                            <FormLabel>Monthly Payment (£)</FormLabel>
                            <Input name="monthly_payment" type="number" defaultValue={editItem?.monthly_payment} />
                        </FormControl>
                    )}
                    <FormControl>
                        <FormLabel>Details / Policy #</FormLabel>
                        <Input name="description" defaultValue={editItem?.description || editItem?.policy_number || editItem?.details} />
                    </FormControl>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2 }}>
                        <Button variant="plain" color="neutral" onClick={() => setEditItem(null)}>Cancel</Button>
                        <Button type="submit" variant="solid">Save Entry</Button>
                    </Box>
                </Stack>
            </form>
        </ModalDialog>
      </Modal>

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