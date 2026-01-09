import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CardContent, CircularProgress
} from '@mui/material';
import { Edit, Delete, DeleteSweep, Add } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function WasteView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification } = useOutletContext();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/waste`);
      setCollections(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/waste`, data);
        showNotification("Waste collection added.", "success");
      } else {
        await api.put(`/households/${householdId}/waste/${editItem.id}`, data);
        showNotification("Waste collection updated.", "success");
      }
      fetchCollections();
      setEditItem(null);
      setIsNew(false);
    } catch (err) {
      showNotification("Failed to save collection.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this collection?")) return;
    try {
      await api.delete(`/households/${householdId}/waste/${id}`);
      showNotification("Collection deleted.", "info");
      fetchCollections();
    } catch (err) {
      showNotification("Failed to delete collection.", "error");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="300">Waste Collections</Typography>
        {isHouseholdAdmin && (
            <Button variant="contained" startIcon={<Add />} onClick={() => { setEditItem({}); setIsNew(true); }}>
                Add Collection
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {collections.map(c => (
          <Grid item xs={12} sm={6} md={4} key={c.id}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardHeader
                avatar={
                  <Avatar sx={{ 
                    bgcolor: getEmojiColor(c.waste_type, isDark),
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)'
                  }}>
                    <DeleteSweep />
                  </Avatar>
                }
                title={<Typography variant="h6">{c.waste_type}</Typography>}
                subheader={`${c.frequency} on ${c.collection_day}s`}
                action={isHouseholdAdmin && (
                  <Box>
                    <IconButton size="small" onClick={() => { setEditItem(c); setIsNew(false); }}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                )}
              />
              {c.notes && (
                <CardContent sx={{ pt: 0 }}>
                    <Typography variant="body2" color="text.secondary">{c.notes}</Typography>
                </CardContent>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={Boolean(editItem)} onClose={() => setEditItem(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isNew ? 'Add Waste Collection' : `Edit ${editItem?.waste_type}`}</DialogTitle>
          <DialogContent dividers>
             <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField name="waste_type" label="Waste Type (e.g. Recycling, General)" defaultValue={editItem?.waste_type} fullWidth required />
                
                <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select name="frequency" defaultValue={editItem?.frequency || 'Weekly'} label="Frequency">
                        <MenuItem value="Daily">Daily</MenuItem>
                        <MenuItem value="Weekly">Weekly</MenuItem>
                        <MenuItem value="Biweekly">Biweekly</MenuItem>
                        <MenuItem value="Monthly">Monthly</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth>
                    <InputLabel>Collection Day</InputLabel>
                    <Select name="collection_day" defaultValue={editItem?.collection_day || 'Monday'} label="Collection Day">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                            <MenuItem key={day} value={day}>{day}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField name="notes" label="Notes" defaultValue={editItem?.notes} multiline rows={2} fullWidth />
             </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditItem(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Collection</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
