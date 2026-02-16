import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Select, Option, Stack, Divider, Textarea, Checkbox
} from '@mui/joy';
import { Edit, Delete, WaterDrop, Add, Opacity } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function WaterView() {
  const { api, household, user: currentUser, isDark, showNotification, confirmAction } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [editAccount, setEditAccount] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin';
  const householdId = household?.id;

  const fetchAccounts = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await api.get(`/households/${householdId}/water`);
      setAccounts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch water accounts", err);
    }
  }, [api, householdId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) await fetchAccounts();
    };
    load();
    return () => { active = false; };
  }, [fetchAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Checkbox handling
    data.nearest_working_day = data.nearest_working_day === "1" ? 1 : 0;

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/water`, data);
        showNotification("Water account added.", "success");
      } else {
        await api.put(`/households/${householdId}/water/${editAccount.id}`, data);
        showNotification("Water account updated.", "success");
      }
      fetchAccounts();
      setEditAccount(null);
      setIsNew(false);
    } catch {
      showNotification("Failed to save account.", "danger");
    }
  };

  const handleDelete = async (id) => {
    confirmAction("Delete Water Account", "Are you sure you want to delete this water account? This cannot be undone.", async () => {
        try {
          await api.delete(`/households/${householdId}/water/${id}`);
          showNotification("Water account deleted", "success");
          fetchAccounts();
        } catch {
          showNotification("Failed to delete", "danger");
        }
    });
  };

  return (
    <Box>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
            Water Supply
          </Typography>
          <Typography level="body-md" color="neutral">
            Manage water and waste water services.
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
                    bgcolor: getEmojiColor(a.provider || 'Water', isDark),
                  }}>
                    <WaterDrop />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                      <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{a.provider}</Typography>
                      <Typography level="body-sm" color="neutral">{a.supply_type}</Typography>
                      
                      <Stack spacing={0.5} mt={1}>
                        <Typography level="body-xs">Acc: {a.account_number}</Typography>
                        {a.waste_provider && (
                            <Typography level="body-xs" startDecorator={<Opacity sx={{ fontSize: '0.8rem' }}/>}>
                                Waste: {a.waste_provider}
                            </Typography>
                        )}
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
            <DialogTitle>{isNew ? 'Add Water Account' : `Edit ${editAccount?.provider}`}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={12} md={6}>
                            <FormControl required>
                                <FormLabel>Provider Name</FormLabel>
                                <Input name="provider" defaultValue={editAccount?.provider} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Supply Type</FormLabel>
                                <Select name="supply_type" defaultValue={editAccount?.supply_type || 'Metered'}>
                                    <Option value="Metered">Metered</Option>
                                    <Option value="Rateable Value">Rateable Value</Option>
                                    <Option value="Assessed Charge">Assessed Charge</Option>
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
                                <FormLabel>Meter Serial (if applicable)</FormLabel>
                                <Input name="meter_serial" defaultValue={editAccount?.meter_serial} />
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
                                    <Option value="quarterly">Quarterly</Option>
                                    <Option value="biannual">Bi-annual</Option>
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
                        
                        <Grid xs={12}><Divider>Waste Water (if separate)</Divider></Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Waste Provider</FormLabel>
                                <Input name="waste_provider" defaultValue={editAccount?.waste_provider} placeholder="Same as Supply" />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Waste Account Number</FormLabel>
                                <Input name="waste_account_number" defaultValue={editAccount?.waste_account_number} />
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
