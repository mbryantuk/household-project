import { Textarea } from '@mui/joy';
import { NoteAlt } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

export default function NotesWidget({ data, onSaveData }) {
  const handleChange = (e) => {
    onSaveData({ ...data, content: e.target.value });
  };

  return (
    <WidgetWrapper title="Quick Note" icon={<NoteAlt />} color="neutral">
      <Textarea 
        variant="plain" 
        value={data?.content || ''} 
        onChange={handleChange} 
        placeholder="Type something..." 
        minRows={3}
        sx={{ bgcolor: 'transparent', height: '100%' }}
      />
    </WidgetWrapper>
  );
}
