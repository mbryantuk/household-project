import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CardContent, CircularProgress
} from '@mui/material';
import { Edit, Delete, DirectionsCar, Add } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function VehiclesView() {
  const { api, id: householdId, user: currentUser, isDark } = useOutletContext();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editVehicle, setEditVehicle] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchVehicles = useCallback(async () => {
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

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/vehicles`, data);
      } else {
        await api.put(`/households/${householdId}/vehicles/${editVehicle.id}`, data);
      }
      fetchVehicles();
      setEditVehicle(null);
      setIsNew(false);
    } catch (err) {
      alert("Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await api.delete(`/households/${householdId}/vehicles/${id}`);
      fetchVehicles();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="300">Vehicles</Typography>
        {isHouseholdAdmin && (
            <Button variant="contained" startIcon={<Add />} onClick={() => { setEditVehicle({}); setIsNew(true); }}>
                Add Vehicle
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {vehicles.map(v => (
          <Grid item xs={12} sm={6} md={4} key={v.id}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardHeader
                avatar={
                  <Avatar sx={{ 
                    bgcolor: getEmojiColor(v.emoji || '🚗', isDark),
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)'
                  }}>
                    {v.emoji || '🚗'}
                  </Avatar>
                }
                title={<Typography variant="h6">{v.make} {v.model}</Typography>}
                subheader={v.registration}
                action={isHouseholdAdmin && (
                  <Box>
                    <IconButton size="small" onClick={() => { setEditVehicle(v); setIsNew(false); }}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(v.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                )}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">⛽ {v.fuel_type || 'Unknown Fuel'}</Typography>
                    {v.mot_due && <Chip size="small" label={`MOT Due: ${v.mot_due}`} color={new Date(v.mot_due) < new Date() ? "error" : "primary"} variant="outlined" />}
                    {v.insurance_expiry && <Chip size="small" label={`Ins Expiry: ${v.insurance_expiry}`} variant="outlined" />}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={Boolean(editVehicle)} onClose={() => setEditVehicle(null)} fullWidth maxWidth="md">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isNew ? 'Add Vehicle' : `Edit ${editVehicle?.make}`}</DialogTitle>
          <DialogContent dividers>
             <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}><TextField name="make" label="Make" defaultValue={editVehicle?.make} fullWidth required /></Grid>
                <Grid item xs={12} md={4}><TextField name="model" label="Model" defaultValue={editVehicle?.model} fullWidth required /></Grid>
                <Grid item xs={12} md={4}><TextField name="registration" label="Registration" defaultValue={editVehicle?.registration} fullWidth /></Grid>
                
                <Grid item xs={6} md={3}><TextField name="year" label="Year" type="number" defaultValue={editVehicle?.year} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="fuel_type" label="Fuel Type" defaultValue={editVehicle?.fuel_type} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="mileage" label="Current Mileage" type="number" defaultValue={editVehicle?.mileage} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="emoji" label="Emoji" defaultValue={editVehicle?.emoji} fullWidth placeholder="🚗" /></Grid>

                <Grid item xs={12} md={6}><TextField name="mot_due" label="MOT Due Date" type="date" defaultValue={editVehicle?.mot_due} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} md={6}><TextField name="tax_due" label="Tax Due Date" type="date" defaultValue={editVehicle?.tax_due} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                
                <Grid item xs={12} md={6}><TextField name="insurance_provider" label="Insurance Provider" defaultValue={editVehicle?.insurance_provider} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField name="insurance_expiry" label="Insurance Expiry" type="date" defaultValue={editVehicle?.insurance_expiry} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                
                <Grid item xs={12}><TextField name="notes" label="Notes" defaultValue={editVehicle?.notes} multiline rows={2} fullWidth /></Grid>
             </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditVehicle(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Vehicle</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}