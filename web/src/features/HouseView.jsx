import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { 
  Box, Typography, Paper, Tabs, Tab, CircularProgress, Divider
} from '@mui/material';
import { 
  HomeWork, ElectricBolt, WaterDrop, DeleteSweep, 
  Inventory, AccountBalance, Payments, Info
} from '@mui/icons-material';

// Feature Components
import EnergyView from './EnergyView';
import WaterView from './WaterView';
import CouncilView from './CouncilView';
import WasteView from './WasteView';
import AssetsView from './AssetsView';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import GeneralDetailView from './GeneralDetailView';

export default function HouseView() {
  const { api, id: householdId, user: currentUser, showNotification, isDark } = useOutletContext();
  const location = useLocation();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  // Map sub-paths to tab indices
  const tabMap = useMemo(() => ({
    '/house': 0,
    '/energy': 1,
    '/water': 2,
    '/waste': 3,
    '/assets': 4,
    '/council': 5,
    '/costs': 6
  }), []);

  // Determine active tab from URL
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname.split('/').pop();
    return tabMap[`/${path}`] || 0;
  });

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    const tab = tabMap[`/${path}`];
    if (tab !== undefined) setActiveTab(tab);
  }, [location.pathname, tabMap]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Note: We don't necessarily need to navigate here if we want to keep it as a pure state-based view,
    // but NavSidebar already points to these separate routes. 
    // To support both, we keep them in sync.
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
            onChange={handleTabChange} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{ px: 2 }}
          >
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
            <GeneralDetailView 
                title="Structural & General Info" 
                icon={<Info />} 
                endpoint="details" 
                fields={houseFields} 
            />
          )}
          
          {activeTab === 1 && <EnergyView />}
          {activeTab === 2 && <WaterView />}
          {activeTab === 3 && <WasteView />}
          {activeTab === 4 && <AssetsView />}
          {activeTab === 5 && <CouncilView />}
          
          {activeTab === 6 && (
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
