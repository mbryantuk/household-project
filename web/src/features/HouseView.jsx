import GeneralDetailView from './GeneralDetailView';
import { HomeWork } from '@mui/icons-material';
import { Box, Divider, Typography } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';

export default function HouseView() {
  const { api, id: householdId, user: currentUser, showNotification } = useOutletContext();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fields = [
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
    <Box>
        <GeneralDetailView 
            title="House Details" 
            icon={<HomeWork />} 
            endpoint="details" 
            fields={fields} 
        />
        
        <Box sx={{ mt: 4 }}>
            <Divider />
            <Box sx={{ p: 2 }}>
                <RecurringCostsWidget 
                    api={api} 
                    householdId={householdId} 
                    parentType="house" 
                    parentId={1} // Singleton
                    isAdmin={isAdmin}
                    showNotification={showNotification}
                />
            </Box>
        </Box>
    </Box>
  );
}