import { useState, useEffect } from 'react';
import { Textarea } from '@mui/joy';
import { NoteAlt } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

export default function NotesWidget({ user, onUpdateProfile }) {
  const [text, setText] = useState(user?.sticky_note || '');

  // Sync if user prop updates (e.g. from server)
  useEffect(() => {
      if (user?.sticky_note !== text) {
          setText(user?.sticky_note || '');
      }
  }, [user?.sticky_note]);

  // Debounce save
  useEffect(() => {
      const timer = setTimeout(() => {
          if (text !== user?.sticky_note) {
              onUpdateProfile({ sticky_note: text });
          }
      }, 1000);
      return () => clearTimeout(timer);
  }, [text, onUpdateProfile, user?.sticky_note]);

  return (
    <WidgetWrapper title="Sticky Note" icon={<NoteAlt />} color="warning">
      <Textarea 
        variant="plain" 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        placeholder="Type a note..." 
        minRows={3}
        sx={{ bgcolor: 'transparent', height: '100%' }}
      />
    </WidgetWrapper>
  );
}
