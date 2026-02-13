import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, FormControl, FormLabel, Input, Switch, Button, CircularProgress, Divider, Stack, Grid, Sheet 
} from '@mui/joy';
import { 
  Wifi, LocalAtm, Language, Save, ViewModule, CloudDownload, DataObject
} from '@mui/icons-material';
import GenericObjectView from '../components/objects/GenericObjectView';
import AppSelect from '../components/ui/AppSelect';

export default function HouseholdDetailsView() {
  const { api, id: householdId, household, onUpdateHousehold, user: currentUser, showNotification, confirmAction } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  // Feature Modules State (Local)
  const [enabledModules, setEnabledModules] = useState(() => {
      try {
          return household?.enabled_modules ? JSON.parse(household.enabled_modules) : ['pets', 'vehicles', 'meals'];
      } catch { return ['pets', 'vehicles', 'meals']; }
  });

  const toggleModule = async (module) => {
    if (!isAdmin) return;
    const newModules = enabledModules.includes(module) 
        ? enabledModules.filter(m => m !== module)
        : [...enabledModules, module];
    
    setEnabledModules(newModules);
    try {
        await onUpdateHousehold({ enabled_modules: JSON.stringify(newModules) });
        showNotification(`${module} module ${newModules.includes(module) ? 'enabled' : 'disabled'}.`, "success");
     } catch {
        setEnabledModules(enabledModules); // Revert
        showNotification("Failed to update modules.", "danger");
    }
  };

  const onExportTenant = async () => {
    try {
        showNotification(`Preparing export for "${household.name}"...`, "neutral");
        const res = await api.get(`/admin/households/${household.id}/export`);
        const filename = res.data.filename;
        
        const downloadRes = await api.get(`/admin/backups/download/${filename}`, {
            responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(downloadRes.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        showNotification(`Export complete.`, "success");
    } catch (err) {
        showNotification(err.response?.data?.error || "Failed to export tenant.", "danger");
    }
  };

  const onExportJSONTenant = async () => {
    try {
        showNotification(`Generating JSON export...`, "neutral");
        const res = await api.get(`/export/${household.id}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `hearth-export-hh${household.id}-${timestamp}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showNotification(`JSON export complete.`, "success");
    } catch {
        showNotification("Failed to export JSON.", "danger");
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/details`);
      const houseDetails = res.data || {};
      
      const mergedData = {
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

  const handleSave = async (data) => {
      try {
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

          await Promise.all([
              onUpdateHousehold(globalPayload),
              api.put(`/households/${householdId}/details`, tenantPayload)
          ]);
          
          showNotification("Household properties updated.", "success");
          await fetchData();
      } catch (err) {
          console.error("Save error", err);
          showNotification("Failed to save changes.", "danger");
          throw err;
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
          label: 'Context',
          icon: LocalAtm, 
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
      },
      {
          id: 'modules',
          label: 'Modules & Data',
          icon: ViewModule,
          content: () => (
              <Stack spacing={4}>
                  <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
                      <Typography level="title-md" sx={{ mb: 1 }} startDecorator={<ViewModule color="primary" />}>Feature Modules</Typography>
                      <Typography level="body-xs" color="neutral" sx={{ mb: 3 }}>
                          Disabling a module hides its associated data and prevents new entries. Existing data is preserved.
                      </Typography>
                      <Stack spacing={2}>
                            {['pets', 'vehicles', 'meals'].map(mod => (
                                <Box key={mod} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box>
                                        <Typography level="title-sm" textTransform="capitalize">{mod}</Typography>
                                        <Typography level="body-xs" color="neutral">Enable or disable {mod} tracking.</Typography>
                                    </Box>
                                    <Switch 
                                        checked={enabledModules.includes(mod)}
                                        onChange={() => toggleModule(mod)}
                                        disabled={!isAdmin}
                                    />
                                </Box>
                            ))}
                      </Stack>
                  </Sheet>

                  <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
                      <Typography level="title-md" sx={{ mb: 2 }} startDecorator={<CloudDownload color="primary" />}>Data Export</Typography>
                      <Typography level="body-xs" color="neutral" sx={{ mb: 3 }}>
                          Download a complete copy of your household data.
                      </Typography>
                      <Stack direction="row" spacing={2}>
                          <Button variant="outlined" color="primary" startDecorator={<CloudDownload />} onClick={onExportTenant} disabled={!isAdmin}>
                              Export Archive (ZIP)
                          </Button>
                          <Button variant="outlined" color="neutral" startDecorator={<DataObject />} onClick={onExportJSONTenant} disabled={!isAdmin}>
                              Export Data (JSON)
                          </Button>
                      </Stack>
                  </Sheet>
              </Stack>
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
        endpoint={`/households/${householdId}/details`} 
        initialData={initialData}
        fields={FIELDS}
        costSegments={COST_SEGMENTS}
        extraTabs={EXTRA_TABS}
        scope={{ isAdmin, showNotification, confirmAction }}
        title="Household Properties"
        subtitle="Manage your home's technical, financial, and regional details."
        customSubmit={handleSave} 
    />
  );
}
