import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CardContent, CircularProgress,
  Divider
} from '@mui/material';
import { Edit, Delete, Inventory, Add, EventBusy, AccountBalanceWallet } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function AssetsView() {
  const { api, id: householdId, user: currentUser, isDark } = useOutletContext();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editAsset, setEditAsset] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/assets`);
      setAssets(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/assets`, data);
      } else {
        await api.put(`/households/${householdId}/assets/${editAsset.id}`, data);
      }
      fetchAssets();
      setEditAsset(null);
      setIsNew(false);
    } catch (err) {
      alert("Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this asset permanently?")) return;
    try {
      await api.delete(`/households/${householdId}/assets/${id}`);
      fetchAssets();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="300">Appliance & Asset Register</Typography>
        {isHouseholdAdmin && (
            <Button variant="contained" startIcon={<Add />} onClick={() => { setEditAsset({}); setIsNew(true); }}>
                Add Asset
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {assets.map(a => (
          <Grid item xs={12} sm={6} md={4} key={a.id}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardHeader
                avatar={
                  <Avatar sx={{ 
                    bgcolor: getEmojiColor(a.emoji || a.name[0], isDark),
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)'
                  }}>
                    {a.emoji || a.name[0]}
                  </Avatar>
                }
                title={<Typography variant="h6">{a.name}</Typography>}
                subheader={a.category}
                action={isHouseholdAdmin && (
                  <Box>
                    <IconButton size="small" onClick={() => { setEditAsset(a); setIsNew(false); }}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                )}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1}>
                    {a.location && <Typography variant="body2" color="text.secondary">📍 {a.location}</Typography>}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {a.purchase_value > 0 && <Chip size="small" label={`£${a.purchase_value}`} icon={<AccountBalanceWallet sx={{fontSize: '1rem !important'}}/>} variant="outlined" />}
                        {a.warranty_expiry && (
                            <Chip 
                                size="small" 
                                icon={<EventBusy sx={{fontSize: '1rem !important'}} />} 
                                label={`Warranty: ${a.warranty_expiry}`}
                                color={new Date(a.warranty_expiry) < new Date() ? "error" : "success"}
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={Boolean(editAsset)} onClose={() => setEditAsset(null)} fullWidth maxWidth="md">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isNew ? 'Add New Asset' : `Edit ${editAsset?.name}`}</DialogTitle>
          <DialogContent dividers>
             <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}><TextField name="name" label="Asset Name" defaultValue={editAsset?.name} fullWidth required /></Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Category</InputLabel>
                        <Select name="category" defaultValue={editAsset?.category || 'Appliance'} label="Category">
                            <MenuItem value="Appliance">Appliance</MenuItem>
                            <MenuItem value="Electronics">Electronics</MenuItem>
                            <MenuItem value="Furniture">Furniture</MenuItem>
                            <MenuItem value="Tool">Tool</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={4}><TextField name="location" label="Location (Room)" defaultValue={editAsset?.location} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField name="manufacturer" label="Manufacturer" defaultValue={editAsset?.manufacturer} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField name="model_number" label="Model Number" defaultValue={editAsset?.model_number} fullWidth /></Grid>
                
                <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Financial & Warranty</Typography></Divider></Grid>
                
                <Grid item xs={6} md={3}><TextField name="purchase_date" label="Purchase Date" type="date" defaultValue={editAsset?.purchase_date} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                <Grid item xs={6} md={3}><TextField name="warranty_expiry" label="Warranty Expiry" type="date" defaultValue={editAsset?.warranty_expiry} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                <Grid item xs={6} md={3}><TextField name="purchase_value" label="Purchase Value" type="number" defaultValue={editAsset?.purchase_value} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="replacement_cost" label="Replacement Cost" type="number" defaultValue={editAsset?.replacement_cost} fullWidth /></Grid>
                
                <Grid item xs={6} md={3}><TextField name="monthly_maintenance_cost" label="Monthly Maint. Cost" type="number" defaultValue={editAsset?.monthly_maintenance_cost} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="depreciation_rate" label="Annual Depreciation %" type="number" defaultValue={editAsset?.depreciation_rate} fullWidth placeholder="0.10" /></Grid>
                <Grid item xs={6} md={3}><TextField name="emoji" label="Emoji" defaultValue={editAsset?.emoji} fullWidth placeholder="📦" /></Grid>
                <Grid item xs={6} md={3}><TextField name="status" label="Status" defaultValue={editAsset?.status || 'active'} fullWidth /></Grid>

                <Grid item xs={12}><TextField name="notes" label="Notes" defaultValue={editAsset?.notes} multiline rows={2} fullWidth /></Grid>
             </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditAsset(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Asset</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}