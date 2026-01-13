import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet
} from '@mui/joy';
import { Edit, Delete, Add, EventBusy, AccountBalanceWallet, VerifiedUser } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
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
      // Add unique ID for DataGrid if needed (it uses 'id' by default)
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

  // --- DataGrid Columns (Desktop) ---
  const columns = [
    { 
      field: 'icon', headerName: '', width: 60,
      renderCell: (params) => (
        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(params.row.emoji || params.row.name[0], isDark) }}>
          {params.row.emoji || params.row.name[0]}
        </Avatar>
      )
    },
    { field: 'name', headerName: 'Asset Name', flex: 1, minWidth: 150 },
    { field: 'category', headerName: 'Category', width: 120 },
    { field: 'location', headerName: 'Location', width: 120 },
    { 
      field: 'purchase_value', headerName: 'Value', width: 100,
      renderCell: (params) => `£${params.row.purchase_value}`
    },
    { 
      field: 'insurance_status', headerName: 'Insurance', width: 120,
      renderCell: (params) => (
        <Chip 
            size="sm" 
            variant="soft" 
            color={params.value === 'insured' ? 'success' : params.value === 'self-insured' ? 'warning' : 'danger'}
        >
            {params.value || 'uninsured'}
        </Chip>
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: 100,
      renderCell: (params) => isHouseholdAdmin && (
        <Box>
          <IconButton size="sm" onClick={() => { setEditAsset(params.row); setIsNew(false); }}><Edit /></IconButton>
          <IconButton size="sm" color="danger" onClick={() => handleDelete(params.row.id)}><Delete /></IconButton>
        </Box>
      )
    }
  ];

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

      {/* DESKTOP VIEW: DataGrid */}
      {!isMobile ? (
        <Sheet sx={{ height: 600, width: '100%', borderRadius: 'md', overflow: 'hidden' }} variant="outlined">
            <DataGrid
                rows={assets}
                columns={columns}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                }}
                disableRowSelectionOnClick
                sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell': { fontSize: '0.9rem' },
                    '--DataGrid-overlayHeight': '300px', // Joy UI theme fix
                }}
            />
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
