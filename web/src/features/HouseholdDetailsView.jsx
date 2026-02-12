import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Grid, CircularProgress, Divider, Stack, Switch
} from '@mui/joy';
import { 
  Home, Payments, Info, Wifi, LocalAtm, Language
} from '@mui/icons-material';
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';
import EmojiPicker from '../components/EmojiPicker';
import AppSelect from '../components/ui/AppSelect';

export default function HouseholdDetailsView() {
  const { api, id: householdId, household, onUpdateHousehold, user: currentUser, showNotification, confirmAction } = useOutletContext();

  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Split state between global household settings and tenant-specific house details
  const [globalData, setGlobalData] = useState({
    name: '', avatar: '🏠', currency: '£', date_format: 'dd/MM/yyyy',
    address_street: '', address_city: '', address_zip: '',
    decimals: 2, auto_backup: 1, backup_retention: 7
  });

  const [houseDetails, setHouseDetails] = useState({
    property_type: '', construction_year: '', tenure: 'Freehold',
    council_tax_band: '', purchase_price: 0, current_valuation: 0,
    broadband_provider: '', broadband_account: '', wifi_password: '',
    smart_home_hub: '', emergency_contacts: '', notes: ''
  });

  const isAdmin = currentUser?.role === 'admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/details`);
      if (res.data) setHouseDetails(res.data);
      
      // Initialize global data from context (it's always available in context)
      setGlobalData({
        name: household?.name || '',
        avatar: household?.avatar || '🏠',
        currency: household?.currency || '£',
        date_format: household?.date_format || 'dd/MM/yyyy',
        address_street: household?.address_street || '',
        address_city: household?.address_city || '',
        address_zip: household?.address_zip || '',
        decimals: household?.decimals ?? 2,
        auto_backup: household?.auto_backup ?? 1,
        backup_retention: household?.backup_retention ?? 7
      });
    } catch (err) {
      console.error("Failed to fetch household details", err);
      showNotification("Failed to load household details.", "danger");
    } finally {
      setLoading(false);
    }
  }, [api, householdId, household, showNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Update Global Household (Name, Avatar, Regional, Address)
      await onUpdateHousehold({
        name: globalData.name,
        avatar: globalData.avatar,
        currency: globalData.currency,
        date_format: globalData.date_format,
        address_street: globalData.address_street,
        address_city: globalData.address_city,
        address_zip: globalData.address_zip,
        decimals: globalData.decimals,
        auto_backup: globalData.auto_backup,
        backup_retention: globalData.backup_retention
      });

      // 2. Update Tenant House Details
      await api.put(`/households/${householdId}/details`, houseDetails);
      
      showNotification("Household properties updated.", "success");
      fetchData();
    } catch (err) {
      console.error("Save error", err);
      showNotification("Failed to save changes.", "danger");
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
                {globalData.name || 'Household Properties'}
            </Typography>
            <Typography level="body-md" color="neutral">
                Manage your home's technical, financial, and regional details.
            </Typography>
        </Box>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '600px', overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
            <TabList 
                variant="plain" 
                sx={{ 
                    p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2, 
                    overflow: 'auto',
                    '&::-webkit-scrollbar': { display: 'none' },
                    whiteSpace: 'nowrap'
                }}
            >
                <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Info sx={{ mr: 1 }}/> Property Identity</Tab>
                <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Wifi sx={{ mr: 1 }}/> Technical & Utilities</Tab>
                <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Recurring Costs</Tab>
                <Tab variant={activeTab === 3 ? 'solid' : 'plain'} color={activeTab === 3 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Language sx={{ mr: 1 }}/> Regional & Context</Tab>
            </TabList>
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <form onSubmit={handleSubmit}>
            {activeTab === 0 && (
                <Stack spacing={3}>
                    <Box sx={{ mb: 2 }}>
                        <Typography level="h2" sx={{ fontSize: '1.5rem', mb: 0.5 }}>Property Identity</Typography>
                        <Typography level="body-sm" color="neutral">Core identification and address details.</Typography>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid xs={12} md={2}>
                            <IconButton 
                                onClick={() => setEmojiPickerOpen(true)} 
                                variant="outlined"
                                sx={{ width: 80, height: 80, borderRadius: 'xl' }}
                                disabled={!isAdmin}
                            >
                                <Typography level="h1">{globalData.avatar}</Typography>
                            </IconButton>
                        </Grid>
                        <Grid xs={12} md={10}>
                            <FormControl required>
                                <FormLabel>Household Name</FormLabel>
                                <Input 
                                    value={globalData.name} 
                                    onChange={e => setGlobalData({...globalData, name: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>

                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Street Address</FormLabel>
                                <Input 
                                    value={globalData.address_street} 
                                    onChange={e => setGlobalData({...globalData, address_street: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={3}>
                            <FormControl>
                                <FormLabel>City</FormLabel>
                                <Input 
                                    value={globalData.address_city} 
                                    onChange={e => setGlobalData({...globalData, address_city: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={3}>
                            <FormControl>
                                <FormLabel>Zip / Postcode</FormLabel>
                                <Input 
                                    value={globalData.address_zip} 
                                    onChange={e => setGlobalData({...globalData, address_zip: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Property Type</FormLabel>
                                <Input 
                                    value={houseDetails.property_type || ''} 
                                    onChange={e => setHouseDetails({...houseDetails, property_type: e.target.value})}
                                    placeholder="e.g. Detached House"
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={3}>
                            <FormControl>
                                <FormLabel>Construction Year</FormLabel>
                                <Input 
                                    type="number"
                                    value={houseDetails.construction_year || ''} 
                                    onChange={e => setHouseDetails({...houseDetails, construction_year: e.target.value})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={3}>
                            <AppSelect 
                                label="Tenure"
                                value={houseDetails.tenure || 'Freehold'}
                                onChange={v => setHouseDetails({...houseDetails, tenure: v})}
                                options={[{ value: 'Freehold', label: 'Freehold' }, { value: 'Leasehold', label: 'Leasehold' }]}
                                disabled={!isAdmin}
                            />
                        </Grid>

                        <Grid xs={12}><Divider>Financial Valuation</Divider></Grid>
                        
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Purchase Price ({globalData.currency})</FormLabel>
                                <Input 
                                    type="number"
                                    value={houseDetails.purchase_price || 0}
                                    onChange={e => setHouseDetails({...houseDetails, purchase_price: parseFloat(e.target.value) || 0})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Current Valuation ({globalData.currency})</FormLabel>
                                <Input 
                                    type="number"
                                    value={houseDetails.current_valuation || 0}
                                    onChange={e => setHouseDetails({...houseDetails, current_valuation: parseFloat(e.target.value) || 0})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Council Tax Band</FormLabel>
                                <Input 
                                    value={houseDetails.council_tax_band || ''}
                                    onChange={e => setHouseDetails({...houseDetails, council_tax_band: e.target.value})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                    </Grid>
                    {isAdmin && <Button type="submit" variant="solid" sx={{ alignSelf: 'flex-start' }}>Save Identity</Button>}
                </Stack>
            )}

            {activeTab === 1 && (
                <Stack spacing={3}>
                    <Box sx={{ mb: 2 }}>
                        <Typography level="h2" sx={{ fontSize: '1.5rem', mb: 0.5 }}>Technical & Utilities</Typography>
                        <Typography level="body-sm" color="neutral">Broadband, Smart Home, and Emergency data.</Typography>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Broadband Provider</FormLabel>
                                <Input 
                                    value={houseDetails.broadband_provider || ''} 
                                    onChange={e => setHouseDetails({...houseDetails, broadband_provider: e.target.value})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Broadband Account #</FormLabel>
                                <Input 
                                    value={houseDetails.broadband_account || ''} 
                                    onChange={e => setHouseDetails({...houseDetails, broadband_account: e.target.value})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>WiFi Password</FormLabel>
                                <Input 
                                    type="password"
                                    value={houseDetails.wifi_password || ''} 
                                    onChange={e => setHouseDetails({...houseDetails, wifi_password: e.target.value})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Smart Home Hub</FormLabel>
                                <Input 
                                    value={houseDetails.smart_home_hub || ''} 
                                    onChange={e => setHouseDetails({...houseDetails, smart_home_hub: e.target.value})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Emergency Contacts</FormLabel>
                                <Input 
                                    value={houseDetails.emergency_contacts || ''} 
                                    onChange={e => setHouseDetails({...houseDetails, emergency_contacts: e.target.value})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Property Notes</FormLabel>
                                <Input 
                                    value={houseDetails.notes || ''} 
                                    onChange={e => setHouseDetails({...houseDetails, notes: e.target.value})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                    </Grid>
                    {isAdmin && <Button type="submit" variant="solid" sx={{ alignSelf: 'flex-start' }}>Save Technical Details</Button>}
                </Stack>
            )}

            {activeTab === 3 && (
                <Stack spacing={3}>
                    <Box sx={{ mb: 2 }}>
                        <Typography level="h2" sx={{ fontSize: '1.5rem', mb: 0.5 }}>Regional & Context</Typography>
                        <Typography level="body-sm" color="neutral">Localization and data management preferences.</Typography>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid xs={12} md={4}>
                            <AppSelect 
                                label="Currency Symbol"
                                value={globalData.currency}
                                onChange={v => setGlobalData({...globalData, currency: v})}
                                options={[
                                    { value: '£', label: '£ (GBP) - Pound Sterling' },
                                    { value: '$', label: '$ (USD) - US Dollar' },
                                    { value: '€', label: '€ (EUR) - Euro' },
                                    { value: '¥', label: '¥ (JPY) - Japanese Yen' }
                                ]}
                                disabled={!isAdmin}
                            />
                        </Grid>
                        <Grid xs={12} md={4}>
                            <AppSelect 
                                label="Date Format"
                                value={globalData.date_format}
                                onChange={v => setGlobalData({...globalData, date_format: v})}
                                options={[
                                    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (UK/EU)' },
                                    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)' },
                                    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' }
                                ]}
                                disabled={!isAdmin}
                            />
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Decimal Places</FormLabel>
                                <Input 
                                    type="number"
                                    value={globalData.decimals}
                                    onChange={e => setGlobalData({...globalData, decimals: parseInt(e.target.value) || 0})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}><Divider>Automated Backups</Divider></Grid>
                        <Grid xs={12} md={6}>
                            <FormControl orientation="horizontal" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <FormLabel>Enable Auto-Backups</FormLabel>
                                    <Typography level="body-xs">Nightly snapshots of the household database.</Typography>
                                </Box>
                                <Switch 
                                    checked={globalData.auto_backup === 1}
                                    onChange={e => setGlobalData({...globalData, auto_backup: e.target.checked ? 1 : 0})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Retention (Days)</FormLabel>
                                <Input 
                                    type="number"
                                    value={globalData.backup_retention}
                                    onChange={e => setGlobalData({...globalData, backup_retention: parseInt(e.target.value) || 0})}
                                    disabled={!isAdmin}
                                />
                            </FormControl>
                        </Grid>
                    </Grid>
                    <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'md', border: '1px dashed', borderColor: 'divider' }}>
                        <Typography level="title-sm" startDecorator={<LocalAtm />}>Regional Context</Typography>
                        <Typography level="body-xs" color="neutral">These settings affect how all members view financial data and dates within this specific household.</Typography>
                    </Box>
                    {isAdmin && <Button type="submit" variant="solid" sx={{ alignSelf: 'flex-start' }}>Save Settings</Button>}
                </Stack>
            )}
          </form>

          {activeTab === 2 && (
            <Box>
              <RecurringChargesWidget 
                api={api} 
                householdId={householdId} 
                household={household}
                entityType="household" 
                entityId={null} 
                segments={[
                    { id: 'utility', label: 'General' },
                    { id: 'energy', label: 'Energy' },
                    { id: 'water', label: 'Water' },
                    { id: 'council', label: 'Council Tax' },
                    { id: 'insurance', label: 'Insurance' },
                    { id: 'subscription', label: 'Subscriptions' },
                    { id: 'service', label: 'Maintenance' },
                    { id: 'other', label: 'Other' }
                ]}
                title="Household Recurring Costs"
                showNotification={showNotification}
                confirmAction={confirmAction}
              />
            </Box>
          )}
        </Box>
      </Sheet>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
            setGlobalData(prev => ({ ...prev, avatar: emoji }));
            setEmojiPickerOpen(false);
        }}
        title="Select Household Emoji"
      />
    </Box>
  );
}
