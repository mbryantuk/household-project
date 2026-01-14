import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Select, Option, Stack, Chip, CircularProgress,
  Divider, Textarea
} from '@mui/joy';
import { Edit, Delete, ElectricBolt, Add, ReceiptLong } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function EnergyView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editAccount, setEditAccount] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin';

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
      showNotification("Failed to save account.", "danger");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this energy account?")) return;
    try {
      await api.delete(`/households/${householdId}/energy/${id}`);
      showNotification("Energy account deleted.", "neutral");
      fetchAccounts();
    } catch (err) {
      showNotification("Failed to delete account.", "danger");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
            Energy Accounts
          </Typography>
          <Typography level="body-md" color="neutral">
            Monitor electricity and gas usage and tariffs.
          </Typography>
        </Box>
        <Box>
          {isAdmin && (
              <Button variant="solid" startDecorator={<Add />} onClick={() => { setEditAccount({}); setIsNew(true); }}>
                  Add Account
              </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {accounts.map(a => (
          <Grid xs={12} sm={6} md={4} key={a.id}>
            <Card variant="outlined" sx={{ borderRadius: 'md', height: '100%', flexDirection: 'row', p: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                  <Avatar size="lg" sx={{ 
                    bgcolor: getEmojiColor(a.provider, isDark),
                  }}>
                    <ElectricBolt />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                      <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{a.provider}</Typography>
                      <Typography level="body-sm" color="neutral">{a.type}</Typography>
                      
                      <Stack spacing={1} mt={1}>
                        {a.account_number && <Typography level="body-xs">Acc: {a.account_number}</Typography>}
                        {a.tariff_name && <Typography level="body-xs" startDecorator={<ReceiptLong sx={{ fontSize: '1rem' }}/>}>{a.tariff_name}</Typography>}
                        {a.contract_end && (
                            <Chip 
                                size="sm" 
                                color={new Date(a.contract_end) < new Date() ? "warning" : "neutral"}
                                variant="outlined"
                            >
                                Ends: {a.contract_end}
                            </Chip>
                        )}
                      </Stack>
                  </Box>
                  {isAdmin && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <IconButton size="sm" variant="plain" onClick={() => { setEditAccount(a); setIsNew(false); }}><Edit /></IconButton>
                        <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(a.id)}><Delete /></IconButton>
                    </Box>
                  )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Modal open={Boolean(editAccount)} onClose={() => setEditAccount(null)}>
        <ModalDialog sx={{ maxWidth: 800, width: '100%' }}>
            <DialogTitle>{isNew ? 'Add Energy Account' : `Edit ${editAccount?.provider}`}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={12} md={6}>
                            <FormControl required>
                                <FormLabel>Energy Provider</FormLabel>
                                <Input name="provider" defaultValue={editAccount?.provider} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Account Type</FormLabel>
                                <Select name="type" defaultValue={editAccount?.type || 'Dual Fuel'}>
                                    <Option value="Dual Fuel">Dual Fuel</Option>
                                    <Option value="Electric Only">Electric Only</Option>
                                    <Option value="Gas Only">Gas Only</Option>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Account Number</FormLabel>
                                <Input name="account_number" defaultValue={editAccount?.account_number} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Tariff Name</FormLabel>
                                <Input name="tariff_name" defaultValue={editAccount?.tariff_name} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Contract End Date</FormLabel>
                                <Input name="contract_end" type="date" defaultValue={editAccount?.contract_end} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Payment Method</FormLabel>
                                <Input name="payment_method" defaultValue={editAccount?.payment_method} />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={12}><Divider>Electric Meter Info</Divider></Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Meter Serial</FormLabel>
                                <Input name="electric_meter_serial" defaultValue={editAccount?.electric_meter_serial} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>MPAN</FormLabel>
                                <Input name="electric_mpan" defaultValue={editAccount?.electric_mpan} />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={12}><Divider>Gas Meter Info</Divider></Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Meter Serial</FormLabel>
                                <Input name="gas_meter_serial" defaultValue={editAccount?.gas_meter_serial} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>MPRN</FormLabel>
                                <Input name="gas_mprn" defaultValue={editAccount?.gas_mprn} />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Notes</FormLabel>
                                <Textarea name="notes" defaultValue={editAccount?.notes} minRows={2} />
                            </FormControl>
                        </Grid>
                    </Grid>
                    <DialogActions>
                        <Button variant="plain" color="neutral" onClick={() => setEditAccount(null)}>Cancel</Button>
                        <Button type="submit" variant="solid">Save Account</Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}