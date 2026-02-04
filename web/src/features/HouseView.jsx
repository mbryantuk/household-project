import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Divider, Tabs, TabList, Tab, CircularProgress, Grid, Input, Button, Tooltip, IconButton, FormControl, FormLabel, Badge, Stack, Chip, Avatar, Card,
  Dropdown, Menu, MenuButton, MenuItem
} from '@mui/joy';
import { 
  HomeWork, Payments, Save, ArrowBack, Inventory, DirectionsCar, Add, Groups, ArrowDropDown
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

// Feature Components
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';
import GeneralDetailView from './GeneralDetailView';
import AssetsView from './AssetsView';

export default function HouseView() {
  const { api, id: householdId, onUpdateHousehold, user: currentUser, showNotification, confirmAction, isDark, members = [] } = useOutletContext();
  const household_data = useOutletContext().household;
  const isAdmin = currentUser?.role === 'admin';
  const { houseId, assetId } = useParams();
  const navigate = useNavigate();

  const location = useLocation();
  // If houseId is provided, we show the property details tabs. 
  // Otherwise, we show the Household Hub selector.
  const [viewMode, setViewMode] = useState(houseId ? 'details' : 'selector'); 
  const [activeTab, setActiveTab] = useState(assetId ? 3 : 0);
  const [household, setHousehold] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loadingHh, setLoadingHh] = useState(true);
  const [savingHh, setSavingHh] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');

  useEffect(() => {
      setViewMode(houseId ? 'details' : 'selector');
  }, [houseId, assetId]);

  useEffect(() => {
    if (assetId || location.pathname.includes('/assets')) {
        setActiveTab(3);
    }
  }, [assetId, location.pathname]);

  useEffect(() => {
    api.get(`/households/${householdId}`)
      .then(res => {
        setHousehold(res.data);
        setSelectedEmoji(res.data.avatar || '🏠');
      })
      .catch(err => console.error("Failed to fetch household details", err))
      .finally(() => setLoadingHh(false));

    api.get(`/households/${householdId}/vehicles`)
      .then(res => setVehicles(res.data || []))
      .catch(err => console.error("Failed to fetch vehicles", err));
  }, [api, householdId]);

  const handleUpdateIdentity = async (e) => {
    e.preventDefault();
    setSavingHh(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.avatar = selectedEmoji;
    try {
      await onUpdateHousehold(data);
      showNotification("Household identity updated.", "success");
      setHousehold(prev => ({ ...prev, ...data }));
    } finally {
      setSavingHh(false);
    }
  };

  const houseFields = [
    { name: 'property_type', label: 'Property Type', half: true },
    { name: 'construction_year', label: 'Construction Year', type: 'number', half: true },
    { name: 'tenure', label: 'Tenure', half: true },
    { name: 'council_tax_band', label: 'Council Tax Band', half: true },
    { name: 'purchase_price', label: 'Purchase Price (£)', type: 'number', step: 'any', half: true },
    { name: 'current_valuation', label: 'Property Valuation (£)', type: 'number', step: 'any', half: true },
    { name: 'broadband_provider', label: 'Broadband Provider', half: true },
    { name: 'broadband_account', label: 'Broadband Account #', half: true },
    { name: 'wifi_password', label: 'WiFi Password', half: true },
    { name: 'smart_home_hub', label: 'Smart Home Hub Type', half: true },
    { name: 'notes', label: 'General Property Notes', multiline: true, rows: 3 }
  ];

  if (loadingHh) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  if (viewMode === 'selector') {
    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Household Hub</Typography>
                    <Typography level="body-md" color="neutral">Unified view of your residents, property, and fleet.</Typography>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* 1. HOUSEHOLD IDENTITY CARD */}
                <Grid xs={12} lg={4}>
                    <Card variant="outlined" onClick={() => navigate(String(householdId))} sx={{ p: 3, cursor: 'pointer', height: '100%', transition: 'all 0.2s', '&:hover': { bgcolor: 'background.level1', transform: 'translateY(-4px)', boxShadow: 'md' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar size="lg" sx={{ bgcolor: getEmojiColor(household?.avatar || '🏠', isDark), '--Avatar-size': '64px', fontSize: '2.5rem' }}>{household?.avatar || '🏠'}</Avatar>
                            <Box>
                                <Typography level="title-lg">{household?.name}</Typography>
                                <Typography level="body-xs" color="neutral">Primary Residence</Typography>
                            </Box>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Typography level="body-sm" sx={{ opacity: 0.8 }}>{household?.address_street}<br/>{household?.address_city}, {household?.address_zip}</Typography>
                        <Button variant="plain" size="sm" endDecorator={<HomeWork />} sx={{ mt: 'auto', justifyContent: 'flex-start', p: 0 }}>Manage Property & Assets</Button>
                    </Card>
                </Grid>

                {/* 2. RESIDENTS SECTION */}
                <Grid xs={12} lg={8}>
                    <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1', height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography level="title-lg" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Groups /> Residents</Typography>
                            {isAdmin && (
                                <Dropdown>
                                    <MenuButton 
                                        size="sm" 
                                        variant="soft" 
                                        color="primary" 
                                        startDecorator={<Add />} 
                                        endDecorator={<ArrowDropDown />}
                                    >
                                        Add
                                    </MenuButton>
                                    <Menu placement="bottom-end" size="sm" sx={{ zIndex: 10000 }}>
                                        <MenuItem onClick={() => navigate(`../people/new?type=adult`)}>Add Adult</MenuItem>
                                        <MenuItem onClick={() => navigate(`../people/new?type=child`)}>Add Child</MenuItem>
                                        <Divider />
                                        <MenuItem onClick={() => navigate(`../pets/new`)}>Add Pet</MenuItem>
                                    </Menu>
                                </Dropdown>
                            )}
                        </Box>
                        <Grid container spacing={2}>
                            {members.map(m => (
                                <Grid xs={6} sm={4} md={3} key={m.id}>
                                    <Card variant="outlined" onClick={() => navigate(m.type === 'pet' ? `../pets/${m.id}` : `../people/${m.id}`)} sx={{ p: 1.5, alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'background.surface', borderColor: 'primary.outlinedBorder' } }}>
                                        <Avatar size="md" sx={{ bgcolor: getEmojiColor(m.emoji || '👤', isDark), mb: 1 }}>{m.emoji || (m.type === 'pet' ? '🐾' : '👤')}</Avatar>
                                        <Typography level="title-sm" noWrap>{m.alias || (m.name || '').split(' ')[0]}</Typography>
                                        <Chip size="sm" variant="soft" color={m.type === 'pet' ? 'warning' : 'primary'} sx={{ mt: 0.5, fontSize: '10px', textTransform: 'capitalize' }}>{m.type}</Chip>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Sheet>
                </Grid>

                {/* 3. FLEET SECTION */}
                <Grid xs={12}>
                    <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography level="title-lg" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><DirectionsCar /> Household Fleet</Typography>
                            {isAdmin && <Button size="sm" variant="soft" startDecorator={<Add />} onClick={() => navigate(`../vehicles/new`)}>Add Vehicle</Button>}
                        </Box>
                        <Grid container spacing={2}>
                            {vehicles.map(v => (
                                <Grid xs={12} sm={6} md={4} lg={3} key={v.id}>
                                    <Card variant="outlined" onClick={() => navigate(`../vehicles/${v.id}`)} sx={{ p: 2, flexDirection: 'row', gap: 2, alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', bgcolor: 'background.surface', '&:hover': { transform: 'translateY(-2px)', boxShadow: 'sm' } }}>
                                        <Typography level="h2" sx={{ m: 0 }}>{v.emoji || '🚗'}</Typography>
                                        <Box>
                                            <Typography level="title-sm" sx={{ fontWeight: 'bold' }}>{v.make} {v.model}</Typography>
                                            <Typography level="body-xs" color="neutral">{v.registration}</Typography>
                                        </Box>
                                    </Card>
                                </Grid>
                            ))}
                            {vehicles.length === 0 && <Grid xs={12}><Typography level="body-sm" color="neutral" textAlign="center" sx={{ py: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 'sm' }}>No vehicles registered.</Typography></Grid>}
                        </Grid>
                    </Sheet>
                </Grid>
            </Grid>
        </Box>
    );
  }

  // DETAILS MODE
  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton variant="outlined" color="neutral" onClick={() => navigate('../house')}><ArrowBack /></IconButton>
        <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{household?.name || 'Primary Residence'}</Typography>
            <Typography level="body-md" color="neutral">Manage identity, structure, and recurring financial obligations.</Typography>
        </Box>
      </Box>
      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden', minHeight: 400 }}>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
          <TabList variant="plain" sx={{ p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2, overflow: 'auto', '&::-webkit-scrollbar': { display: 'none' }, whiteSpace: 'nowrap' }}>
            <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}>Identity</Tab>
            <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><HomeWork sx={{ mr: 1 }}/> General Details</Tab>
            <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Bills & Costs</Tab>
            <Tab variant={activeTab === 3 ? 'solid' : 'plain'} color={activeTab === 3 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Inventory sx={{ mr: 1 }}/> Assets</Tab>
          </TabList>
          <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {activeTab === 0 && (
                <Box>
                    <form onSubmit={handleUpdateIdentity}>
                    <Grid container spacing={3}>
                        <Grid xs={12} md={2}>
                            <IconButton onClick={() => setEmojiPickerOpen(true)} disabled={!isAdmin || savingHh} variant="outlined" sx={{ width: 80, height: 80 }}><Typography level="h1">{selectedEmoji}</Typography></IconButton>
                        </Grid>
                        <Grid xs={12} md={10}><FormControl required><FormLabel>Household Name</FormLabel><Input name="name" defaultValue={household?.name} disabled={!isAdmin || savingHh} /></FormControl></Grid>
                        <Grid xs={12} md={4}><FormControl><FormLabel>Street</FormLabel><Input name="address_street" defaultValue={household?.address_street} disabled={!isAdmin || savingHh} /></FormControl></Grid>
                        <Grid xs={12} md={4}><FormControl><FormLabel>City</FormLabel><Input name="address_city" defaultValue={household?.address_city} disabled={!isAdmin || savingHh} /></FormControl></Grid>
                        <Grid xs={12} md={4}><FormControl><FormLabel>Zip / Postcode</FormLabel><Input name="address_zip" defaultValue={household?.address_zip} disabled={!isAdmin || savingHh} /></FormControl></Grid>
                        {isAdmin && <Grid xs={12}><Button type="submit" variant="solid" startDecorator={savingHh ? <CircularProgress size="sm" /> : <Save />} loading={savingHh}>Save Identity Details</Button></Grid>}
                    </Grid>
                    </form>
                    <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(emoji) => { setSelectedEmoji(emoji); setEmojiPickerOpen(false); }} title="Select Household Emoji" />
                </Box>
            )}
            {activeTab === 1 && (
                <GeneralDetailView 
                    title="Structural & General Info" 
                    endpoint="details" 
                    fields={houseFields} 
                    computed={[
                        { 
                            label: 'Value Increase', 
                            calculate: (d) => (d.current_valuation || 0) - (d.purchase_price || 0), 
                            format: 'currency',
                            color: 'success'
                        }
                    ]}
                />
            )}
            {activeTab === 2 && <Box><RecurringChargesWidget api={api} householdId={householdId} household={household_data} entityType="household" entityId={null} segments={[{ id: 'water', label: 'Water' }, { id: 'energy', label: 'Energy' }, { id: 'council', label: 'Council Tax' }, { id: 'waste', label: 'Waste' }, { id: 'utility', label: 'Utilities' }, { id: 'insurance', label: 'Insurance' }, { id: 'subscription', label: 'Subscriptions' }, { id: 'household_bill', label: 'General Bills' }, { id: 'other', label: 'Other' }]} title="Home Recurring Costs" showNotification={showNotification} confirmAction={confirmAction} /></Box>}
            {activeTab === 3 && <AssetsView />}
          </Box>
        </Tabs>
      </Sheet>
    </Box>
  );
}
