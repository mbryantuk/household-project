import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, CircularProgress, Divider, Grid, Input, Button, Tooltip, IconButton, FormControl, FormLabel, Stack
} from '@mui/joy';
import { 
  HomeWork, ElectricBolt, WaterDrop, DeleteSweep, 
  Inventory, AccountBalance, Payments, Info, Badge,
  Save, ContentCopy
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';

// Feature Components
import EnergyView from './EnergyView';
import WaterView from './WaterView';
import CouncilView from './CouncilView';
import WasteView from './WasteView';
import AssetsView from './AssetsView';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import GeneralDetailView from './GeneralDetailView';

export default function HouseView() {
  const { api, id: householdId, onUpdateHousehold, user: currentUser, showNotification } = useOutletContext();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const [activeTab, setActiveTab] = useState(0);
  const [household, setHousehold] = useState(null);
  const [loadingHh, setLoadingHh] = useState(true);
  const [savingHh, setSavingHh] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');

  useEffect(() => {
    api.get(`/households/${householdId}`)
      .then(res => {
        setHousehold(res.data);
        setSelectedEmoji(res.data.avatar || '🏠');
      })
      .catch(err => console.error("Failed to fetch household details", err))
      .finally(() => setLoadingHh(false));
  }, [api, householdId]);

  const handleUpdateIdentity = async (e) => {
    e.preventDefault();
    setSavingHh(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.avatar = selectedEmoji;

    try {
      await onUpdateHousehold(data);
      showNotification("Household identity updated.", "success");
      setHousehold(prev => ({ ...prev, ...data }));
    } catch (err) {
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
    { name: 'broadband_provider', label: 'Broadband Provider', half: true },
    { name: 'broadband_account', label: 'Broadband Account #', half: true },
    { name: 'wifi_password', label: 'WiFi Password', half: true },
    { name: 'smart_home_hub', label: 'Smart Home Hub Type', half: true },
    { name: 'color', label: 'Theme Color (Hex)', half: true },
    { name: 'emergency_contacts', label: 'Emergency Contacts (JSON)', multiline: true, rows: 2 },
    { name: 'notes', label: 'General Property Notes', multiline: true, rows: 3 }
  ];

  return (
    <Box sx={{ height: '100%' }}>
      <Typography level="h2" mb={2} fontWeight="300">House Registry</Typography>
      
      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
        <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)} 
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
            <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><HomeWork sx={{ mr: 1 }}/> General</Tab>
            <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><ElectricBolt sx={{ mr: 1 }}/> Energy</Tab>
            <Tab variant={activeTab === 3 ? 'solid' : 'plain'} color={activeTab === 3 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><WaterDrop sx={{ mr: 1 }}/> Water</Tab>
            <Tab variant={activeTab === 4 ? 'solid' : 'plain'} color={activeTab === 4 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><DeleteSweep sx={{ mr: 1 }}/> Waste</Tab>
            <Tab variant={activeTab === 5 ? 'solid' : 'plain'} color={activeTab === 5 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><Inventory sx={{ mr: 1 }}/> Assets</Tab>
            <Tab variant={activeTab === 6 ? 'solid' : 'plain'} color={activeTab === 6 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><AccountBalance sx={{ mr: 1 }}/> Council</Tab>
            <Tab variant={activeTab === 7 ? 'solid' : 'plain'} color={activeTab === 7 ? 'primary' : 'neutral'} sx={{ flex: 'none', scrollSnapAlign: 'start' }}><Payments sx={{ mr: 1 }}/> Misc Costs</Tab>
          </TabList>

          <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {activeTab === 0 && (
                loadingHh ? <CircularProgress /> : (
                <Box>
                    <Typography level="h4" mb={4} fontWeight="300">Household Identity & Location</Typography>
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
                        <Grid xs={12} md={5}>
                            <FormControl required>
                                <FormLabel>Household Name</FormLabel>
                                <Input name="name" defaultValue={household?.name} disabled={!isAdmin || savingHh} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={5}>
                            <FormControl>
                                <FormLabel>Access Key</FormLabel>
                                <Input 
                                    value={household?.access_key || ''} 
                                    disabled 
                                    endDecorator={
                                        <IconButton onClick={() => { navigator.clipboard.writeText(household.access_key); showNotification("Key copied!", "info"); }}>
                                            <ContentCopy />
                                        </IconButton>
                                    }
                                />
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
                )
            )}

            {activeTab === 1 && (
                <GeneralDetailView 
                    title="Structural & General Info" 
                    icon={<Info />} 
                    endpoint="details" 
                    fields={houseFields} 
                />
            )}
            
            {activeTab === 2 && <EnergyView />}
            {activeTab === 3 && <WaterView />}
            {activeTab === 4 && <WasteView />}
            {activeTab === 5 && <AssetsView />}
            {activeTab === 6 && <CouncilView />}
            
            {activeTab === 7 && (
                <RecurringCostsWidget 
                    api={api} 
                    householdId={householdId} 
                    parentType="house" 
                    parentId={1} 
                    isAdmin={isAdmin}
                    showNotification={showNotification}
                />
            )}
          </Box>
        </Tabs>
      </Sheet>
    </Box>
  );
}