import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Card, CardContent, Chip, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Stack
} from '@mui/material';
import { Event, Cake, Favorite, Add, Star } from '@mui/icons-material';

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: <Cake fontSize="small" /> },
  { value: 'anniversary', label: 'Anniversary', icon: <Favorite fontSize="small" /> },
  { value: 'holiday', label: 'Holiday', icon: <Star fontSize="small" /> },
  { value: 'other', label: 'Event', icon: <Event fontSize="small" /> },
];

export default function CalendarView() {
  const { api } = useOutletContext(); // Get the authenticated axios instance
  const { id: householdId } = useParams();
  
  const [dates, setDates] = useState([]);
  const [open, setOpen] = useState(false);
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

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    api.post(`/households/${householdId}/dates`, data)
      .then(() => {
        setOpen(false);
        fetchDates();
      })
      .catch(() => alert("Failed to add date"));
  };

  const handleDelete = (dateId) => {
    if (window.confirm("Remove this date?")) {
      api.delete(`/households/${householdId}/dates/${dateId}`)
        .then(fetchDates);
    }
  };

  // Logic to calculate upcoming dates (handling year rollover)
  const upcomingDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dates.map(d => {
      const originalDate = new Date(d.date);
      // Construct date for THIS year
      let nextDate = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      
      // If it has already passed this year, it's next year
      if (nextDate < today) {
        nextDate.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = nextDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const yearsRunning = nextDate.getFullYear() - originalDate.getFullYear();

      return { ...d, nextDate, diffDays, yearsRunning };
    }).sort((a, b) => a.diffDays - b.diffDays);
  }, [dates]);

  const getIcon = (type) => EVENT_TYPES.find(t => t.value === type)?.icon || <Event />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="300">Memorable Dates</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>Add Date</Button>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Chip 
                    icon={getIcon(d.type)} 
                    label={d.type.toUpperCase()} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                    sx={{ mb: 1, borderRadius: 1 }}
                  />
                  <Chip 
                    label={d.diffDays === 0 ? "Today!" : `${d.diffDays} days`} 
                    color={d.diffDays < 7 ? "error" : "default"} 
                    size="small" 
                  />
                </Box>
                
                <Typography variant="h6" fontWeight="bold" gutterBottom>{d.title}</Typography>
                
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
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

                <Button size="small" color="error" sx={{ mt: 2 }} onClick={() => handleDelete(d.id)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleAddSubmit}>
          <DialogTitle>Add Memorable Date</DialogTitle>
          <DialogContent sx={{ minWidth: 300, display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField name="title" label="Title (e.g. Matt's Birthday)" fullWidth required />
            <TextField name="date" label="Date" type="date" InputLabelProps={{ shrink: true }} fullWidth required />
            
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select name="type" defaultValue="other" label="Type">
                {EVENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField name="description" label="Notes (Optional)" multiline rows={2} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
