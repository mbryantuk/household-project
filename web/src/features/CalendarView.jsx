import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Stack, IconButton, Tooltip,
  Switch, FormControlLabel, Grid, Paper, Divider, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { 
  Add, Delete, Edit, Event as EventIcon, Cake, Favorite, Star,
  ChevronLeft, ChevronRight
} from '@mui/icons-material';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import { addDays, addWeeks, addMonths, addYears, parseISO, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import EmojiPicker from '../components/EmojiPicker';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const EVENT_TYPES = [
  { value: 'event', label: 'Event', icon: <EventIcon /> },
  { value: 'birthday', label: 'Birthday', icon: <Cake /> },
  { value: 'anniversary', label: 'Anniversary', icon: <Favorite /> },
  { value: 'holiday', label: 'Holiday', icon: <Star /> },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function CalendarView({ showNotification }) {
  const { api, user: currentUser } = useOutletContext();
  const { id: householdId } = useParams();
  
  const [rawDates, setRawDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('📅');
  const [loading, setLoading] = useState(true);

  // Calendar Control State
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.MONTH);

  // Form State
  const [isAllDay, setIsAllDay] = useState(true);
  const [recurrence, setRecurrence] = useState('none');

  const fetchDates = useCallback(() => {
    setLoading(true);
    api.get(`/households/${householdId}/dates`)
      .then(res => {
        setRawDates(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to fetch dates", err);
        if (showNotification) showNotification("Failed to load calendar", "error");
      })
      .finally(() => setLoading(false));
  }, [api, householdId, showNotification]);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  // --- EVENT EXPANSION & RECURRING COSTS ---
  useEffect(() => {
    if (!rawDates) return;

    const expandedEvents = [];
    const limitDate = addYears(new Date(), 2); // Expand up to 2 years ahead

    rawDates.forEach(d => {
      // Logic for cost items vs regular date items
      if (d.type === 'cost' || d.type === 'holiday') {
        expandedEvents.push({
          id: d.id,
          title: d.title,
          start: parseISO(d.date),
          end: parseISO(d.date),
          allDay: true,
          resource: d,
          color: d.type === 'holiday' ? '#ff9800' : '#4caf50'
        });
        return;
      }

      const startDate = parseISO(d.date);
      const endDate = d.end_date ? parseISO(d.end_date) : (d.is_all_day ? startDate : addDays(startDate, 0));
      const recurEnd = d.recurrence_end_date ? parseISO(d.recurrence_end_date) : limitDate;

      const baseEvent = {
        id: d.id,
        title: d.emoji ? `${d.emoji} ${d.title}` : d.title,
        allDay: Boolean(d.is_all_day),
        resource: d, // Keep full original data
      };

      if (!d.recurrence || d.recurrence === 'none') {
        expandedEvents.push({
          ...baseEvent,
          start: startDate,
          end: endDate,
        });
      } else {
        let currentStart = startDate;
        let currentEnd = endDate;
        const duration = currentEnd.getTime() - currentStart.getTime();

        while (isBefore(currentStart, recurEnd) && isBefore(currentStart, limitDate)) {
           // Create instance
           expandedEvents.push({
             ...baseEvent,
             id: `${d.id}_${currentStart.toISOString()}`, // Unique ID for instance
             start: new Date(currentStart),
             end: new Date(currentStart.getTime() + duration),
             originalId: d.id // Link back to parent
           });

           // Advance
           switch (d.recurrence) {
             case 'daily': currentStart = addDays(currentStart, 1); break;
             case 'weekly': currentStart = addWeeks(currentStart, 1); break;
             case 'monthly': currentStart = addMonths(currentStart, 1); break;
             case 'yearly': currentStart = addYears(currentStart, 1); break;
             default: currentStart = addYears(currentStart, 100); // Break loop
           }
        }
      }
    });

    setEvents(expandedEvents);
  }, [rawDates]);


  // --- HANDLERS ---

  const handleSelectSlot = ({ start, end }) => {
    setEditingEvent(null);
    setSelectedEmoji('📅');
    setIsAllDay(true);
    setRecurrence('none');
    // Pre-fill dates
    setEditingEvent({ 
        start: format(start, 'yyyy-MM-dd'),
        end: format(start, 'yyyy-MM-dd') 
    });
    setOpen(true);
  };

  const handleSelectEvent = (event) => {
    const original = event.resource;
    if (original.type === 'holiday' || original.type === 'cost') {
        // Read-only or handled elsewhere
        if (showNotification) showNotification(`${original.title}: ${original.description || ''}`, "info");
        return;
    }

    setEditingEvent({
        ...original,
        // Ensure dates are strings for inputs
        date: original.date.split('T')[0], // strip time if ISO
        end_date: original.end_date ? original.end_date.split('T')[0] : original.date.split('T')[0]
    });
    setSelectedEmoji(original.emoji || '📅');
    setIsAllDay(Boolean(original.is_all_day));
    setRecurrence(original.recurrence || 'none');
    setOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Formatting
    data.emoji = selectedEmoji;
    data.is_all_day = isAllDay ? 1 : 0;
    data.recurrence = recurrence;
    
    if (editingEvent?.id) {
      api.put(`/households/${householdId}/dates/${editingEvent.id}`, data)
        .then(() => {
          setOpen(false);
          fetchDates();
          if (showNotification) showNotification("Event updated", "success");
        })
        .catch((err) => {
            console.error(err);
            if (showNotification) showNotification("Failed to update event", "error");
        });
    } else {
      api.post(`/households/${householdId}/dates`, data)
        .then(() => {
          setOpen(false);
          fetchDates();
          if (showNotification) showNotification("Event created", "success");
        })
        .catch((err) => {
            console.error(err);
            if (showNotification) showNotification("Failed to create event", "error");
        });
    }
  };

  const handleDelete = () => {
    if (!editingEvent?.id) return;
    if (window.confirm("Delete this event? If it's recurring, all future events will be removed.")) {
      api.delete(`/households/${householdId}/dates/${editingEvent.id}`)
        .then(() => {
          setOpen(false);
          fetchDates();
          if (showNotification) showNotification("Event deleted", "info");
        });
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* CUSTOM TOOLBAR */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="300">Calendar</Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup 
                value={view} 
                exclusive 
                onChange={(e, v) => v && setView(v)} 
                size="small"
                sx={{ mr: 2 }}
            >
                <ToggleButton value={Views.MONTH}>Month</ToggleButton>
                <ToggleButton value={Views.WEEK}>Week</ToggleButton>
                <ToggleButton value={Views.AGENDA}>Agenda</ToggleButton>
            </ToggleButtonGroup>

            <Button variant="outlined" size="small" onClick={() => setDate(new Date())}>Today</Button>
            
            <IconButton size="small" onClick={() => {
                if (view === Views.MONTH) setDate(addMonths(date, -1));
                else if (view === Views.WEEK) setDate(addWeeks(date, -1));
                else setDate(addDays(date, -1));
            }}>
                <ChevronLeft />
            </IconButton>
            
            <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center' }}>
                {view === Views.MONTH ? format(date, 'MMMM yyyy') : (
                    view === Views.WEEK ? `Week of ${format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d')}` : format(date, 'MMM d, yyyy')
                )}
            </Typography>
            
            <IconButton size="small" onClick={() => {
                if (view === Views.MONTH) setDate(addMonths(date, 1));
                else if (view === Views.WEEK) setDate(addWeeks(date, 1));
                else setDate(addDays(date, 1));
            }}>
                <ChevronRight />
            </IconButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            
            <Button variant="contained" startIcon={<Add />} onClick={() => handleSelectSlot({ start: new Date() })}>
                New Event
            </Button>
        </Stack>
      </Box>

      <Paper sx={{ flexGrow: 1, p: 2 }}>
        <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
            view={view}
            onView={v => setView(v)}
            date={date}
            onNavigate={d => setDate(d)}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            popup
            toolbar={false}
            eventPropGetter={(event) => {
                if (event.color) return { style: { backgroundColor: event.color } };
                return {};
            }}
        />
      </Paper>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleFormSubmit}>
          <DialogTitle>
              {editingEvent?.id ? 'Edit Event' : 'New Event'}
              {editingEvent?.id && <IconButton size="small" onClick={handleDelete} sx={{ float: 'right', color: 'error.main' }}><Delete /></IconButton>}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3} sx={{ pt: 1 }}>
                
                {/* Header: Emoji & Title */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Tooltip title="Pick an emoji">
                        <IconButton onClick={() => setEmojiPickerOpen(true)} sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', width: 56, height: 56 }}>
                            <Typography sx={{ fontSize: '1.5rem' }}>{selectedEmoji}</Typography>
                        </IconButton>
                    </Tooltip>
                    <TextField name="title" label="Event Title" defaultValue={editingEvent?.title || ''} fullWidth required autoFocus />
                </Box>

                {/* Date & Time */}
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <FormControlLabel 
                            control={<Switch checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} />} 
                            label="All-day" 
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField 
                            name="date" 
                            label="Start Date" 
                            type="date" 
                            defaultValue={editingEvent?.date || ''} 
                            InputLabelProps={{ shrink: true }} 
                            fullWidth required 
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField 
                            name="end_date" 
                            label="End Date" 
                            type="date" 
                            defaultValue={editingEvent?.end_date || ''} 
                            InputLabelProps={{ shrink: true }} 
                            fullWidth 
                        />
                    </Grid>
                </Grid>

                {/* Type & Recurrence */}
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select name="type" defaultValue={editingEvent?.type || 'event'} label="Type">
                                {EVENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>Recurrence</InputLabel>
                            <Select 
                                name="recurrence" 
                                value={recurrence} 
                                onChange={(e) => setRecurrence(e.target.value)} 
                                label="Recurrence"
                            >
                                {RECURRENCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    {recurrence !== 'none' && (
                        <Grid item xs={12}>
                             <TextField 
                                name="recurrence_end_date" 
                                label="Repeat Until (Optional)" 
                                type="date" 
                                defaultValue={editingEvent?.recurrence_end_date || ''} 
                                InputLabelProps={{ shrink: true }} 
                                fullWidth 
                                helperText="Leave blank to repeat forever"
                            />
                        </Grid>
                    )}
                </Grid>

                <TextField name="description" label="Notes / Description" defaultValue={editingEvent?.description || ''} multiline rows={3} fullWidth />

            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
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
    </Box>
  );
}