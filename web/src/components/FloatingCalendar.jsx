import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Box, Sheet, Typography, IconButton, Button, Tooltip, Divider,
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  Select, Option, FormControl, FormLabel, Stack 
} from '@mui/joy';
import { 
  Close, DragIndicator, ChevronLeft, ChevronRight, Add, 
  Event, Cake, Favorite, Star, OpenInNew 
} from '@mui/icons-material';
import EmojiPicker from './EmojiPicker';
import { getEmojiColor } from '../theme';

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: <Cake fontSize="small" /> },
  { value: 'anniversary', label: 'Anniversary', icon: <Favorite fontSize="small" /> },
  { value: 'holiday', label: 'Holiday', icon: <Star fontSize="small" /> },
  { value: 'other', label: 'Event', icon: <Event fontSize="small" /> },
];

export default function FloatingCalendar({ 
  dates = [], api, householdId, onDateAdded, currentUser, onClose, isPopout = false 
}) {
  // --- Dragging State & Logic ---
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef(null);

  const onMouseDown = (e) => {
    if (isPopout) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    // Calculate click offset relative to the container
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

  // --- Calendar State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openAdd, setOpenAdd] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('📅');

  const canEdit = currentUser?.role !== 'viewer';

  // --- Calendar Helpers ---
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
  const firstDay = (firstDaySun + 6) % 7; 

  const prevMonthDate = new Date(year, month - 1);
  const prevMonthDays = daysInMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth());

  const days = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= numDays; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  const eventsOnSelectedDate = useMemo(() => {
    return (dates || []).filter(d => {
      const dDate = new Date(d.date);
      return dDate.getDate() === selectedDate.getDate() &&
             dDate.getMonth() === selectedDate.getMonth() &&
             dDate.getFullYear() === selectedDate.getFullYear();
    });
  }, [dates, selectedDate]);

  const hasEvent = (date) => {
    if (!date) return false;
    return (dates || []).some(d => {
      const dDate = new Date(d.date);
      return dDate.getDate() === date.getDate() &&
             dDate.getMonth() === date.getMonth() &&
             dDate.getFullYear() === date.getFullYear();
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
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
      .catch((err) => console.error("Failed to add event", err));
  };

  const handlePopout = () => {
    // Open a new window that points to /calendar-window
    // Pass current date? No, popout will load defaults or we could pass via query params but keeping it simple.
    window.open('/calendar-window', 'TotemCalendar', 'width=420,height=600,menubar=no,toolbar=no,location=no,status=no');
    onClose();
  };

  return (
    <Sheet
      ref={containerRef}
      variant="outlined"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        // Only lose focus if moving outside the container (and not into a portal like the modal)
        if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false);
      }}
      tabIndex={0} // Make focusable
      sx={{
        position: isPopout ? 'relative' : 'fixed',
        left: isPopout ? 0 : pos.x,
        top: isPopout ? 0 : pos.y,
        width: isPopout ? '100%' : 400,
        height: isPopout ? '100%' : 'auto',
        minHeight: 500,
        zIndex: 1200, 
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout ? 0 : 'md',
        boxShadow: isFocused ? 'lg' : 'sm',
        borderColor: isFocused ? 'primary.500' : 'divider',
        transition: 'opacity 0.2s',
        opacity: isPopout ? 1 : (isFocused ? 1 : 0.6), // Always 1 if popout
        bgcolor: 'background.surface',
        '&:hover': { opacity: 1 }
      }}
    >
      {/* --- Header (Draggable) --- */}
      <Box 
        onMouseDown={onMouseDown}
        sx={{ 
          p: 1, 
          bgcolor: isFocused ? 'primary.solidBg' : 'background.surface', 
          color: isFocused ? 'primary.solidColor' : 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex', 
          alignItems: 'center', 
          cursor: isPopout ? 'default' : 'move',
          userSelect: 'none',
          borderTopLeftRadius: isPopout ? 0 : 'md',
          borderTopRightRadius: isPopout ? 0 : 'md'
        }}
      >
        {!isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <Typography level="title-sm" sx={{ flexGrow: 1, color: 'inherit' }}>Calendar</Typography>
        
        {!isPopout && (
            <Tooltip title="Pop out" variant="soft">
                <IconButton size="sm" variant="plain" color="inherit" onClick={handlePopout}><OpenInNew fontSize="inherit" /></IconButton>
            </Tooltip>
        )}
        {!isPopout && (
            <IconButton size="sm" variant="plain" color="inherit" onClick={onClose} sx={{ ml: 1 }}>
              <Close fontSize="small" />
            </IconButton>
        )}
      </Box>

      {/* --- Content --- */}
      <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography level="h4" fontWeight="bold">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Typography>
          <Box>
            <IconButton size="sm" onClick={handlePrevMonth}><ChevronLeft /></IconButton>
            <IconButton size="sm" onClick={handleNextMonth}><ChevronRight /></IconButton>
          </Box>
        </Box>

        {/* Days Header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 1 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
            <Typography key={idx} level="body-xs" fontWeight="bold" textColor="neutral.500" textAlign="center">
              {d}
            </Typography>
          ))}
        </Box>
        
        {/* Calendar Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 2 }}>
          {days.map((dayObj, i) => {
            const { date, isCurrentMonth } = dayObj;
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const today = isToday(date);

            return (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <IconButton 
                    size="sm" 
                    onClick={() => {
                      setSelectedDate(date);
                      if (!isCurrentMonth) setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
                    }}
                    variant={isSelected ? 'solid' : (today ? 'outlined' : 'plain')}
                    color={isSelected ? 'primary' : (today ? 'primary' : 'neutral')}
                    sx={{ 
                      width: 32, height: 32, fontSize: '0.85rem',
                      opacity: isCurrentMonth ? 1 : 0.4,
                      position: 'relative',
                      borderRadius: '50%'
                    }}
                  >
                    {date.getDate()}
                    {hasEvent(date) && (
                      <Box sx={{ 
                        position: 'absolute', bottom: 4, width: 4, height: 4, 
                        borderRadius: '50%', bgcolor: isSelected ? 'common.white' : 'primary.500' 
                      }} />
                    )}
                  </IconButton>
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Selected Date & Events */}
        <Box sx={{ flexGrow: 1, minHeight: 100, overflowY: 'auto', maxHeight: 200 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, position: 'sticky', top: 0, bgcolor: 'background.surface', zIndex: 1 }}>
            <Typography level="title-sm">
              {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </Typography>
            {canEdit && (
              <Tooltip title="Add Event" variant="soft">
                <IconButton size="sm" color="primary" onClick={() => setOpenAdd(true)}><Add /></IconButton>
              </Tooltip>
            )}
          </Box>
          
          {eventsOnSelectedDate.length > 0 ? (
            <Stack spacing={1}>
              {eventsOnSelectedDate.map(e => (
                <Sheet key={e.id} variant="soft" sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 'sm' }}>
                  <Box sx={{ 
                      width: 24, height: 24, 
                      borderRadius: '50%', 
                      bgcolor: getEmojiColor(e.emoji || '📅'), 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem',
                      flexShrink: 0
                  }}>
                      {e.emoji || '📅'}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="body-sm" noWrap fontWeight="bold">{e.title}</Typography>
                    {e.description && <Typography level="body-xs" noWrap>{e.description}</Typography>}
                  </Box>
                </Sheet>
              ))}
            </Stack>
          ) : (
            <Typography level="body-xs" color="neutral" sx={{ fontStyle: 'italic', textAlign: 'center', display: 'block', mt: 2 }}>
              No events today
            </Typography>
          )}
        </Box>
      </Box>

      {/* --- Add Event Modal --- */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)}>
        <ModalDialog maxWidth="sm" sx={{ zIndex: 1300 }}>
            <DialogTitle>Add Event</DialogTitle>
            <DialogContent>
                <form onSubmit={handleAddSubmit}>
                    <Stack spacing={2} mt={1}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <IconButton onClick={() => setEmojiPickerOpen(true)} variant="outlined" sx={{ width: 48, height: 48 }}>
                                <Typography level="h3">{selectedEmoji}</Typography>
                            </IconButton>
                            <FormControl required sx={{ flexGrow: 1 }}>
                                <FormLabel>Title</FormLabel>
                                <Input name="title" autoFocus />
                            </FormControl>
                        </Box>
                        
                        <FormControl>
                            <FormLabel>Type</FormLabel>
                            <Select name="type" defaultValue="other">
                                {EVENT_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Notes</FormLabel>
                            <Input name="description" />
                        </FormControl>

                        <DialogActions>
                            <Button variant="plain" color="neutral" onClick={() => setOpenAdd(false)}>Cancel</Button>
                            <Button type="submit" variant="solid">Add</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>

      {/* --- Emoji Picker --- */}
      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
            setSelectedEmoji(emoji);
            setEmojiPickerOpen(false);
        }}
        title="Select Event Emoji"
      />
    </Sheet>
  );
}
