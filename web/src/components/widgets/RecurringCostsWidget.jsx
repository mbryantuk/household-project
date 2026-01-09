import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, IconButton, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, FormControl, InputLabel, 
  Select, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, CircularProgress, FormControlLabel, Switch
} from '@mui/material';
import { Add, Edit, Delete, ReceiptLong } from '@mui/icons-material';

export default function RecurringCostsWidget({ api, householdId, parentType, parentId, showNotification, isAdmin }) {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [isNearestWorkingDay, setIsNearestWorkingDay] = useState(false);

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/costs`);
      // Filter for this specific parent
      const filtered = (res.data || []).filter(c => c.parent_type === parentType && c.parent_id === parseInt(parentId));
      setCosts(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, parentType, parentId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  useEffect(() => {
    if (editItem) {
      setIsNearestWorkingDay(Boolean(editItem.nearest_working_day));
    }
  }, [editItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.parent_type = parentType;
    data.parent_id = parentId;
    data.nearest_working_day = isNearestWorkingDay ? 1 : 0;

    try {
      if (editItem.id) {
        await api.put(`/households/${householdId}/costs/${editItem.id}`, data);
        showNotification("Cost updated.", "success");
      } else {
        await api.post(`/households/${householdId}/costs`, data);
        showNotification("Cost added.", "success");
      }
      fetchCosts();
      setEditItem(null);
    } catch (err) {
      showNotification("Failed to save cost.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this recurring cost?")) return;
    try {
      await api.delete(`/households/${householdId}/costs/${id}`);
      showNotification("Cost deleted.", "info");
      fetchCosts();
    } catch (err) {
      showNotification("Failed to delete.", "error");
    }
  };

  if (loading && costs.length === 0) return <CircularProgress size={20} />;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLong fontSize="small" color="primary" /> Misc / Recurring Costs
        </Typography>
        {isAdmin && (
            <Button size="small" startIcon={<Add />} onClick={() => setEditItem({})}>Add Cost</Button>
        )}
      </Box>

      {costs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No misc costs recorded.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Frequency</TableCell>
                        {isAdmin && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {costs.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>£{row.amount}</TableCell>
                            <TableCell>
                                <Chip label={row.frequency} size="small" variant="outlined" />
                                {row.payment_day && <Typography variant="caption" display="block">Day: {row.payment_day} {row.nearest_working_day ? '(NWD)' : ''}</Typography>}
                            </TableCell>
                            {isAdmin && (
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => setEditItem(row)}><Edit fontSize="inherit" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}><Delete fontSize="inherit" /></IconButton>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
      )}

      <Dialog open={Boolean(editItem)} onClose={() => setEditItem(null)} fullWidth maxWidth="xs">
        <form onSubmit={handleSubmit}>
            <DialogTitle>{editItem?.id ? 'Edit Cost' : 'Add Recurring Cost'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField name="name" label="Cost Name" defaultValue={editItem?.name} fullWidth required />
                    <TextField name="amount" label="Amount (£)" type="number" defaultValue={editItem?.amount} fullWidth required />
                    <FormControl fullWidth>
                        <InputLabel>Frequency</InputLabel>
                        <Select name="frequency" defaultValue={editItem?.frequency || 'Monthly'} label="Frequency">
                            <MenuItem value="Daily">Daily</MenuItem>
                            <MenuItem value="Weekly">Weekly</MenuItem>
                            <MenuItem value="Biweekly">Biweekly</MenuItem>
                            <MenuItem value="Monthly">Monthly</MenuItem>
                            <MenuItem value="Yearly">Yearly</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField name="payment_day" label="Payment Day (1-31)" type="number" defaultValue={editItem?.payment_day} fullWidth />
                    
                    <FormControlLabel 
                        control={<Switch checked={isNearestWorkingDay} onChange={e => setIsNearestWorkingDay(e.target.checked)} />} 
                        label="Nearest Working Day (Prior)" 
                    />

                    <TextField name="notes" label="Notes" defaultValue={editItem?.notes} multiline rows={2} fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" variant="contained">Save Cost</Button>
            </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}