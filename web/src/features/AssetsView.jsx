import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table
} from '@mui/joy';
import { Edit, Delete, Add, EventBusy, AccountBalanceWallet, VerifiedUser } from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import AppSelect from '../components/ui/AppSelect';

export default function AssetsView() {
  const { api, id: householdId, user: currentUser, isDark } = useOutletContext();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editAsset, setEditAsset] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  // Responsive Check (Simple width check or hook)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level="h2" fontWeight="300">Appliance & Asset Register</Typography>
        {isHouseholdAdmin && (
            <Button variant="solid" startDecorator={<Add />} onClick={() => { setEditAsset({}); setIsNew(true); }}>
                Add Asset
            </Button>
        )}
      </Box>

      {/* DESKTOP VIEW: Standard Table (Replaced DataGrid to fix Theme Crash) */}
      {!isMobile ? (
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
                <thead>
                    <tr>
                        <th style={{ width: 60 }}></th>
                        <th>Asset Name</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th>Value</th>
                        <th>Insurance</th>
                        {isHouseholdAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {assets.map((row) => (
                        <tr key={row.id}>
                            <td>
                                <Avatar size="sm" sx={{ bgcolor: getEmojiColor(row.emoji || row.name[0], isDark) }}>
                                    {row.emoji || row.name[0]}
                                </Avatar>
                            </td>
                            <td>
                                <Typography level="body-md" fontWeight="bold">{row.name}</Typography>
                                <Typography level="body-xs" color="neutral">{row.manufacturer} {row.model_number}</Typography>
                            </td>
                            <td>{row.category}</td>
                            <td>{row.location}</td>
                            <td>£{row.purchase_value}</td>
                            <td>
                                <Chip 
                                    size="sm" 
                                    variant="soft" 
                                    color={row.insurance_status === 'insured' ? 'success' : row.insurance_status === 'self-insured' ? 'warning' : 'danger'}
                                >
                                    {row.insurance_status || 'uninsured'}
                                </Chip>
                            </td>
                            {isHouseholdAdmin && (
                                <td style={{ textAlign: 'right' }}>
                                    <IconButton size="sm" variant="plain" onClick={() => { setEditAsset(row); setIsNew(false); }}><Edit /></IconButton>
                                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(row.id)}><Delete /></IconButton>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Sheet>
      ) : (
        /* MOBILE VIEW: Cards */
        <Grid container spacing={2}>
            {assets.map(a => (
            <Grid xs={12} key={a.id}>
                <Card variant="outlined" sx={{ flexDirection: 'row', gap: 2 }}>
                    <Avatar size="lg" sx={{ bgcolor: getEmojiColor(a.emoji || a.name[0], isDark) }}>
                        {a.emoji || a.name[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography level="title-md">{a.name}</Typography>
                        <Typography level="body-sm">{a.category}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip size="sm" variant="outlined">£{a.purchase_value}</Chip>
                            <Chip size="sm" color={a.insurance_status === 'insured' ? 'success' : 'neutral'}>
                                {a.insurance_status || 'uninsured'}
                            </Chip>
                        </Box>
                    </Box>
                    <IconButton variant="plain" onClick={() => { setEditAsset(a); setIsNew(false); }}>
                        <Edit />
                    </IconButton>
                </Card>
            </Grid>
            ))}
        </Grid>
      )}

      {/* EDIT MODAL */}
      <Modal open={Boolean(editAsset)} onClose={() => setEditAsset(null)}>
        <ModalDialog sx={{ maxWidth: 800, width: '100%', overflowY: 'auto' }}>
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
                            <AppSelect 
                                label="Category"
                                name="category"
                                value={editAsset?.category}
                                // Simple local state handling for uncontrolled form would be tricky with AppSelect
                                // So we let AppSelect be uncontrolled by passing defaultValue logic if supported or just default
                                defaultValue={editAsset?.category || 'Appliance'}
                                options={[
                                    { value: 'Appliance', label: 'Appliance' },
                                    { value: 'Electronics', label: 'Electronics' },
                                    { value: 'Furniture', label: 'Furniture' },
                                    { value: 'Tool', label: 'Tool' },
                                    { value: 'Other', label: 'Other' },
                                ]}
                            />
                        </Grid>
                        
                        <Grid xs={12} md={6}>
                             <AppSelect 
                                label="Insurance Status"
                                name="insurance_status"
                                defaultValue={editAsset?.insurance_status || 'uninsured'}
                                options={[
                                    { value: 'insured', label: 'Insured' },
                                    { value: 'uninsured', label: 'Uninsured' },
                                    { value: 'self-insured', label: 'Self-Insured' },
                                ]}
                            />
                        </Grid>

                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Location</FormLabel>
                                <Input name="location" defaultValue={editAsset?.location} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Manufacturer</FormLabel>
                                <Input name="manufacturer" defaultValue={editAsset?.manufacturer} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Model Number</FormLabel>
                                <Input name="model_number" defaultValue={editAsset?.model_number} />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}><Divider>Financials</Divider></Grid>
                        
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Purchase Value</FormLabel>
                                <Input name="purchase_value" type="number" defaultValue={editAsset?.purchase_value} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Monthly Maintenance</FormLabel>
                                <Input name="monthly_maintenance_cost" type="number" defaultValue={editAsset?.monthly_maintenance_cost} />
                            </FormControl>
                        </Grid>
                         <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Notes</FormLabel>
                                <Input name="notes" defaultValue={editAsset?.notes} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Emoji</FormLabel>
                                <Input name="emoji" defaultValue={editAsset?.emoji} />
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