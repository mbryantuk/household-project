import GeneralDetailView from './GeneralDetailView';
import { WaterDrop } from '@mui/icons-material';

export default function WaterView() {
  const fields = [
    { name: 'provider', label: 'Water Provider', half: true },
    { name: 'account_number', label: 'Account Number', half: true },
    { name: 'supply_type', label: 'Supply Type (e.g. Metered)', half: true },
    { name: 'meter_serial', label: 'Meter Serial Number', half: true },
    { name: 'monthly_amount', label: 'Monthly Amount (£)', type: 'number', step: '0.01', half: true },
    { name: 'payment_day', label: 'Payment Day', type: 'number', half: true },
    { name: 'nearest_working_day', label: 'Nearest Working Day (Next)', type: 'checkbox', half: true },
    { name: 'waste_provider', label: 'Waste Water Provider', half: true },
    { name: 'waste_account_number', label: 'Waste Account Number', half: true },
    { name: 'color', label: 'Display Color (Hex)', half: true },
    { name: 'notes', label: 'Notes', multiline: true, rows: 3 }
  ];

  return (
    <GeneralDetailView 
      title="Water Supply" 
      icon={<WaterDrop />} 
      endpoint="water" 
      fields={fields} 
    />
  );
}
