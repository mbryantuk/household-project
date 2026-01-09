import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Paper, Tabs, Tab, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Stack, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Tooltip, IconButton, Chip
} from '@mui/material';
import { 
  DirectionsCar, History, Receipt, Policy, 
  Add, Edit, Delete, Tune, Handyman
} from '@mui/icons-material';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import EmojiPicker from '../components/EmojiPicker';

export default function VehiclesView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification, confirmAction, fetchVehicles: refreshVehicles } = useOutletContext();
  const { vehicleId } = useParams();
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

  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

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
    } catch (err) { showNotification("Error saving vehicle.", "error"); }
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
    } catch (err) { showNotification("Error saving entry.", "error"); }
  };

  const handleDelete = () => {
    confirmAction(
        "Remove Vehicle",
        `Permanently remove ${selectedVehicle.make} ${selectedVehicle.model} from the fleet? All history and financial data will be lost.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/vehicles/${vehicleId}`);
                showNotification("Vehicle removed.", "info");
                refreshVehicles();
                navigate('..');
            } catch (err) {
                showNotification("Failed to delete.", "error");
            }
        }
    );
  };

  if (loading && vehicles.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (vehicleId !== 'new' && !selectedVehicle) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Select a vehicle from the menu.</Typography></Box>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="300">
            {vehicleId === 'new' ? 'Add New Vehicle' : `${selectedVehicle.make} ${selectedVehicle.model}`}
        </Typography>
        {vehicleId !== 'new' && isHouseholdAdmin && (
            <Button color="error" startIcon={<Delete />} onClick={handleDelete}>Remove Vehicle</Button>
        )}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3, minHeight: '600px', overflow: 'hidden' }}>
        {vehicleId !== 'new' && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ px: 2 }} variant="scrollable" scrollButtons="auto">
                  <Tab icon={<DirectionsCar />} iconPosition="start" label="Identity" />
                  <Tab icon={<History />} iconPosition="start" label="Service History" />
                  <Tab icon={<Receipt />} iconPosition="start" label="Finance" />
                  <Tab icon={<Policy />} iconPosition="start" label="Insurance" />
                  <Tab icon={<Handyman />} iconPosition="start" label="Service Plans" />
                  <Tab icon={<Tune />} iconPosition="start" label="Misc Costs" />
                </Tabs>
            </Box>
        )}

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {(activeTab === 0 || vehicleId === 'new') && (
            <form onSubmit={handleVehicleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={2}>
                    <Tooltip title="Pick an emoji">
                        <IconButton 
                            onClick={() => setEmojiPickerOpen(true)} 
                            sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', width: 80, height: 80 }}
                        >
                            <Typography sx={{ fontSize: '2.5rem' }}>{selectedEmoji}</Typography>
                        </IconButton>
                    </Tooltip>
                </Grid>
                <Grid item xs={12} md={5}><TextField name="make" label="Make" defaultValue={selectedVehicle?.make} fullWidth required /></Grid>
                <Grid item xs={12} md={5}><TextField name="model" label="Model" defaultValue={selectedVehicle?.model} fullWidth required /></Grid>
                <Grid item xs={12} md={4}><TextField name="registration" label="Registration" defaultValue={selectedVehicle?.registration} fullWidth /></Grid>
                
                {vehicleId !== 'new' && (
                    <>
                        <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Asset Valuation</Typography></Divider></Grid>
                        <Grid item xs={6} md={3}><TextField name="purchase_value" label="Purchase Value (£)" type="number" defaultValue={selectedVehicle?.purchase_value} fullWidth /></Grid>
                        <Grid item xs={6} md={3}><TextField name="replacement_cost" label="Replacement Cost (£)" type="number" defaultValue={selectedVehicle?.replacement_cost} fullWidth /></Grid>
                        <Grid item xs={6} md={3}><TextField name="monthly_maintenance_cost" label="Maint. Forecast (£/mo)" type="number" defaultValue={selectedVehicle?.monthly_maintenance_cost} fullWidth /></Grid>
                        <Grid item xs={6} md={3}><TextField name="depreciation_rate" label="Annual Depreciation %" type="number" defaultValue={selectedVehicle?.depreciation_rate} fullWidth /></Grid>

                        <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Maintenance Schedule</Typography></Divider></Grid>
                        <Grid item xs={12} md={4}><TextField name="mot_due" label="MOT Due Date" type="date" defaultValue={selectedVehicle?.mot_due} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                        <Grid item xs={12} md={4}><TextField name="tax_due" label="Tax Due Date" type="date" defaultValue={selectedVehicle?.tax_due} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                    </>
                )}
                
                <Grid item xs={12}>
                    <Button type="submit" variant="contained" size="large">
                        {vehicleId === 'new' ? 'Create Vehicle' : 'Update Details'}
                    </Button>
                </Grid>
              </Grid>
            </form>
          )}

          {activeTab > 0 && activeTab < 5 && vehicleId !== 'new' && (
            <Box>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">
                        {activeTab === 1 ? 'Service History' : activeTab === 2 ? 'Finance Agreements' : activeTab === 3 ? 'Insurance Policies' : 'Service Plans'}
                    </Typography>
                    {isHouseholdAdmin && <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setEditSub({})}>Add Entry</Button>}
                </Box>
                {subLoading ? <CircularProgress /> : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>Date / Provider</TableCell><TableCell>Details</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                            <TableBody>
                                {subData.map(row => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">{row.date || row.start_date || row.provider}</Typography>
                                            <Typography variant="caption" color="text.secondary">{row.provider}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{row.description || row.policy_number || row.details}</Typography>
                                            {row.cost && <Typography variant="caption">Cost: £{row.cost}</Typography>}
                                            {row.monthly_payment && <Typography variant="caption">Monthly: £{row.monthly_payment}</Typography>}
                                            {row.expiry_date && <Chip size="small" label={`Expires: ${row.expiry_date}`} sx={{ ml: 1 }} />}
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => setEditSub(row)}><Edit fontSize="inherit"/></IconButton>
                                            <IconButton size="small" color="error" onClick={() => api.delete(`/households/${householdId}/vehicles/${vehicleId}/${['fleet','services','finance','insurance','service_plans'][activeTab]}/${row.id}`).then(fetchSubData)}><Delete fontSize="inherit"/></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
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
      </Paper>

      <Dialog open={Boolean(editSub)} onClose={() => setEditSub(null)} fullWidth maxWidth="xs">
        <form onSubmit={handleSubSubmit}>
            <DialogTitle>Add {['','Service','Finance','Insurance','Service Plan'][activeTab]} Entry</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField name="provider" label="Provider / Garage" defaultValue={editSub?.provider} fullWidth required />
                    {(activeTab === 1 || activeTab === 2 || activeTab === 3) && (
                        <TextField name="date" label="Date" type="date" defaultValue={editSub?.date || editSub?.start_date} fullWidth InputLabelProps={{shrink:true}} />
                    )}
                    {(activeTab === 3 || activeTab === 4) && (
                        <TextField name="expiry_date" label="Expiry Date" type="date" defaultValue={editSub?.expiry_date} fullWidth InputLabelProps={{shrink:true}} />
                    )}
                    {activeTab === 1 && <TextField name="cost" label="Cost (£)" type="number" defaultValue={editSub?.cost} fullWidth />}
                    {activeTab === 2 && <TextField name="monthly_payment" label="Monthly Payment (£)" type="number" defaultValue={editSub?.monthly_payment} fullWidth />}
                    <TextField name="description" label="Details / Policy #" defaultValue={editSub?.description || editSub?.policy_number || editSub?.details} multiline rows={2} fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setEditSub(null)}>Cancel</Button>
                <Button type="submit" variant="contained">Save Entry</Button>
            </DialogActions>
        </form>
      </Dialog>

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
