import React, { useState, useEffect, useRef } from 'react';
import { Sheet, IconButton, Input, Typography, Box, List, ListItem, ListItemButton, Checkbox, ListItemContent, Divider } from '@mui/joy';
import { Close, Delete, DragIndicator, OpenInNew, Add, Minimize } from '@mui/icons-material';

const YELLOW = '#fff740';

export default function PostItNote({ onClose, user, onUpdateProfile, onPopout, isPopout = false, isDocked = false }) {
  const [notes, setNotes] = useState(() => {
      try {
          const parsed = JSON.parse(user?.sticky_note);
          return Array.isArray(parsed) ? parsed : [{ id: 1, text: user?.sticky_note || '', done: false }];
      } catch {
          return [{ id: 1, text: user?.sticky_note || '', done: false }];
      }
  });

  const [activeNoteId, setActiveNoteId] = useState(null);
  const [pos, setPos] = useState({ x: 100, y: 100 }); 
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
        const json = JSON.stringify(notes);
        if (json !== user?.sticky_note) onUpdateProfile({ sticky_note: json });
    }, 1000); 
    return () => clearTimeout(timer);
  }, [notes, onUpdateProfile, user?.sticky_note]);

  useEffect(() => {
      try {
          const parsed = JSON.parse(user?.sticky_note);
          if (Array.isArray(parsed) && JSON.stringify(parsed) !== JSON.stringify(notes)) setNotes(parsed);
      } catch {}
  }, [user?.sticky_note]);

  const onMouseDown = (e) => {
    if (isPopout || isDocked) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setRel({ x: e.pageX - rect.left, y: e.pageY - rect.top });
    e.stopPropagation();
  };

  useEffect(() => {
    if (isPopout || isDocked) return;
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
  }, [isDragging, rel, isPopout, isDocked]);

  const handleAdd = () => {
      const newId = Date.now();
      setNotes([{ id: newId, text: '', done: false }, ...notes]);
      setActiveNoteId(newId);
  };

  return (
    <Sheet
      ref={containerRef}
      variant="outlined"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false); }}
      tabIndex={0}
      sx={{
        position: isPopout ? 'relative' : 'fixed',
        left: isPopout ? 0 : (isDocked ? 'inherit' : pos.x),
        bottom: isDocked ? 0 : 'inherit',
        top: !isDocked && !isPopout ? pos.y : 'inherit',
        width: 320,
        height: 450,
        bgcolor: YELLOW,
        color: '#000',
        zIndex: 1300,
        boxShadow: 'lg',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'sm',
        border: '1px solid #e0d040',
        opacity: isFocused || isPopout ? 1 : 0.4,
        transition: 'opacity 0.2s, transform 0.2s'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid rgba(0,0,0,0.1)', bgcolor: 'rgba(0,0,0,0.05)', cursor: isDocked ? 'default' : 'move' }}>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="sm" variant="plain" onClick={handleAdd} sx={{ color: '#000' }}><Add /></IconButton>
            <Typography level="title-sm" sx={{ color: '#000' }}>{activeNoteId ? 'Editing Note' : 'Sticky Notes'}</Typography>
         </Box>
         <Box>
            {activeNoteId && <IconButton size="sm" variant="plain" onClick={() => setActiveNoteId(null)} sx={{ color: '#000' }}><Minimize fontSize="small" /></IconButton>}
            {!isPopout && <IconButton size="sm" variant="plain" onClick={onPopout} sx={{ color: '#000' }}><OpenInNew fontSize="small" /></IconButton>}
            <IconButton size="sm" variant="plain" onClick={onClose} sx={{ color: '#000' }}><Close fontSize="small" /></IconButton>
         </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {activeNoteId ? (
              <Input
                autoFocus multiline variant="plain" fullWidth
                value={notes.find(n => n.id === activeNoteId)?.text || ''}
                onChange={(e) => setNotes(notes.map(n => n.id === activeNoteId ? { ...n, text: e.target.value } : n))}
                sx={{ bgcolor: 'transparent', fontFamily: 'Caveat, cursive', fontSize: 'xl', p: 2, '& textarea': { color: '#000' } }}
              />
          ) : (
              <List sx={{ p: 0 }}>
                  {notes.map(n => (
                      <ListItem key={n.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }} endAction={<IconButton size="sm" color="danger" onClick={() => setNotes(notes.filter(x => x.id !== n.id))}><Delete /></IconButton>}>
                          <ListItemButton onClick={() => setActiveNoteId(n.id)}>
                              <Checkbox checked={n.done} onChange={() => setNotes(notes.map(x => x.id === n.id ? { ...x, done: !x.done } : x))} sx={{ mr: 1 }} />
                              <ListItemContent sx={{ textDecoration: n.done ? 'line-through' : 'none', opacity: n.done ? 0.5 : 1, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.text || 'New Note...'}</ListItemContent>
                          </ListItemButton>
                      </ListItem>
                  ))}
              </List>
          )}
      </Box>
    </Sheet>
  );
}
