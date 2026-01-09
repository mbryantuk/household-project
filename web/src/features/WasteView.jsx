import GeneralDetailView from './GeneralDetailView';
import { DeleteSweep } from '@mui/icons-material';

export default function WasteView() {
  const fields = [
    { name: 'collection_day', label: 'Collection Day (e.g. Tuesday)', half: true },
    { name: 'frequency', label: 'Frequency (e.g. Fortnightly)', half: true },
    { name: 'bin_types', label: 'Bin Types / Categories', half: true },
    { name: 'next_collection', label: 'Next Collection Date', type: 'date', half: true },
    { name: 'notes', label: 'General Notes', multiline: true, rows: 3 }
  ];

  return (
    <GeneralDetailView 
      title="Waste & Recycling" 
      icon={<DeleteSweep />} 
      endpoint="waste" 
      fields={fields} 
    />
  );
}
