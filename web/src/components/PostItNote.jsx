import React, { useState, useEffect } from 'react';
import { Sheet, IconButton, Input, Typography, Box, Tooltip } from '@mui/joy';
import { Close, Delete } from '@mui/icons-material';

export default function PostItNote({ onClose }) {
  const [note, setNote] = useState(() => localStorage.getItem('totem_user_note') || '');

  useEffect(() => {
    localStorage.setItem('totem_user_note', note);
  }, [note]);

  return (
    <Sheet
      variant="outlined"
      sx={{
        position: 'fixed',
        top: 80,
        right: 20,
        width: 250,
        height: 250,
        bgcolor: '#fff740', // Classic Post-it Yellow
        color: '#000',
        p: 2,
        zIndex: 1200,
        boxShadow: 'lg',
        transform: 'rotate(-2deg)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'sm',
        border: 'none'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 0.5 }}>
        <Typography level="body-xs" fontWeight="bold" textColor="neutral.700" sx={{ opacity: 0.7 }}>
            STICKY NOTE
        </Typography>
        <Box>
            <IconButton size="sm" variant="plain" color="neutral" onClick={() => setNote('')} sx={{ minHeight: 0, p: 0.5, mr: 0.5 }}>
                <Delete fontSize="small" />
            </IconButton>
            <IconButton size="sm" variant="plain" color="neutral" onClick={onClose} sx={{ minHeight: 0, p: 0.5 }}>
                <Close fontSize="small" />
            </IconButton>
        </Box>
      </Box>
      <Input
        variant="plain"
        fullWidth
        multiline
        minRows={8}
        placeholder="Write something..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        sx={{
            bgcolor: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            fontFamily: 'Caveat, cursive, sans-serif', // Handwritting style if available, fallback sans
            fontSize: 'lg',
            lineHeight: 1.4,
            p: 0,
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