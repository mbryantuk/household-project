import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, List, ListItem, ListItemButton, ListItemText, 
  ListItemIcon, Avatar, Paper, Tabs, Tab, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress
} from '@mui/material';
import { 
  DirectionsCar, History, Receipt, Engineering, Policy, Shield,
  Add, Edit, Delete, AccountBalanceWallet, Tune
} from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';

export default function VehiclesView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification } = useOutletContext();
  const [vehicles, setVehicles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Sub-data state
  const [subData, setSubData] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [editSub, setEditSub] = useState(null);

  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/vehicles`);
      const data = res.data || [];
      setVehicles(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [api, householdId, selectedId]);

  const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedId), [vehicles, selectedId]);

  const fetchSubData = useCallback(async () => {
    if (!selectedId) return;
    const views = ['fleet', 'services', 'finance', 'insurance']; // indices match tabs
    const view = views[activeTab];
    if (!view || view === 'fleet') return;

    setSubLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/vehicles/${selectedId}/${view}`);
      setSubData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setSubLoading(false); }
  }, [api, householdId, selectedId, activeTab]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { fetchSubData(); }, [selectedId, activeTab, fetchSubData]);

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (isAdding) {
        await api.post(`/households/${householdId}/vehicles`, data);
        showNotification("Vehicle added.", "success");
      } else {
        await api.put(`/households/${householdId}/vehicles/${selectedId}`, data);
        showNotification("Vehicle updated.", "success");
      }
      fetchVehicles();
      setIsAdding(false);
    } catch (err) { showNotification("Error saving vehicle.", "error"); }
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const views = ['fleet', 'services', 'finance', 'insurance'];
    const view = views[activeTab];
    try {
        if (editSub.id) await api.put(`/households/${householdId}/vehicles/${selectedId}/${view}/${editSub.id}`, data);
        else await api.post(`/households/${householdId}/vehicles/${selectedId}/${view}`, data);
        showNotification("Entry saved.", "success");
        fetchSubData();
        setEditSub(null);
    } catch (err) { showNotification("Error saving entry.", "error"); }
  };

  if (loading && vehicles.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ height: '100%' }}>
      <Grid container spacing={3}>
        {/* LEFT: VEHICLE SELECTION */}
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover' }}>
              <Typography variant="h6" fontWeight="bold">Fleet</Typography>
              {isHouseholdAdmin && (
                <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setIsAdding(true)}>Add</Button>
              )}
            </Box>
            <List sx={{ pt: 0 }}>
              {vehicles.map(v => (
                <ListItem key={v.id} disablePadding divider>
                  <ListItemButton selected={selectedId === v.id} onClick={() => { setSelectedId(v.id); setActiveTab(0); }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: getEmojiColor(v.emoji || '🚗', isDark), width: 32, height: 32 }}>{v.emoji || '🚗'}</Avatar>
                    </ListItemIcon>
                    <ListItemText primary={v.make} secondary={v.registration} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* RIGHT: TABS & DETAILS */}
        <Grid item xs={12} md={9}>
          {!selectedVehicle ? (
            <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Select a vehicle to manage.</Typography></Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 3, minHeight: '600px' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ px: 2 }} variant="scrollable" scrollButtons="auto">
                  <Tab icon={<DirectionsCar />} iconPosition="start" label="Identity" />
                  <Tab icon={<History />} iconPosition="start" label="Service History" />
                  <Tab icon={<Receipt />} iconPosition="start" label="Finance" />
                  <Tab icon={<Policy />} iconPosition="start" label="Insurance" />
                  <Tab icon={<Tune />} iconPosition="start" label="Misc Costs" />
                </Tabs>
              </Box>

              <Box sx={{ p: 4 }}>
                {/* IDENTITY TAB */}
                {activeTab === 0 && (
                  <form onSubmit={handleVehicleSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}><TextField name="make" label="Make" defaultValue={selectedVehicle.make} fullWidth required /></Grid>
                      <Grid item xs={12} md={4}><TextField name="model" label="Model" defaultValue={selectedVehicle.model} fullWidth required /></Grid>
                      <Grid item xs={12} md={4}><TextField name="registration" label="Registration" defaultValue={selectedVehicle.registration} fullWidth /></Grid>
                      
                      <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Asset Valuation</Typography></Divider></Grid>
                      <Grid item xs={6} md={3}><TextField name="purchase_value" label="Purchase Value (£)" type="number" defaultValue={selectedVehicle.purchase_value} fullWidth /></Grid>
                      <Grid item xs={6} md={3}><TextField name="replacement_cost" label="Replacement Cost (£)" type="number" defaultValue={selectedVehicle.replacement_cost} fullWidth /></Grid>
                      <Grid item xs={6} md={3}><TextField name="monthly_maintenance_cost" label="Maint. Forecast (£/mo)" type="number" defaultValue={selectedVehicle.monthly_maintenance_cost} fullWidth /></Grid>
                      <Grid item xs={6} md={3}><TextField name="depreciation_rate" label="Annual Depreciation %" type="number" defaultValue={selectedVehicle.depreciation_rate} fullWidth /></Grid>

                      <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Maintenance Schedule</Typography></Divider></Grid>
                      <Grid item xs={12} md={4}><TextField name="mot_due" label="MOT Due Date" type="date" defaultValue={selectedVehicle.mot_due} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                      <Grid item xs={12} md={4}><TextField name="tax_due" label="Tax Due Date" type="date" defaultValue={selectedVehicle.tax_due} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                      <Grid item xs={12} md={4}><TextField name="emoji" label="Emoji" defaultValue={selectedVehicle.emoji} fullWidth placeholder="🚗" /></Grid>
                      
                      <Grid item xs={12}><Button type="submit" variant="contained" size="large">Update Vehicle Details</Button></Grid>
                    </Grid>
                  </form>
                )}

                {/* LIST-BASED TABS (Services, Finance, Insurance) */}
                {activeTab > 0 && activeTab < 4 && (
                    <Box>
                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="h6">
                                {activeTab === 1 ? 'Service History' : activeTab === 2 ? 'Finance Agreements' : 'Insurance Policies'}
                            </Typography>
                            {isHouseholdAdmin && <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setEditSub({})}>Add Entry</Button>}
                        </Box>
                        {subLoading ? <CircularProgress size={30} /> : (
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
                                                    <Typography variant="body2">{row.description || row.policy_number}</Typography>
                                                    {row.cost && <Typography variant="caption">Cost: £{row.cost}</Typography>}
                                                    {row.monthly_payment && <Typography variant="caption">Monthly: £{row.monthly_payment}</Typography>}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" onClick={() => setEditSub(row)}><Edit fontSize="inherit"/></IconButton>
                                                    <IconButton size="small" color="error" onClick={() => { if(window.confirm("Delete?")) api.delete(`/households/${householdId}/vehicles/${selectedId}/${['fleet','services','finance','insurance'][activeTab]}/${row.id}`).then(fetchSubData); }}><Delete fontSize="inherit"/></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}

                {/* MISC COSTS TAB */}
                {activeTab === 4 && (
                    <RecurringCostsWidget 
                        api={api} 
                        householdId={householdId} 
                        parentType="vehicle" 
                        parentId={selectedId} 
                        isAdmin={isHouseholdAdmin}
                        showNotification={showNotification}
                    />
                )}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* VEHICLE ADD/EDIT DIALOG */}
      <Dialog open={isAdding} onClose={() => setIsAdding(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleVehicleSubmit}>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField name="make" label="Make" fullWidth required />
                    <TextField name="model" label="Model" fullWidth required />
                    <TextField name="registration" label="Registration" fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" variant="contained">Create Vehicle</Button>
            </DialogActions>
        </form>
      </Dialog>

      {/* SUB-ENTRY DIALOG */}
      <Dialog open={Boolean(editSub)} onClose={() => setEditSub(null)} fullWidth maxWidth="xs">
        <form onSubmit={handleSubSubmit}>
            <DialogTitle>Add {['','Service','Finance','Insurance'][activeTab]} Entry</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField name="provider" label="Provider / Garage" defaultValue={editSub?.provider} fullWidth required />
                    <TextField name="date" label="Date" type="date" defaultValue={editSub?.date || editSub?.start_date} fullWidth InputLabelProps={{shrink:true}} />
                    {activeTab === 1 && <TextField name="cost" label="Cost (£)" type="number" defaultValue={editSub?.cost} fullWidth />}
                    {activeTab === 2 && <TextField name="monthly_payment" label="Monthly Payment (£)" type="number" defaultValue={editSub?.monthly_payment} fullWidth />}
                    <TextField name="description" label="Details / Policy #" defaultValue={editSub?.description || editSub?.policy_number} multiline rows={2} fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setEditSub(null)}>Cancel</Button>
                <Button type="submit" variant="contained">Save Entry</Button>
            </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
