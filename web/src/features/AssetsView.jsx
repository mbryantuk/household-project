import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CardContent, CircularProgress
} from '@mui/material';
import { Edit, Delete, Inventory, Add, EventBusy } from '@mui/icons-material';
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
        <Typography variant="h4" fontWeight="300">Assets & Warranties</Typography>
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
                    bgcolor: getEmojiColor(a.emoji || '📦', isDark),
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)'
                  }}>
                    {a.emoji || '📦'}
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
                    {a.warranty_expiry && (
                        <Chip 
                            size="small" 
                            icon={<EventBusy />} 
                            label={`Warranty: ${a.warranty_expiry}`}
                            color={new Date(a.warranty_expiry) < new Date() ? "error" : "success"}
                            variant="outlined"
                        />
                    )}
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
                <Grid item xs={12} md={8}>
                    <TextField name="name" label="Asset Name" defaultValue={editAsset?.name} fullWidth required />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField name="emoji" label="Emoji" defaultValue={editAsset?.emoji} fullWidth placeholder="📦" />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField name="category" label="Category" defaultValue={editAsset?.category} fullWidth placeholder="e.g. Appliance" />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField name="location" label="Location" defaultValue={editAsset?.location} fullWidth placeholder="e.g. Kitchen" />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField name="manufacturer" label="Manufacturer" defaultValue={editAsset?.manufacturer} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField name="model_number" label="Model Number" defaultValue={editAsset?.model_number} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField name="serial_number" label="Serial Number" defaultValue={editAsset?.serial_number} fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField name="purchase_date" label="Purchase Date" type="date" defaultValue={editAsset?.purchase_date} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField name="warranty_expiry" label="Warranty Expiry" type="date" defaultValue={editAsset?.warranty_expiry} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField name="purchase_price" label="Purchase Price" type="number" defaultValue={editAsset?.purchase_price} fullWidth />
                </Grid>
                <Grid item xs={12}>
                    <TextField name="notes" label="Notes" defaultValue={editAsset?.notes} multiline rows={3} fullWidth />
                </Grid>
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
