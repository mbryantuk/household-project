import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, CircularProgress, Divider, Grid, Input, Button, Tooltip, IconButton, FormControl, FormLabel, Badge
} from '@mui/joy';
import { 
  HomeWork, Payments, Save, ArrowBack, Info
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import EntityGrid from '../components/ui/EntityGrid';

// Feature Components
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import GeneralDetailView from './GeneralDetailView';

export default function HouseView() {
  const { api, id: householdId, onUpdateHousehold, user: currentUser, showNotification } = useOutletContext();
  const isAdmin = currentUser?.role === 'admin';
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('details'); // Default to details
  const [activeTab, setActiveTab] = useState(0);
  const [household, setHousehold] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loadingHh, setLoadingHh] = useState(true);
  const [savingHh, setSavingHh] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');

  useEffect(() => {
    // Fetch Household
    api.get(`/households/${householdId}`)
      .then(res => {
        setHousehold(res.data);
        setSelectedEmoji(res.data.avatar || '🏠');
      })
      .catch(err => console.error("Failed to fetch household details", err))
      .finally(() => setLoadingHh(false));

    // Fetch Vehicles for the Selector
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
    } catch {
      // Notification handled by onUpdateHousehold
    } finally {
      setSavingHh(false);
    }
  };

  const houseFields = [
    { name: 'property_type', label: 'Property Type (e.g. Detached, Flat)', half: true },
    { name: 'construction_year', label: 'Construction Year', type: 'number', half: true },
    { name: 'tenure', label: 'Tenure (e.g. Freehold, Leasehold)', half: true },
    { name: 'council_tax_band', label: 'Council Tax Band', half: true },
    { name: 'purchase_price', label: 'Purchase Price (£)', type: 'number', step: 'any', half: true },
    { name: 'current_valuation', label: 'Property Valuation (£)', type: 'number', step: 'any', half: true },
    { name: 'broadband_provider', label: 'Broadband Provider', half: true },
    { name: 'broadband_account', label: 'Broadband Account #', half: true },
    { name: 'wifi_password', label: 'WiFi Password', half: true },
    { name: 'smart_home_hub', label: 'Smart Home Hub Type', half: true },
    { name: 'color', label: 'Theme Color (Hex)', half: true },
    { name: 'emergency_contacts', label: 'Emergency Contacts (JSON)', multiline: true, rows: 2 },
    { name: 'notes', label: 'General Property Notes', multiline: true, rows: 3 }
  ];

  if (loadingHh) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  // SELECTOR MODE (Dashboard)
  if (viewMode === 'selector') {
    const sections = [
        {
            title: 'Property',
            items: [household],
            onAdd: null,
            addLabel: ''
        },
        {
            title: 'Fleet & Vehicles',
            items: vehicles,
            onAdd: isAdmin ? () => navigate('/vehicles/new') : null,
            addLabel: 'Add Vehicle'
        }
    ];

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                    Property & Assets
                </Typography>
                <Typography level="body-md" color="neutral">
                    Select your home or a vehicle to manage.
                </Typography>
            </Box>

            <EntityGrid 
                sections={sections}
                onSelect={(item) => {
                    if (item.id === household.id && !item.make) {
                        setViewMode('details');
                    } else {
                        navigate(`/vehicles/${item.id}`);
                    }
                }}
                renderItem={(item) => {
                    // Distinguish between House and Vehicle based on properties (e.g. 'make')
                    const isVehicle = !!item.make;
                    return (
                        <>
                            <Box sx={{ fontSize: '3rem' }}>{item.avatar || item.emoji || (isVehicle ? '🚗' : '🏠')}</Box>
                            <Typography level="title-md" sx={{ fontWeight: 'lg', textAlign: 'center' }}>
                                {isVehicle ? `${item.make} ${item.model}` : item.name}
                            </Typography>
                            <Typography level="body-xs" color="neutral" sx={{ textTransform: 'uppercase' }}>
                                {isVehicle ? item.registration : 'Primary Residence'}
                            </Typography>
                        </>
                    );
                }}
            />
        </Box>
    );
  }

  // DETAIL MODE (Existing Tabs)
  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton 
            variant="outlined" 
            color="neutral" 
            onClick={() => setViewMode('selector')}
            sx={{ display: { xs: 'flex', md: 'none' } }}
        >
            <ArrowBack />
        </IconButton>
        <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                Asset: {household?.name || 'Primary Residence'}
            </Typography>
            <Typography level="body-md" color="neutral">
                Manage identity, structure, and recurring financial obligations.
            </Typography>
        </Box>
      </Box>
      
      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden', minHeight: 400 }}>
        <Tabs 
            value={activeTab} 
            onChange={(_e, v) => setActiveTab(v)} 
            sx={{ bgcolor: 'transparent' }}
        >
          <TabList 
            variant="plain" 
            sx={{ 
                p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2, 
                overflow: 'auto',
                scrollSnapType: 'x mandatory',
                '&::-webkit-scrollbar': { display: 'none' },
                whiteSpace: 'nowrap'
            }}
          >
            <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><Badge sx={{ mr: 1 }}/> Identity</Tab>
            <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><HomeWork sx={{ mr: 1 }}/> General Details</Tab>
            <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><Payments sx={{ mr: 1 }}/> Charges Repository</Tab>
          </TabList>

          <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {activeTab === 0 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h3">Household Identity</Typography>
                        <Typography level="body-md" color="neutral">Configure your home's core details and location.</Typography>
                    </Box>
                    <form onSubmit={handleUpdateIdentity}>
                    <Grid container spacing={3}>
                        <Grid xs={12} md={2}>
                            <Tooltip title="Pick an emoji" variant="soft">
                                <IconButton 
                                    onClick={() => setEmojiPickerOpen(true)} 
                                    disabled={!isAdmin || savingHh}
                                    variant="outlined"
                                    sx={{ width: 80, height: 80 }}
                                >
                                    <Typography level="h1">{selectedEmoji}</Typography>
                                </IconButton>
                            </Tooltip>
                        </Grid>
                        <Grid xs={12} md={10}>
                            <FormControl required>
                                <FormLabel>Household Name</FormLabel>
                                <Input name="name" defaultValue={household?.name} disabled={!isAdmin || savingHh} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12}><Divider /></Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Street</FormLabel>
                                <Input name="address_street" defaultValue={household?.address_street} disabled={!isAdmin || savingHh} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>City</FormLabel>
                                <Input name="address_city" defaultValue={household?.address_city} disabled={!isAdmin || savingHh} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Zip / Postcode</FormLabel>
                                <Input name="address_zip" defaultValue={household?.address_zip} disabled={!isAdmin || savingHh} />
                            </FormControl>
                        </Grid>
                        
                        {isAdmin && (
                        <Grid xs={12}>
                            <Button 
                                type="submit" 
                                variant="solid" 
                                startDecorator={savingHh ? <CircularProgress size="sm" /> : <Save />}
                                loading={savingHh}
                            >
                            Save Identity Details
                            </Button>
                        </Grid>
                        )}
                    </Grid>
                    </form>

                    <EmojiPicker 
                        open={emojiPickerOpen} 
                        onClose={() => setEmojiPickerOpen(false)} 
                        onEmojiSelect={(emoji) => {
                            setSelectedEmoji(emoji);
                            setEmojiPickerOpen(false);
                        }}
                        title="Select Household Emoji"
                    />
                </Box>
            )}

            {activeTab === 1 && (
                <GeneralDetailView 
                    title="Structural & General Info" 
                    endpoint="details" 
                    fields={houseFields} 
                />
            )}
            
            {activeTab === 2 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h3">Recurring Charges</Typography>
                        <Typography level="body-md" color="neutral">Central repository for bills, utilities, and subscriptions tied to this residence.</Typography>
                    </Box>
                    <RecurringCostsWidget 
                        api={api} 
                        householdId={householdId} 
                        parentType="house" 
                        parentId={1} 
                        isAdmin={isAdmin}
                        showNotification={showNotification}
                    />
                </Box>
            )}
          </Box>
        </Tabs>
      </Sheet>
    </Box>
  );
}
