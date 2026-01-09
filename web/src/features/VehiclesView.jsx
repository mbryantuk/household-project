import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CardContent, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Edit, Delete, DirectionsCar, Add, History, Receipt, Engineering, Policy, Shield } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function VehiclesView({ view = 'fleet' }) {
  const { api, id: householdId, user: currentUser, isDark } = useOutletContext();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVehicle, setEditVehicle] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [subData, setSubData] = useState([]);
  const [subLoading, setSubDataLoading] = useState(false);
  const [editSub, setEditSub] = useState(null);

  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/vehicles`);
      const data = res.data || [];
      setVehicles(data);
      if (data.length > 0 && !selectedVehicle) setSelectedVehicle(data[0]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [api, householdId, selectedVehicle]);

  const fetchSubData = useCallback(async () => {
    if (!selectedVehicle || view === 'fleet') return;
    setSubDataLoading(true);
    try {
      const endpoint = `/households/${householdId}/vehicles/${selectedVehicle.id}/${view}`;
      const res = await api.get(endpoint);
      setSubData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setSubDataLoading(false); }
  }, [api, householdId, selectedVehicle, view]);

  useEffect(() => { fetchVehicles(); }, []);
  useEffect(() => { fetchSubData(); }, [selectedVehicle, view, fetchSubData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (isNew) await api.post(`/households/${householdId}/vehicles`, data);
      else await api.put(`/households/${householdId}/vehicles/${editVehicle.id}`, data);
      fetchVehicles(); setEditVehicle(null); setIsNew(false);
    } catch (err) { alert("Failed to save"); }
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
        if (editSub.id) await api.put(`/households/${householdId}/vehicles/${selectedVehicle.id}/${view}/${editSub.id}`, data);
        else await api.post(`/households/${householdId}/vehicles/${selectedVehicle.id}/${view}`, data);
        fetchSubData(); setEditSub(null);
    } catch (err) { alert("Failed to save"); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  const renderFleet = () => (
    <Grid container spacing={3}>
        {vehicles.map(v => (
          <Grid item xs={12} sm={6} md={4} key={v.id}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardHeader
                avatar={<Avatar sx={{ bgcolor: getEmojiColor(v.emoji || '🚗', isDark) }}>{v.emoji || '🚗'}</Avatar>}
                title={<Typography variant="h6">{v.make} {v.model}</Typography>}
                subheader={v.registration}
                action={isHouseholdAdmin && (
                  <Box>
                    <IconButton size="small" onClick={() => { setEditVehicle(v); setIsNew(false); }}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => { if(window.confirm("Delete?")) api.delete(`/households/${householdId}/vehicles/${v.id}`).then(fetchVehicles); }}><Delete fontSize="small" /></IconButton>
                  </Box>
                )}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">⛽ {v.fuel_type || 'Unknown'}</Typography>
                    {v.mot_due && <Chip size="small" label={`MOT: ${v.mot_due}`} color={new Date(v.mot_due) < new Date() ? "error" : "primary"} variant="outlined" />}
                    {v.tax_due && <Chip size="small" label={`Tax: ${v.tax_due}`} variant="outlined" />}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
    </Grid>
  );

  const renderSubView = () => {
    if (!selectedVehicle) return <Typography>No vehicles found. Add one first.</Typography>;
    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Select Vehicle</InputLabel>
                    <Select value={selectedVehicle.id} label="Select Vehicle" onChange={(e) => setSelectedVehicle(vehicles.find(v => v.id === e.target.value))}>
                        {vehicles.map(v => <MenuItem key={v.id} value={v.id}>{v.make} {v.model} ({v.registration})</MenuItem>)}
                    </Select>
                </FormControl>
                {isHouseholdAdmin && <Button variant="outlined" startIcon={<Add />} onClick={() => setEditSub({})}>Add Entry</Button>}
            </Box>

            {subLoading ? <CircularProgress /> : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date / Provider</TableCell>
                                <TableCell>Details</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {subData.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">{row.date || row.start_date || row.provider}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.provider || row.insurance_provider}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{row.description || row.coverage_details || row.policy_number || row.agreement_number}</Typography>
                                        {row.cost && <Typography variant="caption">Cost: £{row.cost}</Typography>}
                                        {row.expiry_date && <Chip size="small" label={`Expires: ${row.expiry_date}`} sx={{ ml: 1 }} />}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => setEditSub(row)}><Edit fontSize="small" /></IconButton>
                                        <IconButton size="small" color="error" onClick={() => api.delete(`/households/${householdId}/vehicles/${selectedVehicle.id}/${view}/${row.id}`).then(fetchSubData)}><Delete fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="300">
            {view === 'fleet' ? 'Vehicle Fleet' : `Vehicle ${view.charAt(0).toUpperCase() + view.slice(1)}`}
        </Typography>
        {view === 'fleet' && isHouseholdAdmin && (
            <Button variant="contained" startIcon={<Add />} onClick={() => { setEditVehicle({}); setIsNew(true); }}>Add Vehicle</Button>
        )}
      </Box>

      {view === 'fleet' ? renderFleet() : renderSubView()}

      {/* VEHICLE DIALOG */}
      <Dialog open={Boolean(editVehicle)} onClose={() => setEditVehicle(null)} fullWidth maxWidth="md">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isNew ? 'Add Vehicle' : 'Edit Vehicle'}</DialogTitle>
          <DialogContent dividers>
             <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}><TextField name="make" label="Make" defaultValue={editVehicle?.make} fullWidth required /></Grid>
                <Grid item xs={12} md={4}><TextField name="model" label="Model" defaultValue={editVehicle?.model} fullWidth required /></Grid>
                <Grid item xs={12} md={4}><TextField name="registration" label="Registration" defaultValue={editVehicle?.registration} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="fuel_type" label="Fuel" defaultValue={editVehicle?.fuel_type} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="mot_due" label="MOT Due" type="date" defaultValue={editVehicle?.mot_due} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                <Grid item xs={6} md={3}><TextField name="tax_due" label="Tax Due" type="date" defaultValue={editVehicle?.tax_due} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                <Grid item xs={6} md={3}><TextField name="emoji" label="Emoji" defaultValue={editVehicle?.emoji} fullWidth placeholder="🚗" /></Grid>
             </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditVehicle(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* SUB-DATA DIALOG */}
      <Dialog open={Boolean(editSub)} onClose={() => setEditSub(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleSubSubmit}>
            <DialogTitle>Entry for {selectedVehicle?.make}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField name="provider" label="Provider" defaultValue={editSub?.provider} fullWidth required />
                    {(view === 'history' || view === 'finance' || view === 'insurance') && (
                        <TextField name="date" label="Date / Start Date" type="date" defaultValue={editSub?.date || editSub?.start_date} fullWidth InputLabelProps={{shrink:true}} />
                    )}
                    {(view === 'warranty' || view === 'insurance' || view === 'finance' || view === 'service_plans') && (
                        <TextField name="expiry_date" label="Expiry / End Date" type="date" defaultValue={editSub?.expiry_date || editSub?.end_date} fullWidth InputLabelProps={{shrink:true}} />
                    )}
                    {view === 'history' && <TextField name="mileage" label="Mileage" type="number" defaultValue={editSub?.mileage} fullWidth />}
                    {view === 'history' && <TextField name="cost" label="Cost" type="number" defaultValue={editSub?.cost} fullWidth />}
                    <TextField name="description" label="Details / Policy # / Notes" defaultValue={editSub?.description || editSub?.policy_number || editSub?.coverage_details} multiline rows={3} fullWidth />
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
