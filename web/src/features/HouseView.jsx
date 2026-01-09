import GeneralDetailView from './GeneralDetailView';
import { HomeWork } from '@mui/icons-material';

export default function HouseView() {
  const fields = [
    { name: 'property_type', label: 'Property Type', half: true },
    { name: 'construction_year', label: 'Year Built', type: 'number', half: true },
    { name: 'tenure', label: 'Tenure (e.g. Freehold)', half: true },
    { name: 'council_tax_band', label: 'Council Tax Band', half: true },
    { name: 'broadband_provider', label: 'Broadband Provider', half: true },
    { name: 'broadband_account', label: 'Broadband Account Number', half: true },
    { name: 'broadband_router_model', label: 'Router Model', half: true },
    { name: 'wifi_password', label: 'WiFi Password', half: true },
    { name: 'smart_home_hub', label: 'Smart Home Hub', half: true },
    { name: 'notes', label: 'General Notes', multiline: true, rows: 4 }
  ];

  return (
    <GeneralDetailView 
      title="House Information" 
      icon={<HomeWork />} 
      endpoint="details" 
      fields={fields} 
    />
  );
}
