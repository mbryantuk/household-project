import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, DialogTitle, DialogContent, DialogActions,
  FormControl, FormLabel, Input, Select, Option, Stack, IconButton, Tooltip,
  Switch, Grid, Divider, ToggleButtonGroup, Modal, ModalDialog, Textarea, Chip
} from '@mui/joy';
import { 
  Add, Delete, Event as EventIcon, Cake, Favorite, Star,
  ChevronLeft, ChevronRight, List as ListIcon, CalendarMonth
} from '@mui/icons-material';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import { 
  addDays, addWeeks, addMonths, addYears, parseISO, isBefore, isAfter, 
  startOfDay, endOfDay, differenceInCalendarDays 
} from 'date-fns';
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

const CUSTOM_VIEWS = {
    TIMELINE: 'timeline'
};

function TimelineView({ events, onSelectEvent }) {
    const now = startOfDay(new Date());
    const upcomingEvents = useMemo(() => events
      .filter(e => !isBefore(endOfDay(e.start), now))
      .sort((a, b) => a.start.getTime() - b.start.getTime()), [events, now]);
  
    return (
      <Box sx={{ overflowY: 'auto', height: '100%', p: 1 }}>
        <Stack spacing={1.5}>
          {upcomingEvents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography level="body-lg" textColor="neutral.500">No upcoming events</Typography>
            </Box>
          ) : (
            upcomingEvents.map((event) => {
              const daysAway = differenceInCalendarDays(startOfDay(event.start), now);
              const label = daysAway === 0 ? "Today" : (daysAway === 1 ? "Tomorrow" : `${daysAway} days away`);
              const color = daysAway === 0 ? "primary" : (daysAway <= 7 ? "warning" : "neutral");
  
              return (
                <Sheet 
                  key={event.id}
                  variant="outlined" 
                  onClick={() => onSelectEvent(event)}
                  sx={{ 
                    p: 2, 
                    borderRadius: 'md', 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'background.level1' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                    <Typography level="title-lg" sx={{ lineHeight: 1 }}>{format(event.start, 'd')}</Typography>
                    <Typography level="body-xs" textTransform="uppercase" fontWeight="bold">{format(event.start, 'MMM')}</Typography>
                  </Box>
                  
                  <Divider orientation="vertical" />
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography level="title-md">{event.title}</Typography>
                    <Typography level="body-xs" textColor="neutral.500">
                        {event.allDay ? 'All Day' : format(event.start, 'h:mm a')} • {format(event.start, 'EEEE, d MMMM yyyy')}
                    </Typography>
                  </Box>
  
                  <Chip variant="soft" color={color} size="sm" sx={{ fontWeight: 'bold' }}>
                    {label}
                  </Chip>
                </Sheet>
              );
            })
          )}
        </Stack>
      </Box>
    );
}

export default function CalendarView({ showNotification }) {
  const { api } = useOutletContext();
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
        date: format(start, 'yyyy-MM-dd'),
        end_date: format(start, 'yyyy-MM-dd') 
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
        <Typography level="h2" fontWeight="300">Calendar</Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup 
                value={view} 
                onChange={(e, v) => v && setView(v)} 
                size="sm"
                variant="outlined"
            >
                <Button value={Views.MONTH} startDecorator={<CalendarMonth />}>Month</Button>
                <Button value={Views.WEEK}>Week</Button>
                <Button value={Views.AGENDA}>Agenda</Button>
                <Button value={CUSTOM_VIEWS.TIMELINE} startDecorator={<ListIcon />}>Timeline</Button>
            </ToggleButtonGroup>

            {view !== CUSTOM_VIEWS.TIMELINE && (
                <>
                    <Button variant="outlined" size="sm" onClick={() => setDate(new Date())}>Today</Button>
                    
                    <IconButton size="sm" variant="outlined" onClick={() => {
                        if (view === Views.MONTH) setDate(addMonths(date, -1));
                        else if (view === Views.WEEK) setDate(addWeeks(date, -1));
                        else setDate(addDays(date, -1));
                    }}>
                        <ChevronLeft />
                    </IconButton>
                    
                    <Typography level="title-lg" sx={{ minWidth: 180, textAlign: 'center' }}>
                        {view === Views.MONTH ? format(date, 'MMMM yyyy') : (
                            view === Views.WEEK ? `Week of ${format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d')}` : format(date, 'MMM d, yyyy')
                        )}
                    </Typography>
                    
                    <IconButton size="sm" variant="outlined" onClick={() => {
                        if (view === Views.MONTH) setDate(addMonths(date, 1));
                        else if (view === Views.WEEK) setDate(addWeeks(date, 1));
                        else setDate(addDays(date, 1));
                    }}>
                        <ChevronRight />
                    </IconButton>
                </>
            )}

            <Divider orientation="vertical" sx={{ mx: 2, height: 24 }} />
            
            <Button variant="solid" startDecorator={<Add />} onClick={() => handleSelectSlot({ start: new Date() })}>
                New Event
            </Button>
        </Stack>
      </Box>

      <Sheet variant="outlined" sx={{ flexGrow: 1, p: 2, borderRadius: 'md', overflow: 'hidden' }}>
        {view === CUSTOM_VIEWS.TIMELINE ? (
            <TimelineView events={events} onSelectEvent={handleSelectEvent} />
        ) : (
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
        )}
      </Sheet>

      {/* ADD/EDIT DIALOG */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%', p: 0 }}>
            <DialogTitle sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {editingEvent?.id ? 'Edit Event' : 'New Event'}
              {editingEvent?.id && <IconButton size="sm" variant="plain" color="danger" onClick={handleDelete}><Delete /></IconButton>}
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 2 }}>
                <form onSubmit={handleFormSubmit}>
                    <Stack spacing={2}>
                        
                        {/* Header: Emoji & Title */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Tooltip title="Pick an emoji" variant="soft">
                                <IconButton 
                                    onClick={() => setEmojiPickerOpen(true)} 
                                    variant="outlined"
                                    sx={{ width: 48, height: 48 }}
                                >
                                    <Typography level="h3">{selectedEmoji}</Typography>
                                </IconButton>
                            </Tooltip>
                            <FormControl required sx={{ flex: 1 }}>
                                <FormLabel>Event Title</FormLabel>
                                <Input name="title" defaultValue={editingEvent?.title || ''} autoFocus />
                            </FormControl>
                        </Box>

                        {/* Date & Time */}
                        <Grid container spacing={2}>
                            <Grid xs={12}>
                                <FormControl orientation="horizontal" sx={{ gap: 1 }}>
                                    <Switch checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} />
                                    <FormLabel>All-day</FormLabel>
                                </FormControl>
                            </Grid>
                            <Grid xs={6}>
                                <FormControl required>
                                    <FormLabel>Start Date</FormLabel>
                                    <Input 
                                        name="date" 
                                        type="date" 
                                        defaultValue={editingEvent?.date || ''} 
                                    />
                                </FormControl>
                            </Grid>
                            <Grid xs={6}>
                                <FormControl>
                                    <FormLabel>End Date</FormLabel>
                                    <Input 
                                        name="end_date" 
                                        type="date" 
                                        defaultValue={editingEvent?.end_date || ''} 
                                    />
                                </FormControl>
                            </Grid>
                        </Grid>

                        {/* Type & Recurrence */}
                        <Grid container spacing={2}>
                            <Grid xs={6}>
                                <FormControl>
                                    <FormLabel>Type</FormLabel>
                                    <Select name="type" defaultValue={editingEvent?.type || 'event'}>
                                        {EVENT_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid xs={6}>
                                <FormControl>
                                    <FormLabel>Recurrence</FormLabel>
                                    <Select 
                                        name="recurrence" 
                                        value={recurrence} 
                                        onChange={(e, v) => setRecurrence(v)} 
                                    >
                                        {RECURRENCE_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            {recurrence !== 'none' && (
                                <Grid xs={12}>
                                    <FormControl>
                                        <FormLabel>Repeat Until (Optional)</FormLabel>
                                        <Input 
                                            name="recurrence_end_date" 
                                            type="date" 
                                            defaultValue={editingEvent?.recurrence_end_date || ''} 
                                            placeholder="Leave blank to repeat forever"
                                        />
                                        <Typography level="body-xs" mt={0.5}>Leave blank to repeat forever</Typography>
                                    </FormControl>
                                </Grid>
                            )}
                        </Grid>

                        <FormControl>
                            <FormLabel>Notes / Description</FormLabel>
                            <Textarea name="description" defaultValue={editingEvent?.description || ''} minRows={3} />
                        </FormControl>

                        <DialogActions sx={{ pt: 2 }}>
                            <Button variant="plain" color="neutral" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" variant="solid">Save</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>

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
