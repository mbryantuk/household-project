import { useState, useEffect } from 'react';
import {
  Sheet,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Checkbox,
  ListItemContent,
  Box,
  Typography,
  Input,
} from '@mui/joy';
import { NoteAlt, Add, Delete, ChevronLeft } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

// STYLED: Adhere to "NO INLINE COLORS" rule using theme tokens.
const STICKY_BG = 'var(--joy-palette-warning-softBg)';
const STICKY_TEXT = 'var(--joy-palette-warning-plainColor)'; // Joy usually maps warning to dark text in light mode

export default function NotesWidget({ user, onUpdateProfile }) {
  const [notes, setNotes] = useState(() => {
    try {
      const parsed = JSON.parse(user?.sticky_note);
      return Array.isArray(parsed)
        ? parsed
        : [{ id: 1, text: user?.sticky_note || '', done: false }];
    } catch {
      return [{ id: 1, text: user?.sticky_note || '', done: false }];
    }
  });

  const [activeNoteId, setActiveNoteId] = useState(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(user?.sticky_note);
      if (Array.isArray(parsed) && JSON.stringify(parsed) !== JSON.stringify(notes)) {
        Promise.resolve().then(() => setNotes(parsed));
      }
    } catch {
      /* Ignore parse errors */
    }
  }, [user?.sticky_note, notes]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const json = JSON.stringify(notes);
      if (json !== user?.sticky_note) {
        onUpdateProfile({ sticky_note: json });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes, onUpdateProfile, user?.sticky_note]);

  const handleAdd = () => {
    const newId = Date.now();
    setNotes([{ id: newId, text: '', done: false }, ...notes]);
    setActiveNoteId(newId);
  };

  return (
    <WidgetWrapper title="Sticky Note" icon={<NoteAlt />} color="warning">
      <Sheet
        sx={{ bgcolor: STICKY_BG, height: '100%', m: -1, display: 'flex', flexDirection: 'column' }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            borderBottom: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          {activeNoteId ? (
            <IconButton
              size="sm"
              variant="plain"
              onClick={() => setActiveNoteId(null)}
              sx={{ color: 'neutral.900' }}
            >
              <ChevronLeft />
            </IconButton>
          ) : (
            <IconButton size="sm" variant="plain" onClick={handleAdd} sx={{ color: 'neutral.900' }}>
              <Add />
            </IconButton>
          )}
          <Typography level="body-xs" fontWeight="bold" sx={{ color: 'neutral.900' }}>
            {activeNoteId ? 'Editing' : 'Notes'}
          </Typography>
          <Box width={28} />
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {activeNoteId ? (
            <Input
              autoFocus
              multiline
              variant="plain"
              fullWidth
              value={notes.find((n) => n.id === activeNoteId)?.text || ''}
              onChange={(e) =>
                setNotes(
                  notes.map((n) => (n.id === activeNoteId ? { ...n, text: e.target.value } : n))
                )
              }
              sx={{
                bgcolor: 'transparent',
                fontSize: 'md',
                p: 1,
                '& textarea': { color: 'neutral.900' },
                height: '100%',
              }}
            />
          ) : (
            <List sx={{ p: 0 }}>
              {notes.map((n) => (
                <ListItem
                  key={n.id}
                  sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                  endAction={
                    <IconButton
                      size="sm"
                      color="danger"
                      onClick={() => setNotes(notes.filter((x) => x.id !== n.id))}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemButton onClick={() => setActiveNoteId(n.id)} sx={{ py: 0.5 }}>
                    <Checkbox
                      checked={n.done}
                      onChange={() =>
                        setNotes(notes.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)))
                      }
                      sx={{ mr: 1 }}
                    />
                    <ListItemContent
                      sx={{
                        textDecoration: n.done ? 'line-through' : 'none',
                        opacity: n.done ? 0.5 : 1,
                        color: 'neutral.900',
                        fontSize: 'sm',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.text || 'Empty note...'}
                    </ListItemContent>
                  </ListItemButton>
                </ListItem>
              ))}
              {notes.length === 0 && (
                <Typography
                  level="body-xs"
                  sx={{ textAlign: 'center', py: 4, opacity: 0.5, color: 'neutral.900' }}
                >
                  Click + to add a note
                </Typography>
              )}
            </List>
          )}
        </Box>
      </Sheet>
    </WidgetWrapper>
  );
}
