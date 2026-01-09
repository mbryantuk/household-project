import GeneralDetailView from './GeneralDetailView';
import { AccountBalance } from '@mui/icons-material';

export default function CouncilView() {
  const fields = [
    { name: 'authority_name', label: 'Local Authority Name', half: true },
    { name: 'account_number', label: 'Account Number', half: true },
    { name: 'payment_method', label: 'Payment Method', half: true },
    { name: 'monthly_amount', label: 'Monthly Amount', type: 'number', half: true },
    { name: 'payment_day', label: 'Payment Day of Month', type: 'number', half: true },
    { name: 'color', label: 'Display Color (Hex)', half: true },
    { name: 'notes', label: 'Notes', multiline: true, rows: 3 }
  ];

  return (
    <GeneralDetailView 
      title="Council Tax" 
      icon={<AccountBalance />} 
      endpoint="council" 
      fields={fields} 
    />
  );
}
