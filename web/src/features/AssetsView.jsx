import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Table, Grid, Card, Avatar, Chip, IconButton, Input, Button, CircularProgress 
} from '@mui/joy';
import { Edit, Delete, Add, Search } from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import GenericObjectView from '../components/objects/GenericObjectView';

export default function AssetsView() {
  const { api, id: householdId, user: currentUser, isDark, showNotification, confirmAction } = useOutletContext();
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  const FIELDS = [
    { name: 'emoji', type: 'emoji' },
    { name: 'name', label: 'Asset Name', required: true, gridSpan: { md: 6 } },
    { name: 'category', label: 'Category', type: 'select', options: [
        { value: 'Appliance', label: 'Appliance' },
        { value: 'Electronics', label: 'Electronics' },
        { value: 'Furniture', label: 'Furniture' },
        { value: 'Tool', label: 'Tool' },
        { value: 'Property', label: 'Property / Real Estate' },
        { value: 'Other', label: 'Other' },
    ], gridSpan: { md: 6 } },
    
    { name: 'insurance_status', label: 'Insurance Status', type: 'select', options: [
        { value: 'insured', label: 'Insured' },
        { value: 'uninsured', label: 'Uninsured' },
        { value: 'self-insured', label: 'Self-Insured' },
    ], gridSpan: { md: 6 } },

    { name: 'location', label: 'Location', gridSpan: { md: 6 } },
    { name: 'manufacturer', label: 'Manufacturer', gridSpan: { md: 6 } },
    { name: 'model_number', label: 'Model Number', gridSpan: { md: 6 } },

    { type: 'header', label: 'Financials' },
    { name: 'purchase_value', label: 'Purchase Value (£)', type: 'number', step: '0.01', gridSpan: { xs: 6, md: 3 } },
    { name: 'monthly_maintenance_cost', label: 'Monthly Maintenance (£)', type: 'number', step: '0.01', gridSpan: { xs: 6, md: 3 } },
    { name: 'notes', label: 'Notes', gridSpan: { md: 6 } }
  ];

  const COST_SEGMENTS = [
      { id: 'warranty', label: 'Warranty' },
      { id: 'insurance', label: 'Insurance' },
      { id: 'service', label: 'Service / Maintenance' },
      { id: 'subscription', label: 'Subscription' },
      { id: 'other', label: 'Other' }
  ];

  // --- DETAIL VIEW ---
  if (assetId) {
      return (
        <GenericObjectView
            key={assetId}
            type="asset"
            id={assetId}
            householdId={householdId}
            api={api}
            endpoint={`/households/${householdId}/assets`}
            initialData={selectedAsset}
            defaultValues={{ 
                emoji: '📦', category: 'Appliance', insurance_status: 'uninsured', 
                name: '', location: '', manufacturer: '', model_number: '', notes: '' 
            }}
            fields={FIELDS}
            costSegments={COST_SEGMENTS}
            onSave={() => fetchAssets()}
            onDelete={() => {
                fetchAssets();
                navigate('..');
            }}
            onCancel={() => navigate('..')}
            scope={{ isAdmin, showNotification, confirmAction }}
            title={(data) => assetId === 'new' ? 'New Asset' : data.name}
            subtitle={assetId === 'new' ? 'Register a new item.' : 'Manage inventory details.'}
        />
      );
  }

  // --- LIST VIEW ---
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
                  <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('new')}>
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
                        <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`${row.id}`)}>
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
                                    <IconButton size="sm" variant="plain" aria-label="Edit" onClick={(e) => { e.stopPropagation(); navigate(`${row.id}`); }}><Edit /></IconButton>
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
                <Card variant="outlined" sx={{ flexDirection: 'row', gap: 2 }} onClick={() => navigate(`${a.id}`)}>
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
                    <IconButton variant="plain" onClick={(e) => { e.stopPropagation(); navigate(`${a.id}`); }}>
                        <Edit />
                    </IconButton>
                </Card>
            </Grid>
            ))}
        </Grid>
      )}
    </Box>
  );
}
