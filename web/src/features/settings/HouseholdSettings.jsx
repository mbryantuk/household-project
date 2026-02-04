import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, FormControl, FormLabel, Input, Button, Stack, Sheet, Grid, Chip, Switch, Divider } from '@mui/joy';
import Public from '@mui/icons-material/Public';
import ViewModule from '@mui/icons-material/ViewModule';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';

import { useHousehold } from '../../contexts/HouseholdContext';
import AppSelect from '../../components/ui/AppSelect';

export default function HouseholdSettings() {
  const { household, onUpdateHousehold, showNotification, user } = useHousehold();
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

  const handleSaveGeneral = async () => {
    try {
      await onUpdateHousehold({ name });
      showNotification('Household name updated!', 'success');
    } catch(e) {
      showNotification('Failed to update household', 'danger');
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
    </Stack>
  );
}
