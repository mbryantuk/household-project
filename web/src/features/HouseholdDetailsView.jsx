import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, FormControl, FormLabel, Input, Switch, Button, CircularProgress, Divider, Stack, Grid 
} from '@mui/joy';
import { 
  Wifi, LocalAtm, Language, Save
} from '@mui/icons-material';
import GenericObjectView from '../components/objects/GenericObjectView';
import AppSelect from '../components/ui/AppSelect';

export default function HouseholdDetailsView() {
  const { api, id: householdId, household, onUpdateHousehold, user: currentUser, showNotification, confirmAction } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  // Fetch both Global (Household) and Tenant (HouseDetails) data and merge them
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/details`);
      const houseDetails = res.data || {};
      
      // Merge: priority to houseDetails, fallback to household context
      // Note: household context might be stale if we just updated, but for initial load it's fine.
      // Better to rely on what the API returns for details, but we need the 'household' object properties (name, avatar etc)
      // which are on the `households` table, not `house_details`.
      // The context `household` object has the global props.
      
      const mergedData = {
        // Global Props (from Context/Household Table)
        name: household?.name || '',
        avatar: household?.avatar || '🏠',
        currency: household?.currency || '£',
        date_format: household?.date_format || 'dd/MM/yyyy',
        address_street: household?.address_street || '',
        address_city: household?.address_city || '',
        address_zip: household?.address_zip || '',
        decimals: household?.decimals ?? 2,
        auto_backup: household?.auto_backup ?? 1,
        backup_retention: household?.backup_retention ?? 7,
        
        // Tenant Props (from HouseDetails Table)
        ...houseDetails
      };
      
      setInitialData(mergedData);
    } catch (err) {
      console.error("Failed to fetch household details", err);
      showNotification("Failed to load household details.", "danger");
    } finally {
      setLoading(false);
    }
  }, [api, householdId, household, showNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Custom Submit Handler to split data back into two API calls
  const handleSave = async (data) => {
      try {
          // 1. Global Update
          const globalPayload = {
            name: data.name,
            avatar: data.avatar,
            currency: data.currency,
            date_format: data.date_format,
            address_street: data.address_street,
            address_city: data.address_city,
            address_zip: data.address_zip,
            decimals: parseInt(data.decimals),
            auto_backup: data.auto_backup ? 1 : 0,
            backup_retention: parseInt(data.backup_retention)
          };
          
          // 2. Tenant Update
          const tenantPayload = {
            property_type: data.property_type,
            construction_year: data.construction_year,
            tenure: data.tenure,
            council_tax_band: data.council_tax_band,
            purchase_price: parseFloat(data.purchase_price),
            current_valuation: parseFloat(data.current_valuation),
            broadband_provider: data.broadband_provider,
            broadband_account: data.broadband_account,
            wifi_password: data.wifi_password,
            smart_home_hub: data.smart_home_hub,
            emergency_contacts: data.emergency_contacts,
            notes: data.notes
          };

          // Execute parallel
          await Promise.all([
              onUpdateHousehold(globalPayload),
              api.put(`/households/${householdId}/details`, tenantPayload)
          ]);
          
          showNotification("Household properties updated.", "success");
          
          // Refresh data to ensure sync
          await fetchData();
      } catch (err) {
          console.error("Save error", err);
          showNotification("Failed to save changes.", "danger");
          throw err; // Re-throw to let GenericView know if needed (though current implementation handles error inside)
      }
  };

  const FIELDS = [
    { name: 'avatar', type: 'emoji' },
    { name: 'name', label: 'Household Name', required: true, gridSpan: { md: 10 } },
    
    { name: 'address_street', label: 'Street Address', gridSpan: { md: 6 } },
    { name: 'address_city', label: 'City', gridSpan: { md: 3 } },
    { name: 'address_zip', label: 'Zip / Postcode', gridSpan: { md: 3 } },

    { name: 'property_type', label: 'Property Type', placeholder: 'e.g. Detached House', gridSpan: { md: 6 } },
    { name: 'construction_year', label: 'Construction Year', type: 'number', gridSpan: { md: 3 } },
    { name: 'tenure', label: 'Tenure', type: 'select', options: [{ value: 'Freehold', label: 'Freehold' }, { value: 'Leasehold', label: 'Leasehold' }], gridSpan: { md: 3 } },

    { type: 'header', label: 'Financial Valuation' },
    { name: 'purchase_price', label: `Purchase Price`, type: 'number', gridSpan: { md: 4 } },
    { name: 'current_valuation', label: `Current Valuation`, type: 'number', gridSpan: { md: 4 } },
    { name: 'council_tax_band', label: 'Council Tax Band', gridSpan: { md: 4 } },
  ];

  const EXTRA_TABS = [
      {
          id: 'tech',
          label: 'Tech & Utilities',
          icon: Wifi,
          content: (data, handleChange, handleSubmit) => (
              <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                      <Typography level="title-lg" sx={{ color: 'primary.500' }}>Technical Infrastructure</Typography>
                      <Grid container spacing={2}>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Broadband Provider</FormLabel>
                                <Input value={data.broadband_provider || ''} onChange={e => handleChange('broadband_provider', e.target.value)} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Broadband Account #</FormLabel>
                                <Input value={data.broadband_account || ''} onChange={e => handleChange('broadband_account', e.target.value)} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>WiFi Password</FormLabel>
                                <Input type="password" value={data.wifi_password || ''} onChange={e => handleChange('wifi_password', e.target.value)} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Smart Home Hub</FormLabel>
                                <Input value={data.smart_home_hub || ''} onChange={e => handleChange('smart_home_hub', e.target.value)} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Emergency Contacts</FormLabel>
                                <Input value={data.emergency_contacts || ''} onChange={e => handleChange('emergency_contacts', e.target.value)} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Property Notes</FormLabel>
                                <Input value={data.notes || ''} onChange={e => handleChange('notes', e.target.value)} />
                            </FormControl>
                        </Grid>
                      </Grid>
                      <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button type="submit" variant="solid" size="lg" startDecorator={<Save />}>Save Changes</Button>
                      </Box>
                  </Stack>
              </form>
          )
      },
      {
          id: 'settings',
          label: 'Settings',
          icon: LocalAtm, // Using LocalAtm as generic settings/context icon
          content: (data, handleChange, handleSubmit) => (
              <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                      <Typography level="title-lg" sx={{ color: 'primary.500' }}>Regional & Context</Typography>
                      <Grid container spacing={2}>
                        <Grid xs={12} md={4}>
                            <AppSelect 
                                label="Currency Symbol"
                                value={data.currency}
                                onChange={v => handleChange('currency', v)}
                                options={[
                                    { value: '£', label: '£ (GBP) - Pound Sterling' },
                                    { value: '$', label: '$ (USD) - US Dollar' },
                                    { value: '€', label: '€ (EUR) - Euro' },
                                    { value: '¥', label: '¥ (JPY) - Japanese Yen' }
                                ]}
                            />
                        </Grid>
                        <Grid xs={12} md={4}>
                            <AppSelect 
                                label="Date Format"
                                value={data.date_format}
                                onChange={v => handleChange('date_format', v)}
                                options={[
                                    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (UK/EU)' },
                                    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)' },
                                    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' }
                                ]}
                            />
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Decimal Places</FormLabel>
                                <Input type="number" value={data.decimals} onChange={e => handleChange('decimals', e.target.value)} />
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
                                    checked={Boolean(data.auto_backup)}
                                    onChange={e => handleChange('auto_backup', e.target.checked)}
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Retention (Days)</FormLabel>
                                <Input type="number" value={data.backup_retention} onChange={e => handleChange('backup_retention', e.target.value)} />
                            </FormControl>
                        </Grid>
                      </Grid>
                      <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button type="submit" variant="solid" size="lg" startDecorator={<Save />}>Save Settings</Button>
                      </Box>
                  </Stack>
              </form>
          )
      }
  ];

  const COST_SEGMENTS = [
      { id: 'utility', label: 'General' },
      { id: 'energy', label: 'Energy' },
      { id: 'water', label: 'Water' },
      { id: 'council', label: 'Council Tax' },
      { id: 'insurance', label: 'Insurance' },
      { id: 'subscription', label: 'Subscriptions' },
      { id: 'service', label: 'Maintenance' },
      { id: 'other', label: 'Other' }
  ];

  if (loading || !initialData) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <GenericObjectView
        key={householdId}
        type="household"
        id={householdId}
        householdId={householdId}
        api={api}
        endpoint={`/households/${householdId}/details`} // Dummy endpoint as we override submit
        initialData={initialData}
        fields={FIELDS}
        costSegments={COST_SEGMENTS}
        extraTabs={EXTRA_TABS}
        scope={{ isAdmin, showNotification, confirmAction }}
        title="Household Properties"
        subtitle="Manage your home's technical, financial, and regional details."
        // We need to implement custom submit in GenericObjectView first, but for now we can intercept via onSave? 
        // No, GenericObjectView calls API directly. 
        // I need to add `customSubmit` prop to GenericObjectView.
        customSubmit={handleSave} 
    />
  );
}