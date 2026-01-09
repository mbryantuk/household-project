import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
  Box, Typography, Paper, Tabs, Tab, CircularProgress, Divider, Grid, TextField, Button, Tooltip, IconButton, InputAdornment, Stack
} from '@mui/material';
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
  const { api, id: householdId, onUpdateHousehold, user: currentUser, showNotification, isDark } = useOutletContext();
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
      // Update local state to reflect changes in UI immediately
      setHousehold(prev => ({ ...prev, ...data }));
    } catch (err) {
      // Notification handled by onUpdateHousehold usually, but we catch for safety
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
    { name: 'emergency_contacts', label: 'Emergency Contacts (JSON)', multiline: true, rows: 2 },
    { name: 'notes', label: 'General Property Notes', multiline: true, rows: 3 }
  ];

  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h4" fontWeight="300" gutterBottom>House Registry</Typography>
      
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
            <Tab icon={<Badge />} iconPosition="start" label="Identity" />
            <Tab icon={<HomeWork />} iconPosition="start" label="General" />
            <Tab icon={<ElectricBolt />} iconPosition="start" label="Energy" />
            <Tab icon={<WaterDrop />} iconPosition="start" label="Water" />
            <Tab icon={<DeleteSweep />} iconPosition="start" label="Waste" />
            <Tab icon={<Inventory />} iconPosition="start" label="Assets" />
            <Tab icon={<AccountBalance />} iconPosition="start" label="Council" />
            <Tab icon={<Payments />} iconPosition="start" label="Misc Costs" />
          </Tabs>
        </Box>

        <Box sx={{ p: 4 }}>
          {activeTab === 0 && (
            loadingHh ? <CircularProgress /> : (
              <Box>
                <Typography variant="h5" fontWeight="300" gutterBottom sx={{ mb: 4 }}>Household Identity & Location</Typography>
                <form onSubmit={handleUpdateIdentity}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={2}>
                        <Tooltip title="Pick an emoji">
                            <IconButton 
                                onClick={() => setEmojiPickerOpen(true)} 
                                disabled={!isAdmin || savingHh}
                                sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', width: 80, height: 80 }}
                            >
                                <Typography sx={{ fontSize: '2.5rem' }}>{selectedEmoji}</Typography>
                            </IconButton>
                        </Tooltip>
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <TextField name="name" label="Household Name" defaultValue={household?.name} fullWidth required disabled={!isAdmin || savingHh} />
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <TextField label="Access Key" value={household?.access_key || ''} fullWidth disabled
                        InputProps={{ 
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => { navigator.clipboard.writeText(household.access_key); showNotification("Key copied!", "info"); }}><ContentCopy fontSize="small"/></IconButton>
                                </InputAdornment>
                            ) 
                        }} 
                      />
                    </Grid>
                    <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                    <Grid item xs={12} md={4}><TextField name="address_street" label="Street" defaultValue={household?.address_street} fullWidth disabled={!isAdmin || savingHh} /></Grid>
                    <Grid item xs={12} md={4}><TextField name="address_city" label="City" defaultValue={household?.address_city} fullWidth disabled={!isAdmin || savingHh} /></Grid>
                    <Grid item xs={12} md={4}><TextField name="address_zip" label="Zip / Postcode" defaultValue={household?.address_zip} fullWidth disabled={!isAdmin || savingHh} /></Grid>
                    
                    {isAdmin && (
                      <Grid item xs={12}>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            startIcon={savingHh ? <CircularProgress size={20} color="inherit" /> : <Save />}
                            disabled={savingHh}
                        >
                          {savingHh ? 'Saving...' : 'Save Identity Details'}
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
      </Paper>
    </Box>
  );
}