import React, { useState, useEffect, useRef } from 'react';
import { Sheet, IconButton, Input, Typography, Box, List, ListItem, ListItemButton, Checkbox, ListItemContent } from '@mui/joy';
import { Close, Delete, DragIndicator, OpenInNew, Add } from '@mui/icons-material';

// Styles for the "Windows Sticky Note" look
const YELLOW = '#fff740';

export default function PostItNote({ onClose, user, onUpdateProfile, onPopout, isPopout = false }) {
  // Parse JSON or string
  const [notes, setNotes] = useState(() => {
      try {
          const parsed = JSON.parse(user?.sticky_note);
          return Array.isArray(parsed) ? parsed : [{ id: 1, text: user?.sticky_note || '', done: false }];
      } catch {
          return [{ id: 1, text: user?.sticky_note || '', done: false }];
      }
  });

  const [activeNoteId, setActiveNoteId] = useState(null); // If null, show list. If set, show editor.

  const [pos, setPos] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 400 }); 
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef(null);

  // Debounced Save
  useEffect(() => {
    const timer = setTimeout(() => {
        const json = JSON.stringify(notes);
        if (json !== user?.sticky_note) {
            onUpdateProfile({ sticky_note: json });
        }
    }, 1000); 
    return () => clearTimeout(timer);
  }, [notes, onUpdateProfile, user?.sticky_note]);

  // Sync from prop
  useEffect(() => {
      try {
          const parsed = JSON.parse(user?.sticky_note);
          if (Array.isArray(parsed) && JSON.stringify(parsed) !== JSON.stringify(notes)) {
              setNotes(parsed);
          }
      } catch {}
  }, [user?.sticky_note]); // Careful with loop, but JSON.stringify check helps

  // Drag Logic
  const onMouseDown = (e) => {
    if (isPopout) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setRel({ x: e.pageX - rect.left, y: e.pageY - rect.top });
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPopout) return;
    const onMouseMove = (e) => {
      if (!isDragging) return;
      setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y });
    };
    const onMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, rel, isPopout]);

  const handleAdd = () => {
      const newId = Date.now();
      setNotes([...notes, { id: newId, text: '', done: false }]);
      setActiveNoteId(newId);
  };

  const handleDelete = (id) => {
      setNotes(notes.filter(n => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
  };

  const handleUpdate = (id, text) => {
      setNotes(notes.map(n => n.id === id ? { ...n, text } : n));
  };

  const handleToggle = (id) => {
      setNotes(notes.map(n => n.id === id ? { ...n, done: !n.done } : n));
  };

  return (
    <Sheet
      ref={containerRef}
      variant="outlined"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false);
      }}
      tabIndex={0}
      sx={{
        position: isPopout ? 'relative' : 'fixed',
        left: isPopout ? 0 : pos.x,
        top: isPopout ? 0 : pos.y,
        width: isPopout ? '100%' : 300,
        height: isPopout ? '100%' : 400,
        bgcolor: YELLOW,
        color: '#000',
        zIndex: 1300,
        boxShadow: 'lg',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout ? 0 : 'sm',
        border: '1px solid #e0d040',
        opacity: isFocused || isPopout ? 1 : 0.6,
        transition: 'opacity 0.2s'
      }}
    >
      {/* Header */}
      <Box 
        onMouseDown={onMouseDown}
        sx={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, 
          borderBottom: '1px solid rgba(0,0,0,0.1)', cursor: isPopout ? 'default' : 'move',
          bgcolor: 'rgba(0,0,0,0.05)'
        }}
      >
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="sm" variant="plain" color="neutral" onClick={handleAdd} sx={{ color: '#000' }}>
                <Add />
            </IconButton>
            <Typography level="body-sm" fontWeight="bold" textColor="neutral.800">
                {activeNoteId ? 'Edit Note' : 'Notes'}
            </Typography>
         </Box>
         <Box sx={{ display: 'flex', gap: 0.5 }}>
            {activeNoteId && (
                <IconButton size="sm" variant="plain" onClick={() => setActiveNoteId(null)} sx={{ color: '#000' }}>
                    <Close fontSize="small" />
                </IconButton>
            )}
            {!isPopout && (
                <IconButton size="sm" variant="plain" onClick={onPopout} sx={{ color: '#000' }}>
                    <OpenInNew fontSize="small" />
                </IconButton>
            )}
            {!isPopout && (
                <IconButton size="sm" variant="plain" onClick={onClose} sx={{ color: '#000' }}>
                    <Close fontSize="small" />
                </IconButton>
            )}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
          {activeNoteId ? (
              <Input
                autoFocus
                variant="plain"
                fullWidth
                multiline
                placeholder="Type your note..."
                value={notes.find(n => n.id === activeNoteId)?.text || ''}
                onChange={(e) => handleUpdate(activeNoteId, e.target.value)}
                sx={{
                    bgcolor: 'transparent', border: 'none', outline: 'none', boxShadow: 'none',
                    fontFamily: 'Caveat, cursive, sans-serif', fontSize: 'lg', lineHeight: 1.4, p: 2,
                    height: '100%', alignItems: 'flex-start',
                    '& textarea': { color: '#2c2c2c', minHeight: '100% !important' }
                }}
              />
          ) : (
              <List>
                  {notes.map(note => (
                      <ListItem key={note.id} 
                        endAction={
                            <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(note.id)}>
                                <Delete fontSize="small" />
                            </IconButton>
                        }
                        sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                      >
                          <ListItemButton onClick={() => setActiveNoteId(note.id)}>
                              <Checkbox 
                                checked={note.done} 
                                onChange={(e) => { e.stopPropagation(); handleToggle(note.id); }} 
                                sx={{ mr: 1, color: '#000' }}
                              />
                              <ListItemContent sx={{ 
                                  textDecoration: note.done ? 'line-through' : 'none', 
                                  opacity: note.done ? 0.5 : 1,
                                  color: '#000',
                                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                              }}>
                                  {note.text || 'Empty Note'}
                              </ListItemContent>
                          </ListItemButton>
                      </ListItem>
                  ))}
                  {notes.length === 0 && (
                      <Typography level="body-sm" sx={{ p: 2, textAlign: 'center', opacity: 0.6, color: '#000' }}>
                          No notes. Click + to add one.
                      </Typography>
                  )}
              </List>
          )}
      </Box>
    </Sheet>
  );
}