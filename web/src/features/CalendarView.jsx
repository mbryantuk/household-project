import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, DialogTitle, DialogContent, DialogActions,
  FormControl, FormLabel, Input, Select, Option, Stack, IconButton, Tooltip,
  Switch, Grid, Divider, ToggleButtonGroup, Modal, ModalDialog, Textarea, Chip, Avatar
} from '@mui/joy';
import { 
  Add, Delete, Event as EventIcon, Cake, Favorite, Star,
  ChevronLeft, ChevronRight, List as ListIcon, CalendarMonth, AccessTime
} from '@mui/icons-material';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import { 
  addDays, addWeeks, addMonths, addYears, parseISO, isBefore, 
  startOfDay, endOfDay, differenceInCalendarDays, isValid
} from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

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

// --- CUSTOM AGENDA COMPONENTS (JAZZED UP) ---

const CustomAgendaEvent = ({ event, isDark }) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
            <Avatar 
                size="sm" 
                sx={{ 
                    bgcolor: event.color || getEmojiColor(event.resource?.emoji || '📅', isDark),
                    fontSize: '1rem'
                }}
            >
                {event.resource?.emoji || '📅'}
            </Avatar>
            <Box>
                <Typography level="title-sm">{event.title.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/, '')}</Typography>
                {event.resource?.description && (
                    <Typography level="body-xs" color="neutral" noWrap sx={{ maxWidth: 250 }}>
                        {event.resource.description}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

const CustomAgendaDate = ({ label }) => (
    <Typography level="title-sm" sx={{ color: 'primary.plainColor', fontWeight: 'bold', py: 1 }}>
        {label}
    </Typography>
);

const CustomAgendaTime = ({ event }) => (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'neutral.500' }}>
        <AccessTime sx={{ fontSize: '0.9rem' }} />
        <Typography level="body-xs">
            {event.allDay ? 'All Day' : format(event.start, 'h:mm a')}
        </Typography>
    </Stack>
);

function TimelineView({ events, onSelectEvent, isDark }) {
    const now = startOfDay(new Date());
    const upcomingEvents = useMemo(() => events
      .filter(e => e.start && isValid(e.start) && !isBefore(endOfDay(e.start), now))
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
              const emoji = event.resource?.emoji || '📅';

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
                  <Avatar 
                    size="lg" 
                    sx={{ 
                        bgcolor: getEmojiColor(emoji, isDark),
                        fontSize: '1.5rem' 
                    }}
                  >
                    {emoji}
                  </Avatar>
                  
                  <Box sx={{ textAlign: 'center', minWidth: 60 }}>
                    <Typography level="title-lg" sx={{ lineHeight: 1 }}>{format(event.start, 'd')}</Typography>
                    <Typography level="body-xs" textTransform="uppercase" fontWeight="bold">{format(event.start, 'MMM')}</Typography>
                  </Box>
                  
                  <Divider orientation="vertical" />
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography level="title-md">{event.title.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/, '')}</Typography>
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
  const { api, isDark } = useOutletContext();
  const { id: householdId } = useParams();
  
  const [rawDates, setRawDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('📅');

  // Calendar Control State - Default to TIMELINE as requested
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(CUSTOM_VIEWS.TIMELINE);

  // Form State
  const [isAllDay, setIsAllDay] = useState(true);
  const [recurrence, setRecurrence] = useState('none');

  const fetchDates = useCallback(() => {
    api.get(`/households/${householdId}/dates`)
      .then(res => {
        setRawDates(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to fetch dates", err);
        if (showNotification) showNotification("Failed to load calendar", "error");
      });
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
      if (!d.date) return;
      const startDate = parseISO(d.date);
      if (!isValid(startDate)) return;

      // Logic for cost items vs regular date items
      if (d.type === 'cost' || d.type === 'holiday') {
        expandedEvents.push({
          id: d.id,
          title: d.title,
          start: startDate,
          end: startDate,
          allDay: true,
          resource: d,
          color: d.type === 'holiday' ? 'var(--joy-palette-warning-solidBg)' : 'var(--joy-palette-success-solidBg)'
        });
        return;
      }

      const endDate = d.end_date ? parseISO(d.end_date) : (d.is_all_day ? startDate : addDays(startDate, 0));
      if (!isValid(endDate)) return;

      const recurEnd = d.recurrenceend_date ? parseISO(d.recurrenceend_date) : limitDate;

      // EMOJI FIX: The title in expanded events was doubling the emoji.
      // We will store the title cleanly and let components handle emoji display.
      const baseEvent = {
        id: d.id,
        title: d.title, // Clean title
        allDay: Boolean(d.is_all_day),
        resource: d, // Keep full original data (includes .emoji)
      };

      if (!d.recurrence || d.recurrence === 'none') {
        expandedEvents.push({
          ...baseEvent,
          start: startDate,
          end: endDate,
        });
      } else {
        let currentStart = new Date(startDate);
        let currentEnd = new Date(endDate);
        const duration = currentEnd.getTime() - currentStart.getTime();

        let iterations = 0;
        const MAX_ITERATIONS = 1000;

        while (isValid(currentStart) && isBefore(currentStart, recurEnd) && isBefore(currentStart, limitDate) && iterations < MAX_ITERATIONS) {
           iterations++;
           const instanceEnd = new Date(currentStart.getTime() + (isNaN(duration) ? 0 : duration));

           expandedEvents.push({
             ...baseEvent,
             id: `${d.id}_${currentStart.toISOString()}`,
             start: new Date(currentStart),
             end: instanceEnd,
             originalId: d.id
           });

           switch (d.recurrence) {
             case 'daily': currentStart = addDays(currentStart, 1); break;
             case 'weekly': currentStart = addWeeks(currentStart, 1); break;
             case 'monthly': currentStart = addMonths(currentStart, 1); break;
             case 'yearly': currentStart = addYears(currentStart, 1); break;
             default: currentStart = addYears(currentStart, 100); 
           }
        }
      }
    });

    setEvents(expandedEvents);
  }, [rawDates]);


  // --- HANDLERS ---

  const handleSelectSlot = ({ start }) => {
    setEditingEvent(null);
    setSelectedEmoji('📅');
    setIsAllDay(true);
    setRecurrence('none');
    setEditingEvent({ 
        date: format(start, 'yyyy-MM-dd'),
        end_date: format(start, 'yyyy-MM-dd') 
    });
    setOpen(true);
  };

  const handleSelectEvent = (event) => {
    const original = event.resource;
    if (original.type === 'holiday' || original.type === 'cost') {
        if (showNotification) showNotification(`${original.title}: ${original.description || ''}`, "info");
        return;
    }

    setEditingEvent({
        ...original,
        date: original.date ? original.date.split('T')[0] : '', 
        end_date: original.end_date ? original.end_date.split('T')[0] : (original.date ? original.date.split('T')[0] : '')
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
    
    data.emoji = selectedEmoji;
    data.is_all_day = isAllDay ? 1 : 0;
    data.recurrence = recurrence;
    
    const method = editingEvent?.id ? 'put' : 'post';
    const url = editingEvent?.id 
        ? `/households/${householdId}/dates/${editingEvent.id}` 
        : `/households/${householdId}/dates`;

    api[method](url, data)
        .then(() => {
            setOpen(false);
            fetchDates();
            showNotification(editingEvent?.id ? "Event updated" : "Event created", "success");
        })
        .catch(err => {
            console.error(err);
            showNotification("Operation failed", "error");
        });
  };

  const handleDelete = () => {
    if (!editingEvent?.id) return;
    if (window.confirm("Delete this event? If it's recurring, all future events will be removed.")) {
      api.delete(`/households/${householdId}/dates/${editingEvent.id}`)
        .then(() => {
          setOpen(false);
          fetchDates();
          showNotification("Event deleted", "info");
        });
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      <Box sx={{ 
          mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>Calendar</Typography>
            <Typography level="body-md" color="neutral">Track events, holidays, and recurring bills.</Typography>
        </Box>
        
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', justifyContent: 'flex-end', width: { xs: '100%', md: 'auto' } }}>
            <ToggleButtonGroup 
                value={view} 
                onChange={(e, v) => v && setView(v)} 
                size="sm"
                variant="outlined"
                sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
                <Button value={CUSTOM_VIEWS.TIMELINE} startDecorator={<ListIcon />}>Timeline</Button>
                <Button value={Views.MONTH} startDecorator={<CalendarMonth />}>Month</Button>
                <Button value={Views.WEEK}>Week</Button>
                <Button value={Views.AGENDA}>Agenda</Button>
            </ToggleButtonGroup>

            <Select 
                size="sm" 
                value={view} 
                onChange={(e, v) => setView(v)}
                sx={{ display: { xs: 'flex', sm: 'none' }, minWidth: 120 }}
            >
                <Option value={CUSTOM_VIEWS.TIMELINE}>Timeline</Option>
                <Option value={Views.MONTH}>Month</Option>
                <Option value={Views.WEEK}>Week</Option>
                <Option value={Views.AGENDA}>Agenda</Option>
            </Select>

            {view !== CUSTOM_VIEWS.TIMELINE && (
                <>
                    <Button variant="outlined" size="sm" onClick={() => setDate(new Date())}>Today</Button>
                    <IconButton size="sm" variant="outlined" onClick={() => {
                        if (view === Views.MONTH) setDate(addMonths(date, -1));
                        else if (view === Views.WEEK) setDate(addWeeks(date, -1));
                        else setDate(addDays(date, -1));
                    }}><ChevronLeft /></IconButton>
                    <Typography level="title-lg" sx={{ minWidth: { xs: 120, md: 180 }, textAlign: 'center', fontSize: { xs: '0.9rem', md: '1.1rem' } }}>
                        {view === Views.MONTH ? format(date, 'MMMM yyyy') : (
                            view === Views.WEEK ? `Week of ${format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d')}` : format(date, 'MMM d, yyyy')
                        )}
                    </Typography>
                    <IconButton size="sm" variant="outlined" onClick={() => {
                        if (view === Views.MONTH) setDate(addMonths(date, 1));
                        else if (view === Views.WEEK) setDate(addWeeks(date, 1));
                        else setDate(addDays(date, 1));
                    }}><ChevronRight /></IconButton>
                </>
            )}

            <Divider orientation="vertical" sx={{ mx: 1, height: 24, display: { xs: 'none', md: 'block' } }} />
            <Button variant="solid" startDecorator={<Add />} onClick={() => handleSelectSlot({ start: new Date() })}>
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>New Event</Box>
            </Button>
        </Stack>
      </Box>

      <Sheet variant="outlined" sx={{ 
          flexGrow: 1, p: 2, borderRadius: 'md', overflow: 'hidden', 
          bgcolor: 'background.surface',
          '& .rbc-agenda-view': {
              border: 'none',
              '& .rbc-agenda-table': {
                  border: 'none',
                  '& thead': { display: 'none' },
                  '& tbody > tr': { borderBottom: '1px solid', borderColor: 'divider' },
                  '& .rbc-agenda-date-cell': { verticalAlign: 'top', width: '150px' },
                  '& .rbc-agenda-time-cell': { verticalAlign: 'top', width: '120px' }
              }
          }
      }}>
        {view === CUSTOM_VIEWS.TIMELINE ? (
            <TimelineView events={events} onSelectEvent={handleSelectEvent} isDark={isDark} />
        ) : (
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
                view={view === CUSTOM_VIEWS.TIMELINE ? Views.AGENDA : view} // Fallback safety
                onView={v => setView(v)}
                date={date}
                onNavigate={d => setDate(d)}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                popup
                toolbar={false}
                components={{
                    agenda: {
                        event: (props) => <CustomAgendaEvent {...props} isDark={isDark} />,
                        date: CustomAgendaDate,
                        time: CustomAgendaTime
                    },
                    event: ({ event }) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography level="body-xs" sx={{ color: 'inherit' }}>{event.resource?.emoji}</Typography>
                            <Typography level="body-xs" sx={{ color: 'inherit', fontWeight: 'bold' }} noWrap>{event.title}</Typography>
                        </Box>
                    )
                }}
                eventPropGetter={(event) => {
                    if (event.color) return { style: { backgroundColor: event.color, border: 'none' } };
                    return { style: { backgroundColor: 'var(--joy-palette-primary-solidBg)', border: 'none' } };
                }}
            />
        )}
      </Sheet>

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
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Tooltip title="Pick an emoji" variant="soft">
                                <IconButton onClick={() => setEmojiPickerOpen(true)} variant="outlined" sx={{ width: 48, height: 48 }}><Typography level="h3">{selectedEmoji}</Typography></IconButton>
                            </Tooltip>
                            <FormControl required sx={{ flex: 1 }}>
                                <FormLabel>Event Title</FormLabel>
                                <Input name="title" defaultValue={editingEvent?.title || ''} autoFocus />
                            </FormControl>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid xs={12}><FormControl orientation="horizontal" sx={{ gap: 1 }}><Switch checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} /><FormLabel>All-day</FormLabel></FormControl></Grid>
                            <Grid xs={6}><FormControl required><FormLabel>Start Date</FormLabel><Input name="date" type="date" defaultValue={editingEvent?.date || ''} /></FormControl></Grid>
                            <Grid xs={6}><FormControl><FormLabel>End Date</FormLabel><Input name="end_date" type="date" defaultValue={editingEvent?.end_date || ''} /></FormControl></Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid xs={6}><FormControl><FormLabel>Type</FormLabel><Select name="type" defaultValue={editingEvent?.type || 'event'}>{EVENT_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}</Select></FormControl></Grid>
                            <Grid xs={6}><FormControl><FormLabel>Recurrence</FormLabel><Select name="recurrence" value={recurrence} onChange={(e, v) => setRecurrence(v)} >{RECURRENCE_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}</Select></FormControl></Grid>
                            {recurrence !== 'none' && (<Grid xs={12}><FormControl><FormLabel>Repeat Until (Optional)</FormLabel><Input name="recurrenceend_date" type="date" defaultValue={editingEvent?.recurrenceend_date || ''} /><Typography level="body-xs" mt={0.5}>Leave blank to repeat forever</Typography></FormControl></Grid>)}
                        </Grid>
                        <FormControl><FormLabel>Notes / Description</FormLabel><Textarea name="description" defaultValue={editingEvent?.description || ''} minRows={3} /></FormControl>
                        <DialogActions sx={{ pt: 2 }}><Button variant="plain" color="neutral" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="solid">Save</Button></DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>

      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(emoji) => { setSelectedEmoji(emoji); setEmojiPickerOpen(false); }} title="Select Event Emoji" />
    </Box>
  );
}