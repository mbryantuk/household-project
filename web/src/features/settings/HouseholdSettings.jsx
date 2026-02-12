import { useState, useEffect } from 'react';
import { Box, Typography, FormControl, FormLabel, Input, Button, Stack, Sheet, Grid, Chip, Switch, Divider, IconButton, Tooltip } from '@mui/joy';
import Public from '@mui/icons-material/Public';
import ViewModule from '@mui/icons-material/ViewModule';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import CloudDownload from '@mui/icons-material/CloudDownload';
import DataObject from '@mui/icons-material/DataObject';

import { useHousehold } from '../../contexts/HouseholdContext';
import AppSelect from '../../components/ui/AppSelect';

export default function HouseholdSettings() {
  const { household, onUpdateHousehold, showNotification, user, api } = useHousehold();
  const isAdmin = user?.role === 'admin';

  const [name, setName] = useState(household?.name || '');
  const [regionalSettings, setRegionalSettings] = useState({
      currency: household?.currency || '£',
      date_format: household?.date_format || 'dd/MM/yyyy',
      decimals: household?.decimals !== undefined ? household.decimals : 2
  });
  const [enabledModules, setEnabledModules] = useState(() => {
      try {
          return household?.enabled_modules ? JSON.parse(household.enabled_modules) : ['pets', 'vehicles', 'meals'];
      } catch { return ['pets', 'vehicles', 'meals']; }
  });

  const [houseDetails, setHouseDetails] = useState({
      property_type: '', construction_year: '', tenure: 'Freehold',
      council_tax_band: '', purchase_price: 0, current_valuation: 0
  });

  useEffect(() => {
      api.get(`/households/${household.id}/details`).then(res => {
          if (res.data) setHouseDetails(res.data);
      }).catch(console.error);
  }, [api, household.id]);

  const handleSaveGeneral = async () => {
    try {
      await onUpdateHousehold({ name });
      showNotification('Household name updated!', 'success');
    } catch {
      showNotification('Failed to update household', 'danger');
    }
  };

  const handleSaveProperty = async () => {
      try {
          await api.put(`/households/${household.id}/details`, houseDetails);
          showNotification('Property details updated!', 'success');
      } catch {
          showNotification('Failed to update property details', 'danger');
      }
  };

  const handleSaveRegional = async () => {
    try {
        await onUpdateHousehold(regionalSettings);
        showNotification('Regional settings saved!', 'success');
     } catch {
        showNotification("Failed to save regional settings.", "danger");
    }
  };

  const toggleModule = async (module) => {
    if (!isAdmin) return;
    const newModules = enabledModules.includes(module) 
        ? enabledModules.filter(m => m !== module)
        : [...enabledModules, module];
    
    setEnabledModules(newModules);
    try {
        await onUpdateHousehold({ enabled_modules: JSON.stringify(newModules) });
     } catch {
        setEnabledModules(enabledModules);
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

  return (
    <Stack spacing={4} sx={{ maxWidth: 800 }}>
      <Box>
        <Typography level="h4">Household Settings</Typography>
        <Typography level="body-sm">Manage shared configuration for {household?.name}</Typography>
      </Box>

      {/* General Section */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
          <Typography level="title-md" sx={{ mb: 2 }}>General</Typography>
          <Stack spacing={2} sx={{ maxWidth: 500 }}>
            <FormControl>
                <FormLabel>Household Name</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
            </FormControl>
            <Button onClick={handleSaveGeneral} disabled={!isAdmin} sx={{ alignSelf: 'flex-start' }}>Update Name</Button>
          </Stack>
      </Sheet>

      {/* Property Details Section */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
          <Typography level="title-md" sx={{ mb: 2 }}>Property Details</Typography>
          <Grid container spacing={2}>
              <Grid xs={12} sm={6}>
                  <FormControl>
                      <FormLabel>Property Type</FormLabel>
                      <Input value={houseDetails.property_type || ''} onChange={(e) => setHouseDetails({...houseDetails, property_type: e.target.value})} placeholder="e.g. Semi-Detached House" disabled={!isAdmin} />
                  </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                  <FormControl>
                      <FormLabel>Construction Year</FormLabel>
                      <Input type="number" value={houseDetails.construction_year || ''} onChange={(e) => setHouseDetails({...houseDetails, construction_year: e.target.value})} placeholder="e.g. 1995" disabled={!isAdmin} />
                  </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                  <AppSelect 
                    label="Tenure" 
                    value={houseDetails.tenure || 'Freehold'} 
                    onChange={(v) => setHouseDetails({...houseDetails, tenure: v})}
                    options={[{ value: 'Freehold', label: 'Freehold' }, { value: 'Leasehold', label: 'Leasehold' }]}
                    disabled={!isAdmin}
                  />
              </Grid>
              <Grid xs={12} sm={6}>
                  <FormControl>
                      <FormLabel>Council Tax Band</FormLabel>
                      <Input value={houseDetails.council_tax_band || ''} onChange={(e) => setHouseDetails({...houseDetails, council_tax_band: e.target.value})} placeholder="e.g. D" disabled={!isAdmin} />
                  </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                  <FormControl>
                      <FormLabel>Purchase Price (£)</FormLabel>
                      <Input type="number" value={houseDetails.purchase_price || 0} onChange={(e) => setHouseDetails({...houseDetails, purchase_price: e.target.value})} disabled={!isAdmin} />
                  </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                  <FormControl>
                      <FormLabel>Current Valuation (£)</FormLabel>
                      <Input type="number" value={houseDetails.current_valuation || 0} onChange={(e) => setHouseDetails({...houseDetails, current_valuation: e.target.value})} disabled={!isAdmin} />
                  </FormControl>
              </Grid>
          </Grid>
          <Button sx={{ mt: 3 }} onClick={handleSaveProperty} disabled={!isAdmin}>Save Property Details</Button>
      </Sheet>

      {/* Regional Section */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
          <Typography level="title-md" sx={{ mb: 2 }} startDecorator={<Public color="primary" />}>Regional & Localization</Typography>
          <Stack spacing={3} sx={{ maxWidth: 500 }}>
                <AppSelect 
                    label="Currency Symbol" 
                    value={regionalSettings.currency} 
                    onChange={(v) => setRegionalSettings({...regionalSettings, currency: v})}
                    options={[
                        { value: '£', label: '£ (GBP) - Pound Sterling' },
                        { value: '$', label: '$ (USD) - US Dollar' },
                        { value: '€', label: '€ (EUR) - Euro' },
                        { value: '¥', label: '¥ (JPY) - Japanese Yen' },
                        { value: '₹', label: '₹ (INR) - Indian Rupee' },
                        { value: 'R', label: 'R (ZAR) - South African Rand' }
                    ]}
                    disabled={!isAdmin}
                />
                <AppSelect 
                    label="Date Format" 
                    value={regionalSettings.date_format} 
                    onChange={(v) => setRegionalSettings({...regionalSettings, date_format: v})}
                    options={[
                        { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (UK/EU)' },
                        { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)' },
                        { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' }
                    ]}
                    disabled={!isAdmin}
                />
                <Button onClick={handleSaveRegional} disabled={!isAdmin} sx={{ alignSelf: 'flex-start' }}>Save Regional</Button>
          </Stack>
      </Sheet>

      {/* Modules Section */}
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

      {/* Data Management Section */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
          <Typography level="title-md" sx={{ mb: 2 }} startDecorator={<CloudDownload color="primary" />}>Data Management</Typography>
          <Typography level="body-xs" color="neutral" sx={{ mb: 3 }}>
              Download a complete copy of your household data.
          </Typography>
          <Stack direction="row" spacing={2}>
              <Button 
                  variant="outlined" 
                  color="primary" 
                  startDecorator={<CloudDownload />}
                  onClick={onExportTenant}
                  disabled={!isAdmin}
              >
                  Export Archive (ZIP)
              </Button>
              <Button 
                  variant="outlined" 
                  color="neutral" 
                  startDecorator={<DataObject />}
                  onClick={onExportJSONTenant}
                  disabled={!isAdmin}
              >
                  Export Data (JSON)
              </Button>
          </Stack>
      </Sheet>

      {/* Debug Section */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'warning.softBg', borderColor: 'warning.200' }}>
          <Typography level="title-md" sx={{ mb: 1, color: 'warning.700' }}>System Diagnostics</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                  <Typography level="title-sm">Debug Mode</Typography>
                  <Typography level="body-xs" color="neutral">Enable verbose logging for troubleshooting (Performance impact).</Typography>
              </Box>
              <Switch 
                  checked={household?.debug_mode === 1}
                  onChange={(e) => onUpdateHousehold({ debug_mode: e.target.checked ? 1 : 0 })}
                  disabled={!isAdmin}
                  color="warning"
              />
          </Box>
      </Sheet>
    </Stack>
  );
}
