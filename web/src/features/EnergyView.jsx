import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CardContent, CircularProgress,
  Divider
} from '@mui/material';
import { Edit, Delete, ElectricBolt, Add, ReceiptLong } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function EnergyView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editAccount, setEditAccount] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/energy`);
      setAccounts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/energy`, data);
        showNotification("Energy account added.", "success");
      } else {
        await api.put(`/households/${householdId}/energy/${editAccount.id}`, data);
        showNotification("Energy account updated.", "success");
      }
      fetchAccounts();
      setEditAccount(null);
      setIsNew(false);
    } catch (err) {
      showNotification("Failed to save account.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this energy account?")) return;
    try {
      await api.delete(`/households/${householdId}/energy/${id}`);
      showNotification("Energy account deleted.", "info");
      fetchAccounts();
    } catch (err) {
      showNotification("Failed to delete account.", "error");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="300">Energy Accounts</Typography>
        {isHouseholdAdmin && (
            <Button variant="contained" startIcon={<Add />} onClick={() => { setEditAccount({}); setIsNew(true); }}>
                Add Account
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {accounts.map(a => (
          <Grid item xs={12} sm={6} md={4} key={a.id}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardHeader
                avatar={
                  <Avatar sx={{ 
                    bgcolor: getEmojiColor(a.provider, isDark),
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)'
                  }}>
                    <ElectricBolt />
                  </Avatar>
                }
                title={<Typography variant="h6">{a.provider}</Typography>}
                subheader={a.type}
                action={isHouseholdAdmin && (
                  <Box>
                    <IconButton size="small" onClick={() => { setEditAccount(a); setIsNew(false); }}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                )}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1}>
                    {a.account_number && <Typography variant="body2" color="text.secondary">Acc: {a.account_number}</Typography>}
                    {a.tariff_name && <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ReceiptLong fontSize="inherit"/> {a.tariff_name}</Typography>}
                    {a.contract_end && (
                        <Chip 
                            size="small" 
                            label={`Ends: ${a.contract_end}`}
                            color={new Date(a.contract_end) < new Date() ? "warning" : "default"}
                            variant="outlined"
                        />
                    )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={Boolean(editAccount)} onClose={() => setEditAccount(null)} fullWidth maxWidth="md">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isNew ? 'Add Energy Account' : `Edit ${editAccount?.provider}`}</DialogTitle>
          <DialogContent dividers>
             <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                    <TextField name="provider" label="Energy Provider" defaultValue={editAccount?.provider} fullWidth required />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Account Type</InputLabel>
                        <Select name="type" defaultValue={editAccount?.type || 'Dual Fuel'} label="Account Type">
                            <MenuItem value="Dual Fuel">Dual Fuel</MenuItem>
                            <MenuItem value="Electric Only">Electric Only</MenuItem>
                            <MenuItem value="Gas Only">Gas Only</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={6}><TextField name="account_number" label="Account Number" defaultValue={editAccount?.account_number} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField name="tariff_name" label="Tariff Name" defaultValue={editAccount?.tariff_name} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField name="contract_end" label="Contract End Date" type="date" defaultValue={editAccount?.contract_end} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} md={6}><TextField name="payment_method" label="Payment Method" defaultValue={editAccount?.payment_method} fullWidth /></Grid>
                
                <Divider sx={{ width: '100%', my: 1 }} />
                <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>Electric Meter Info</Typography>
                <Grid item xs={12} md={6}><TextField name="electric_meter_serial" label="Meter Serial" defaultValue={editAccount?.electric_meter_serial} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField name="electric_mpan" label="MPAN" defaultValue={editAccount?.electric_mpan} fullWidth /></Grid>
                
                <Divider sx={{ width: '100%', my: 1 }} />
                <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>Gas Meter Info</Typography>
                <Grid item xs={12} md={6}><TextField name="gas_meter_serial" label="Meter Serial" defaultValue={editAccount?.gas_meter_serial} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField name="gas_mprn" label="MPRN" defaultValue={editAccount?.gas_mprn} fullWidth /></Grid>
                
                <Grid item xs={12}>
                    <TextField name="notes" label="Notes" defaultValue={editAccount?.notes} multiline rows={2} fullWidth />
                </Grid>
             </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditAccount(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Account</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
