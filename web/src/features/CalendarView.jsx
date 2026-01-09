import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, Chip, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Stack, IconButton, Tooltip
} from '@mui/material';
import { Event, Cake, Favorite, Add, Star, AddReaction, Edit, Delete } from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: <Cake fontSize="small" /> },
  { value: 'anniversary', label: 'Anniversary', icon: <Favorite fontSize="small" /> },
  { value: 'holiday', label: 'Holiday', icon: <Star fontSize="small" /> },
  { value: 'other', label: 'Event', icon: <Event fontSize="small" /> },
];

export default function CalendarView() {
  const { api, user: currentUser } = useOutletContext();
  const { id: householdId } = useParams();
  
  const canEdit = currentUser?.role !== 'viewer';
  
  const [dates, setDates] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('📅');
  const [loading, setLoading] = useState(true);

  const fetchDates = useCallback(() => {
    api.get(`/households/${householdId}/dates`)
      .then(res => setDates(res.data))
      .catch(() => console.error("Failed to fetch dates"))
      .finally(() => setLoading(false));
  }, [api, householdId]);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  const handleOpenAdd = () => {
    setEditingDate(null);
    setSelectedEmoji('📅');
    setOpen(true);
  };

  const handleOpenEdit = (date) => {
    setEditingDate(date);
    setSelectedEmoji(date.emoji || '📅');
    setOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    
    if (editingDate) {
      api.put(`/households/${householdId}/dates/${editingDate.id}`, data)
        .then(() => {
          setOpen(false);
          fetchDates();
        })
        .catch(() => alert("Failed to update date"));
    } else {
      api.post(`/households/${householdId}/dates`, data)
        .then(() => {
          setOpen(false);
          fetchDates();
        })
        .catch(() => alert("Failed to add date"));
    }
  };

  const handleDelete = (dateId) => {
    if (window.confirm("Remove this date?")) {
      api.delete(`/households/${householdId}/dates/${dateId}`)
        .then(fetchDates);
    }
  };

  const upcomingDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (dates || []).map(d => {
      const originalDate = new Date(d.date);
      let nextDate = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      if (nextDate < today) {
        nextDate.setFullYear(today.getFullYear() + 1);
      }
      const diffTime = nextDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const yearsRunning = nextDate.getFullYear() - originalDate.getFullYear();
      return { ...d, nextDate, diffDays, yearsRunning };
    }).sort((a, b) => a.diffDays - b.diffDays);
  }, [dates]);

  const getIcon = (d) => {
    if (d.emoji) return <Typography sx={{ fontSize: '1.2rem' }}>{d.emoji}</Typography>;
    return EVENT_TYPES.find(t => t.value === d.type)?.icon || <Event />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="300">Memorable Dates</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>Add Date</Button>
      </Box>

      <Grid container spacing={3}>
        {upcomingDates.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              No dates added yet. Add birthdays or anniversaries to track them!
            </Paper>
          </Grid>
        )}

        {upcomingDates.map((d) => (
          <Grid item xs={12} sm={6} md={4} key={d.id}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                        width: 40, height: 40, borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider'
                    }}>
                        {getIcon(d)}
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{d.title}</Typography>
                        <Chip label={d.type.toUpperCase()} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', mt: 0.5 }} />
                    </Box>
                  </Box>
                  <Chip 
                    label={d.diffDays === 0 ? "Today!" : `${d.diffDays} days`} 
                    color={d.diffDays < 7 ? "error" : "default"} 
                    size="small" 
                  />
                </Box>
                
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', fontSize: '0.9rem', mt: 1 }}>
                  <Typography variant="body2">
                    {d.nextDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Typography>
                </Stack>

                {d.yearsRunning > 0 && (d.type === 'birthday' || d.type === 'anniversary') && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic', color: 'primary.main' }}>
                    Turning {d.yearsRunning}
                  </Typography>
                )}
                
                {d.description && (
                  <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                    {d.description}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button size="small" startIcon={<Edit />} onClick={() => handleOpenEdit(d)}>
                        Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDelete(d.id)}>
                        Remove
                    </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleFormSubmit}>
          <DialogTitle>{editingDate ? 'Edit Memorable Date' : 'Add Memorable Date'}</DialogTitle>
          <DialogContent sx={{ minWidth: 350, display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Tooltip title="Pick an emoji">
                    <IconButton onClick={() => setEmojiPickerOpen(true)} sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', width: 56, height: 56 }}>
                        <Typography sx={{ fontSize: '1.5rem' }}>{selectedEmoji}</Typography>
                    </IconButton>
                </Tooltip>
                <TextField name="title" label="Title" defaultValue={editingDate?.title || ''} fullWidth required />
            </Box>
            
            <TextField name="date" label="Date" type="date" defaultValue={editingDate?.date || ''} InputLabelProps={{ shrink: true }} fullWidth required />
            
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select name="type" defaultValue={editingDate?.type || 'other'} label="Type">
                {EVENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField name="description" label="Notes (Optional)" defaultValue={editingDate?.description || ''} multiline rows={2} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EMOJI PICKER DIALOG */}
      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
            setSelectedEmoji(emoji);
            setEmojiPickerOpen(false);
        }}
        title="Select Event Emoji"
      />
    </Box>
  );
}
