import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sheet, IconButton, Input, Typography, Box, Tooltip, Divider } from '@mui/joy';
import { Close, Delete, DragIndicator, OpenInNew } from '@mui/icons-material';

export default function PostItNote({ onClose, user, onUpdateProfile, isPopout = false }) {
  const [note, setNote] = useState(user?.sticky_note || '');
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 320, y: 100 }); // Default top right
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Debounced Save
  useEffect(() => {
    const timer = setTimeout(() => {
        if (note !== user?.sticky_note) {
            onUpdateProfile({ sticky_note: note });
        }
    }, 1000); // Autosave after 1s
    return () => clearTimeout(timer);
  }, [note, onUpdateProfile, user?.sticky_note]);

  // Sync from prop (if updated elsewhere)
  useEffect(() => {
    if (user?.sticky_note !== undefined) {
        setNote(user.sticky_note);
    }
  }, [user?.sticky_note]);

  const onMouseDown = (e) => {
    if (isPopout) return;
    // Allow dragging from header
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

  const handlePopout = () => {
    // Popout feature needs route support, but standard window open for now
    // We'd need a route like /note?content=... but we want it linked to user session
    // For now, simple window open might not work without a route
    // We'll skip complex popout route for this iteration and just open a window
    // that might need a route.
    // Actually, user wants "popoutable". The previous ones had routes.
    // I'll stick to draggable for now as adding a route requires App.jsx modification.
    // Wait, I can add a route in App.jsx in the next step.
    window.open('/note-window', 'TotemNote', 'width=300,height=300,menubar=no,toolbar=no,location=no,status=no');
    onClose();
  };

  return (
    <Sheet
      ref={containerRef}
      variant="outlined"
      sx={{
        position: isPopout ? 'relative' : 'fixed',
        left: isPopout ? 0 : pos.x,
        top: isPopout ? 0 : pos.y,
        width: isPopout ? '100%' : 280,
        height: isPopout ? '100%' : 300,
        bgcolor: '#fff740', // Classic Post-it Yellow
        color: '#000',
        zIndex: 1200,
        boxShadow: 'lg',
        transform: isPopout ? 'none' : 'rotate(-1deg)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout ? 0 : 'sm',
        border: '1px solid #e0d040'
      }}
    >
      <Box 
        onMouseDown={onMouseDown}
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 1, 
          borderBottom: '1px solid rgba(0,0,0,0.1)', 
          cursor: isPopout ? 'default' : 'move',
          userSelect: 'none',
          bgcolor: 'rgba(0,0,0,0.02)'
        }}
      >
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isPopout && <DragIndicator fontSize="small" sx={{ opacity: 0.3 }} />}
            <Typography level="body-xs" fontWeight="bold" textColor="neutral.700" sx={{ opacity: 0.7 }}>
                STICKY NOTE
            </Typography>
         </Box>
         <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="sm" variant="plain" color="neutral" onClick={() => setNote('')} sx={{ minHeight: 0, p: 0.5 }}>
                <Delete fontSize="small" />
            </IconButton>
            {!isPopout && (
                <IconButton size="sm" variant="plain" color="neutral" onClick={handlePopout} sx={{ minHeight: 0, p: 0.5 }}>
                    <OpenInNew fontSize="small" />
                </IconButton>
            )}
            {!isPopout && (
                <IconButton size="sm" variant="plain" color="neutral" onClick={onClose} sx={{ minHeight: 0, p: 0.5 }}>
                    <Close fontSize="small" />
                </IconButton>
            )}
        </Box>
      </Box>

      <Input
        variant="plain"
        fullWidth
        multiline
        placeholder="Write something..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        sx={{
            bgcolor: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            fontFamily: 'Caveat, cursive, sans-serif', 
            fontSize: 'lg',
            lineHeight: 1.4,
            p: 1.5,
            flexGrow: 1,
            '& textarea': { 
                color: '#2c2c2c',
                minHeight: '100% !important' 
            }
        }}
      />
    </Sheet>
  );
}
