import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, Tabs, TabList, Tab
} from '@mui/joy';
import { Edit, Delete, Add, Search, Inventory, Payments, Info } from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import AppSelect from '../components/ui/AppSelect';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';

export default function AssetsView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification } = useOutletContext();
  const { assetId, houseId } = useParams();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [filterQuery, setFilterQuery] = useState('');
  
  // Responsive Check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isAdmin = currentUser?.role === 'admin';

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/assets`);
      setAssets(res.data || []);
    } catch (err) {
      console.error("Failed to fetch assets", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const selectedAsset = useMemo(() => 
    assets.find(a => String(a.id) === String(assetId)), 
  [assets, assetId]);

  // Derived State: Filtered & Sorted Assets
  const processedAssets = useMemo(() => assets
    .filter(a => 
        a.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
        a.category.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (a.location && a.location.toLowerCase().includes(filterQuery.toLowerCase()))
    )
    .sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    }), [assets, filterQuery, sortConfig]);

  const handleSort = (key) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const SortableHeader = ({ label, field, width }) => (
      <th style={{ width, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(field)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {label}
              {sortConfig.key === field && (
                  <Typography level="body-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</Typography>
              )}
          </Box>
      </th>
  );

  const closeModal = () => {
      navigate(`/household/${householdId}/house/${houseId}`, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (assetId === 'new') {
        const res = await api.post(`/households/${householdId}/assets`, data);
        showNotification("Asset added.", "success");
        await fetchAssets();
        closeModal();
      } else {
        await api.put(`/households/${householdId}/assets/${assetId}`, data);
        showNotification("Asset updated.", "success");
        await fetchAssets();
        closeModal();
      }
    } catch {
      showNotification("Failed to save asset", "danger");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this asset permanently?")) return;
    try {
      await api.delete(`/households/${householdId}/assets/${id}`);
      fetchAssets();
      if (assetId) closeModal();
    } catch {
      showNotification("Failed to delete asset", "danger");
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
              Appliance & Asset Register
            </Typography>
            <Typography level="body-md" color="neutral">
              Manage your household inventory and valuables.
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Input 
                placeholder="Search assets..." 
                startDecorator={<Search />} 
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                sx={{ width: { xs: '100%', sm: 250 } }}
              />
              {isAdmin && (
                  <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('assets/new')}>
                      Add Asset
                  </Button>
              )}
          </Box>
        </Box>
      {/* DESKTOP VIEW: Standard Table with Sorting */}
      {!isMobile ? (
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto', flexGrow: 1 }}>
            <Table hoverRow stickyHeader>
                <thead>
                    <tr>
                        <th style={{ width: 60 }}></th>
                        <SortableHeader label="Asset Name" field="name" />
                        <SortableHeader label="Category" field="category" width={150} />
                        <SortableHeader label="Location" field="location" width={150} />
                        <SortableHeader label="Value" field="purchase_value" width={120} />
                        <SortableHeader label="Insurance" field="insurance_status" width={140} />
                        {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {processedAssets.map((row) => (
                        <tr key={row.id}>
                            <td>
                                <Avatar size="sm" sx={{ bgcolor: getEmojiColor(row.emoji || row.name[0], isDark) }}>
                                    {row.emoji || row.name[0]}
                                </Avatar>
                            </td>
                            <td>
                                <Typography level="body-md" sx={{ fontWeight: 'lg' }}>{row.name}</Typography>
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
                            {isAdmin && (
                                <td style={{ textAlign: 'right' }}>
                                    <IconButton size="sm" variant="plain" aria-label="Edit" onClick={() => navigate(`assets/${row.id}`)}><Edit /></IconButton>
                                    <IconButton size="sm" variant="plain" color="danger" aria-label="Delete" onClick={() => handleDelete(row.id)}><Delete /></IconButton>
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
            {processedAssets.map(a => (
            <Grid xs={12} key={a.id}>
                <Card variant="outlined" sx={{ flexDirection: 'row', gap: 2 }}>
                    <Avatar size="lg" sx={{ bgcolor: getEmojiColor(a.emoji || a.name[0], isDark) }}>
                        {a.emoji || a.name[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{a.name}</Typography>
                        <Typography level="body-sm">{a.category}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip size="sm" variant="outlined">£{a.purchase_value}</Chip>
                            <Chip size="sm" color={a.insurance_status === 'insured' ? 'success' : 'neutral'}>
                                {a.insurance_status || 'uninsured'}
                            </Chip>
                        </Box>
                    </Box>
                    <IconButton variant="plain" onClick={() => navigate(`assets/${a.id}`)}>
                        <Edit />
                    </IconButton>
                </Card>
            </Grid>
            ))}
        </Grid>
      )}

      {/* EDIT/DETAIL MODAL */}
      <Modal open={Boolean(assetId)} onClose={closeModal}>
        <ModalDialog sx={{ maxWidth: 800, width: '100%', p: 0, overflow: 'hidden' }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.level1' }}>
                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(selectedAsset?.name || 'A', isDark) }}>{selectedAsset?.emoji || selectedAsset?.name?.[0] || <Inventory />}</Avatar>
                <Box>
                    <Typography level="h3">{assetId === 'new' ? 'New Asset' : selectedAsset?.name}</Typography>
                    <Typography level="body-sm" color="neutral">{selectedAsset?.category} • {selectedAsset?.location || 'No Location'}</Typography>
                </Box>
            </Box>

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <TabList variant="plain" sx={{ px: 2, bgcolor: 'background.level1' }}>
                    <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'}><Info sx={{ mr: 1 }} /> Identity</Tab>
                    {assetId !== 'new' && (
                        <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'}><Payments sx={{ mr: 1 }} /> Recurring Costs</Tab>
                    )}
                </TabList>
                <Box sx={{ p: 3, minHeight: 400, overflowY: 'auto' }}>
                    {activeTab === 0 && (
                        <form id="asset-form" onSubmit={handleSubmit}>
                            <Grid container spacing={2}>
                                <Grid xs={12} md={6}>
                                    <FormControl required>
                                        <FormLabel>Asset Name</FormLabel>
                                        <Input name="name" defaultValue={selectedAsset?.name} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={12} md={6}>
                                    <AppSelect 
                                        label="Category"
                                        name="category"
                                        defaultValue={selectedAsset?.category || 'Appliance'}
                                        options={[
                                            { value: 'Appliance', label: 'Appliance' },
                                            { value: 'Electronics', label: 'Electronics' },
                                            { value: 'Furniture', label: 'Furniture' },
                                            { value: 'Tool', label: 'Tool' },
                                            { value: 'Property', label: 'Property / Real Estate' },
                                            { value: 'Other', label: 'Other' },
                                        ]}
                                    />
                                </Grid>
                                
                                <Grid xs={12} md={6}>
                                    <AppSelect 
                                        label="Insurance Status"
                                        name="insurance_status"
                                        defaultValue={selectedAsset?.insurance_status || 'uninsured'}
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
                                        <Input name="location" defaultValue={selectedAsset?.location} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={12} md={6}>
                                    <FormControl>
                                        <FormLabel>Manufacturer</FormLabel>
                                        <Input name="manufacturer" defaultValue={selectedAsset?.manufacturer} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={12} md={6}>
                                    <FormControl>
                                        <FormLabel>Model Number</FormLabel>
                                        <Input name="model_number" defaultValue={selectedAsset?.model_number} />
                                    </FormControl>
                                </Grid>

                                <Grid xs={12}><Divider>Financials</Divider></Grid>
                                
                                <Grid xs={6} md={3}>
                                    <FormControl>
                                        <FormLabel>Purchase Value (£)</FormLabel>
                                        <Input name="purchase_value" type="number" step="0.01" defaultValue={selectedAsset?.purchase_value} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6} md={3}>
                                    <FormControl>
                                        <FormLabel>Monthly Maintenance (£)</FormLabel>
                                        <Input name="monthly_maintenance_cost" type="number" step="0.01" defaultValue={selectedAsset?.monthly_maintenance_cost} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6} md={3}>
                                    <FormControl>
                                        <FormLabel>Notes</FormLabel>
                                        <Input name="notes" defaultValue={selectedAsset?.notes} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6} md={3}>
                                    <FormControl>
                                        <FormLabel>Emoji</FormLabel>
                                        <Input name="emoji" defaultValue={selectedAsset?.emoji} />
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </form>
                    )}
                    {activeTab === 1 && assetId !== 'new' && (
                        <RecurringCostsWidget 
                            api={api} 
                            householdId={householdId} 
                            parentType="asset" 
                            parentId={assetId} 
                            isAdmin={isAdmin} 
                            showNotification={showNotification} 
                        />
                    )}
                </Box>
            </Tabs>
            <Divider />
            <DialogActions sx={{ p: 2 }}>
                <Button variant="plain" color="neutral" onClick={() => navigate('../assets', { replace: true })}>Cancel</Button>
                {activeTab === 0 && (
                    <Button type="submit" form="asset-form" variant="solid">Save Asset</Button>
                )}
            </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
}