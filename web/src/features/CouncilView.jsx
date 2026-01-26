import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Select, Option, Stack, Divider, Textarea, Checkbox
} from '@mui/joy';
import { Edit, Delete, AccountBalance, Add } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function CouncilView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [editAccount, setEditAccount] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin';

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get(`/households/${householdId}/council`);
      setAccounts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch council accounts", err);
    }
  }, [api, householdId]);

  useEffect(() => {
    Promise.resolve().then(() => fetchAccounts());
  }, [fetchAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.nearest_working_day = data.nearest_working_day === "1" ? 1 : 0;

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/council`, data);
        showNotification("Council account added.", "success");
      } else {
        await api.put(`/households/${householdId}/council/${editAccount.id}`, data);
        showNotification("Council account updated.", "success");
      }
      fetchAccounts();
      setEditAccount(null);
      setIsNew(false);
    } catch {
      showNotification("Failed to save account.", "danger");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this council account?")) return;
    try {
      await api.delete(`/households/${householdId}/council/${id}`);
      showNotification("Council account deleted.", "neutral");
      fetchAccounts();
    } catch {
      showNotification("Failed to delete account.", "danger");
    }
  };

  return (
    <Box>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
            Council Tax
          </Typography>
          <Typography level="body-md" color="neutral">
            Manage local authority tax accounts.
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
                    bgcolor: getEmojiColor(a.authority_name || 'Council', isDark),
                  }}>
                    <AccountBalance />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                      <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{a.authority_name}</Typography>
                      <Typography level="body-sm" color="neutral">Band {a.band}</Typography>
                      
                      <Stack spacing={0.5} mt={1}>
                        <Typography level="body-xs">Acc: {a.account_number}</Typography>
                        <Typography level="body-xs" fontWeight="bold">
                             £{a.monthly_amount} / {a.frequency || 'month'}
                        </Typography>
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
            <DialogTitle>{isNew ? 'Add Council Account' : `Edit ${editAccount?.authority_name}`}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={12} md={6}>
                            <FormControl required>
                                <FormLabel>Authority Name</FormLabel>
                                <Input name="authority_name" defaultValue={editAccount?.authority_name} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Tax Band</FormLabel>
                                <Select name="band" defaultValue={editAccount?.band || 'D'}>
                                    {['A','B','C','D','E','F','G','H'].map(b => (
                                        <Option key={b} value={b}>Band {b}</Option>
                                    ))}
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
                                <FormLabel>Payment Method</FormLabel>
                                <Input name="payment_method" defaultValue={editAccount?.payment_method} placeholder="e.g. Direct Debit" />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}><Divider>Billing</Divider></Grid>

                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Amount (£)</FormLabel>
                                <Input name="monthly_amount" type="number" step="0.01" defaultValue={editAccount?.monthly_amount} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Frequency</FormLabel>
                                <Select name="frequency" defaultValue={editAccount?.frequency || 'monthly'}>
                                    <Option value="monthly">Monthly</Option>
                                    <Option value="10-monthly">10 Monthly Installments</Option>
                                    <Option value="annual">Annual</Option>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Payment Day</FormLabel>
                                <Input name="payment_day" type="number" min="1" max="31" defaultValue={editAccount?.payment_day} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12}>
                            <Checkbox 
                                label="Nearest Working Day (Next)" 
                                name="nearest_working_day"
                                defaultChecked={editAccount?.nearest_working_day !== 0}
                                value="1"
                            />
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