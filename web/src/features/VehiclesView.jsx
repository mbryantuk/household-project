import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Select, Option, Stack, Divider,
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Table, 
  CircularProgress, Tooltip, IconButton, Chip
} from '@mui/joy';
import { 
  DirectionsCar, History, Receipt, Policy, 
  Add, Edit, Delete, Tune, Handyman
} from '@mui/icons-material';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import EmojiPicker from '../components/EmojiPicker';

export default function VehiclesView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification, confirmAction, fetchVehicles: refreshVehicles } = useOutletContext();
  const { vehicleId } = useParams();
  
  console.log("🚗 VehiclesView Rendered. ID:", vehicleId, "Mobile:", window.innerWidth < 900);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  
  // Local list for identification
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-data state
  const [subData, setSubData] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [editSub, setEditSub] = useState(null);

  const isHouseholdAdmin = currentUser?.role === 'admin';

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/vehicles`);
      setVehicles(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [api, householdId]);

  const selectedVehicle = useMemo(() => vehicles.find(v => v.id === parseInt(vehicleId)), [vehicles, vehicleId]);

  useMemo(() => {
    if (selectedVehicle) setSelectedEmoji(selectedVehicle.emoji || '🚗');
    else if (vehicleId === 'new') setSelectedEmoji('🚗');
  }, [selectedVehicle, vehicleId]);

  const fetchSubData = useCallback(async () => {
    if (vehicleId === 'new' || !selectedVehicle) return;
    const subViews = ['fleet', 'services', 'finance', 'insurance', 'service_plans'];
    const subView = subViews[activeTab];
    if (!subView || subView === 'fleet') return;

    setSubLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/vehicles/${vehicleId}/${subView}`);
      setSubData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setSubLoading(false); }
  }, [api, householdId, vehicleId, activeTab, selectedVehicle]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { fetchSubData(); }, [fetchSubData]);

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;

    try {
      if (vehicleId === 'new') {
        const res = await api.post(`/households/${householdId}/vehicles`, data);
        showNotification("Vehicle added.", "success");
        refreshVehicles();
        navigate(`../${res.data.id}`);
      } else {
        await api.put(`/households/${householdId}/vehicles/${vehicleId}`, data);
        showNotification("Vehicle updated.", "success");
        fetchVehicles();
        refreshVehicles();
      }
    } catch (err) { showNotification("Error saving vehicle.", "danger"); }
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const subViews = ['fleet', 'services', 'finance', 'insurance', 'service_plans'];
    const subView = subViews[activeTab];
    try {
        if (editSub.id) await api.put(`/households/${householdId}/vehicles/${vehicleId}/${subView}/${editSub.id}`, data);
        else await api.post(`/households/${householdId}/vehicles/${vehicleId}/${subView}`, data);
        showNotification("Entry saved.", "success");
        fetchSubData();
        setEditSub(null);
    } catch (err) { showNotification("Error saving entry.", "danger"); }
  };

  const handleDelete = () => {
    confirmAction(
        "Remove Vehicle",
        `Permanently remove ${selectedVehicle.make} ${selectedVehicle.model} from the fleet? All history and financial data will be lost.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/vehicles/${vehicleId}`);
                showNotification("Vehicle removed.", "neutral");
                refreshVehicles();
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
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography level="h2" fontWeight="300">Fleet</Typography>
                {isHouseholdAdmin && (
                    <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('new')}>Add Vehicle</Button>
                )}
            </Box>
            <Grid container spacing={2}>
                {vehicles.map(v => (
                    <Grid xs={12} sm={6} md={4} key={v.id}>
                        <Sheet 
                            variant="outlined" 
                            sx={{ 
                                p: 2, borderRadius: 'md', display: 'flex', alignItems: 'center', gap: 2,
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                '&:hover': { bgcolor: 'background.level1' }
                            }}
                            onClick={() => navigate(String(v.id))}
                        >
                            <Box sx={{ fontSize: '2.5rem' }}>{v.emoji || '🚗'}</Box>
                            <Box>
                                <Typography level="title-md">{v.make} {v.model}</Typography>
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
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography level="h2" fontWeight="300">
            {vehicleId === 'new' ? 'Add New Vehicle' : `${selectedVehicle.make} ${selectedVehicle.model}`}
        </Typography>
        {vehicleId !== 'new' && isHouseholdAdmin && (
            <Button color="danger" variant="soft" startDecorator={<Delete />} onClick={handleDelete}>Remove Vehicle</Button>
        )}
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '600px', overflow: 'hidden' }}>
        {vehicleId !== 'new' && (
            <Tabs 
                value={activeTab} 
                onChange={(e, v) => setActiveTab(v)} 
                sx={{ bgcolor: 'transparent' }}
            >
                <TabList 
                    variant="plain" 
                    sx={{ 
                        p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2, 
                        overflow: 'auto',
                        '&::-webkit-scrollbar': { display: 'none' },
                        whiteSpace: 'nowrap'
                    }}
                >
                  <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><DirectionsCar sx={{ mr: 1 }}/> Identity</Tab>
                  <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><History sx={{ mr: 1 }}/> Service History</Tab>
                  <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Receipt sx={{ mr: 1 }}/> Finance</Tab>
                  <Tab variant={activeTab === 3 ? 'solid' : 'plain'} color={activeTab === 3 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Policy sx={{ mr: 1 }}/> Insurance</Tab>
                  <Tab variant={activeTab === 4 ? 'solid' : 'plain'} color={activeTab === 4 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Handyman sx={{ mr: 1 }}/> Service Plans</Tab>
                  <Tab variant={activeTab === 5 ? 'solid' : 'plain'} color={activeTab === 5 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Tune sx={{ mr: 1 }}/> Misc Costs</Tab>
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {(activeTab === 0 || vehicleId === 'new') && (
            <form onSubmit={handleVehicleSubmit}>
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
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography level="h4">
                        {activeTab === 1 ? 'Service History' : activeTab === 2 ? 'Finance Agreements' : activeTab === 3 ? 'Insurance Policies' : 'Service Plans'}
                    </Typography>
                    {isHouseholdAdmin && <Button size="sm" variant="outlined" startDecorator={<Add />} onClick={() => setEditSub({})}>Add Entry</Button>}
                </Box>
                {subLoading ? <CircularProgress /> : (
                    <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
                        <Table hoverRow>
                            <thead>
                                <tr>
                                    <th>Date / Provider</th>
                                    <th>Details</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subData.map(row => (
                                    <tr key={row.id}>
                                        <td>
                                            <Typography level="body-sm" fontWeight="bold">{row.date || row.start_date || row.provider}</Typography>
                                            <Typography level="body-xs" color="neutral">{row.provider}</Typography>
                                        </td>
                                        <td>
                                            <Typography level="body-sm">{row.description || row.policy_number || row.details}</Typography>
                                            {row.cost && <Typography level="body-xs">Cost: £{row.cost}</Typography>}
                                            {row.monthly_payment && <Typography level="body-xs">Monthly: £{row.monthly_payment}</Typography>}
                                            {row.expiry_date && <Chip size="sm" sx={{ ml: 1 }}>Expires: {row.expiry_date}</Chip>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <IconButton size="sm" variant="plain" onClick={() => setEditSub(row)}><Edit /></IconButton>
                                            <IconButton size="sm" variant="plain" color="danger" onClick={() => api.delete(`/households/${householdId}/vehicles/${vehicleId}/${['fleet','services','finance','insurance','service_plans'][activeTab]}/${row.id}`).then(fetchSubData)}><Delete /></IconButton>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Sheet>
                )}
            </Box>
          )}

          {activeTab === 5 && vehicleId !== 'new' && (
            <RecurringCostsWidget 
                api={api} 
                householdId={householdId} 
                parentType="vehicle" 
                parentId={vehicleId} 
                isAdmin={isHouseholdAdmin}
                showNotification={showNotification}
            />
          )}
        </Box>
      </Sheet>

      <Modal open={Boolean(editSub)} onClose={() => setEditSub(null)}>
        <ModalDialog>
            <DialogTitle>Add {['','Service','Finance','Insurance','Service Plan'][activeTab]} Entry</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubSubmit}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl required>
                            <FormLabel>Provider / Garage</FormLabel>
                            <Input name="provider" defaultValue={editSub?.provider} />
                        </FormControl>
                        {(activeTab === 1 || activeTab === 2 || activeTab === 3) && (
                            <FormControl>
                                <FormLabel>Date</FormLabel>
                                <Input name="date" type="date" defaultValue={editSub?.date || editSub?.start_date} />
                            </FormControl>
                        )}
                        {(activeTab === 3 || activeTab === 4) && (
                            <FormControl>
                                <FormLabel>Expiry Date</FormLabel>
                                <Input name="expiry_date" type="date" defaultValue={editSub?.expiry_date} />
                            </FormControl>
                        )}
                        {activeTab === 1 && (
                            <FormControl>
                                <FormLabel>Cost (£)</FormLabel>
                                <Input name="cost" type="number" defaultValue={editSub?.cost} />
                            </FormControl>
                        )}
                        {activeTab === 2 && (
                            <FormControl>
                                <FormLabel>Monthly Payment (£)</FormLabel>
                                <Input name="monthly_payment" type="number" defaultValue={editSub?.monthly_payment} />
                            </FormControl>
                        )}
                        <FormControl>
                            <FormLabel>Details / Policy #</FormLabel>
                            <Input name="description" defaultValue={editSub?.description || editSub?.policy_number || editSub?.details} />
                        </FormControl>
                        
                        <DialogActions>
                            <Button variant="plain" color="neutral" onClick={() => setEditSub(null)}>Cancel</Button>
                            <Button type="submit" variant="solid">Save Entry</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
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