import React, { useState, useMemo } from 'react';
import { 
  Box, Paper, Typography, IconButton, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, Stack, Tooltip, Divider
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Add, Event, Cake, Favorite, Star 
} from '@mui/icons-material';
import EmojiPicker from './EmojiPicker';

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: <Cake fontSize="small" /> },
  { value: 'anniversary', label: 'Anniversary', icon: <Favorite fontSize="small" /> },
  { value: 'holiday', label: 'Holiday', icon: <Star fontSize="small" /> },
  { value: 'other', label: 'Event', icon: <Event fontSize="small" /> },
];

export default function FloatingCalendar({ dates = [], api, householdId, onDateAdded, currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openAdd, setOpenAdd] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('📅');

  const canEdit = currentUser?.role !== 'viewer';

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const numDays = daysInMonth(year, month);
  const firstDaySun = firstDayOfMonth(year, month);
  const firstDay = (firstDaySun + 6) % 7; // Shift so 0=Mon, 6=Sun

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= numDays; i++) {
    days.push(new Date(year, month, i));
  }

  const eventsOnSelectedDate = useMemo(() => {
    return (dates || []).filter(d => {
      const dDate = new Date(d.date);
      return dDate.getDate() === selectedDate.getDate() &&
             dDate.getMonth() === selectedDate.getMonth();
    });
  }, [dates, selectedDate]);

  const hasEvent = (date) => {
    if (!date) return false;
    return (dates || []).some(d => {
      const dDate = new Date(d.date);
      return dDate.getDate() === date.getDate() &&
             dDate.getMonth() === date.getMonth();
    });
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    data.date = `${y}-${m}-${d}`;

    api.post(`/households/${householdId}/dates`, data)
      .then(() => {
        setOpenAdd(false);
        if (onDateAdded) onDateAdded();
      })
      .catch(() => alert("Failed to add date"));
  };

  return (
    <Paper elevation={8} sx={{ width: 320, p: 2, borderRadius: 3, bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Typography>
        <Box>
          <IconButton size="small" onClick={handlePrevMonth}><ChevronLeft /></IconButton>
          <IconButton size="small" onClick={handleNextMonth}><ChevronRight /></IconButton>
        </Box>
      </Box>

      {/* Calendar Grid using CSS Grid for perfect alignment */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '2px',
        mb: 2 
      }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
          <Typography key={idx} variant="caption" fontWeight="bold" color="text.secondary" sx={{ textAlign: 'center', py: 0.5 }}>
            {d}
          </Typography>
        ))}
        {days.map((d, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
            {d ? (
              <IconButton 
                size="small" 
                onClick={() => setSelectedDate(d)}
                sx={{ 
                  width: 34, height: 34, fontSize: '0.85rem',
                  bgcolor: d.toDateString() === selectedDate.toDateString() ? 'primary.main' : 'transparent',
                  color: d.toDateString() === selectedDate.toDateString() ? 'primary.contrastText' : 'text.primary',
                  position: 'relative',
                  '&:hover': { bgcolor: d.toDateString() === selectedDate.toDateString() ? 'primary.dark' : 'action.hover' }
                }}
              >
                {d.getDate()}
                {hasEvent(d) && (
                  <Box sx={{ 
                    position: 'absolute', bottom: 4, width: 4, height: 4, 
                    borderRadius: '50%', bgcolor: d.toDateString() === selectedDate.toDateString() ? 'white' : 'primary.main' 
                  }} />
                )}
              </IconButton>
            ) : <Box sx={{ width: 34, height: 34 }} />}
          </Box>
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ minHeight: 100 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
          </Typography>
          {canEdit && (
            <Tooltip title="Add Event">
              <IconButton size="small" color="primary" onClick={() => setOpenAdd(true)}><Add fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>
        
        {eventsOnSelectedDate.length > 0 ? (
          <Stack spacing={1}>
            {eventsOnSelectedDate.map(e => (
              <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography sx={{ fontSize: '1rem' }}>{e.emoji || '📅'}</Typography>
                <Typography variant="body2" noWrap>{e.title}</Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', display: 'block', mt: 2 }}>
            No events today
          </Typography>
        )}
      </Box>

      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="xs">
        <form onSubmit={handleAddSubmit}>
          <DialogTitle>Add Event on {selectedDate.toLocaleDateString()}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <IconButton onClick={() => setEmojiPickerOpen(true)} sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', width: 48, height: 48 }}>
                    <Typography sx={{ fontSize: '1.2rem' }}>{selectedEmoji}</Typography>
                </IconButton>
                <TextField name="title" label="Title" fullWidth required size="small" />
            </Box>
            
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select name="type" defaultValue="other" label="Type">
                {EVENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField name="description" label="Notes (Optional)" multiline rows={2} fullWidth size="small" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add</Button>
          </DialogActions>
        </form>
      </Dialog>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
            setSelectedEmoji(emoji);
            setEmojiPickerOpen(false);
        }}
        title="Select Event Emoji"
      />
    </Paper>
  );
}
