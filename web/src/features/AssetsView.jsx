import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardContent, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Select, Option, Stack, Chip, CircularProgress, Divider,
  Tooltip
} from '@mui/joy';
import { Edit, Delete, Add, EventBusy, AccountBalanceWallet } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function AssetsView() {
  const { api, id: householdId, user: currentUser, isDark } = useOutletContext();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editAsset, setEditAsset] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin';

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
        <Typography level="h2" fontWeight="300">Appliance & Asset Register</Typography>
        {isHouseholdAdmin && (
            <Button variant="solid" startDecorator={<Add />} onClick={() => { setEditAsset({}); setIsNew(true); }}>
                Add Asset
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {assets.map(a => (
          <Grid xs={12} sm={6} md={4} key={a.id}>
            <Card variant="outlined" sx={{ borderRadius: 'md', height: '100%', flexDirection: 'row', p: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                  <Avatar size="lg" sx={{ 
                    bgcolor: getEmojiColor(a.emoji || a.name[0], isDark),
                  }}>
                    {a.emoji || a.name[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                      <Typography level="title-md">{a.name}</Typography>
                      <Typography level="body-sm" color="neutral">{a.category}</Typography>
                      
                      <Stack spacing={1} mt={1}>
                        {a.location && <Typography level="body-xs">📍 {a.location}</Typography>}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {a.purchase_value > 0 && <Chip size="sm" variant="outlined" startDecorator={<AccountBalanceWallet />}>£{a.purchase_value}</Chip>}
                            {a.warranty_expiry && (
                                <Chip 
                                    size="sm" 
                                    startDecorator={<EventBusy />} 
                                    color={new Date(a.warranty_expiry) < new Date() ? "danger" : "success"}
                                    variant="outlined"
                                >
                                    {a.warranty_expiry}
                                </Chip>
                            )}
                        </Box>
                      </Stack>
                  </Box>
                  {isHouseholdAdmin && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <IconButton size="sm" variant="plain" onClick={() => { setEditAsset(a); setIsNew(false); }}><Edit /></IconButton>
                        <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(a.id)}><Delete /></IconButton>
                    </Box>
                  )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Modal open={Boolean(editAsset)} onClose={() => setEditAsset(null)}>
        <ModalDialog sx={{ maxWidth: 800, width: '100%' }}>
            <DialogTitle>{isNew ? 'Add New Asset' : `Edit ${editAsset?.name}`}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={12} md={6}>
                            <FormControl required>
                                <FormLabel>Asset Name</FormLabel>
                                <Input name="name" defaultValue={editAsset?.name} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Category</FormLabel>
                                <Select name="category" defaultValue={editAsset?.category || 'Appliance'}>
                                    <Option value="Appliance">Appliance</Option>
                                    <Option value="Electronics">Electronics</Option>
                                    <Option value="Furniture">Furniture</Option>
                                    <Option value="Tool">Tool</Option>
                                    <Option value="Other">Other</Option>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Location (Room)</FormLabel>
                                <Input name="location" defaultValue={editAsset?.location} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Manufacturer</FormLabel>
                                <Input name="manufacturer" defaultValue={editAsset?.manufacturer} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Model Number</FormLabel>
                                <Input name="model_number" defaultValue={editAsset?.model_number} />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={12}><Divider>Financial & Warranty</Divider></Grid>
                        
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Purchase Date</FormLabel>
                                <Input name="purchase_date" type="date" defaultValue={editAsset?.purchase_date} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Warranty Expiry</FormLabel>
                                <Input name="warranty_expiry" type="date" defaultValue={editAsset?.warranty_expiry} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Purchase Value</FormLabel>
                                <Input name="purchase_value" type="number" defaultValue={editAsset?.purchase_value} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Replacement Cost</FormLabel>
                                <Input name="replacement_cost" type="number" defaultValue={editAsset?.replacement_cost} />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Monthly Maint. Cost</FormLabel>
                                <Input name="monthly_maintenance_cost" type="number" defaultValue={editAsset?.monthly_maintenance_cost} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Annual Depreciation %</FormLabel>
                                <Input name="depreciation_rate" type="number" defaultValue={editAsset?.depreciation_rate} placeholder="0.10" />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Emoji</FormLabel>
                                <Input name="emoji" defaultValue={editAsset?.emoji} placeholder="📦" />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Status</FormLabel>
                                <Input name="status" defaultValue={editAsset?.status || 'active'} />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Notes</FormLabel>
                                <Input name="notes" defaultValue={editAsset?.notes} />
                            </FormControl>
                        </Grid>
                    </Grid>
                    <DialogActions>
                        <Button variant="plain" color="neutral" onClick={() => setEditAsset(null)}>Cancel</Button>
                        <Button type="submit" variant="solid">Save Asset</Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
