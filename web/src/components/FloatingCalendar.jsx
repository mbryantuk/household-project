import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Box, Sheet, Typography, IconButton, Tooltip, Divider,
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  Select, Option, FormControl, FormLabel, Stack 
} from '@mui/joy';
import { 
  Close, DragIndicator, ChevronLeft, ChevronRight, Add, 
  Event, Cake, Favorite, Star, OpenInNew 
} from '@mui/icons-material';
import EmojiPicker from './EmojiPicker';
import { getEmojiColor } from '../theme';

export default function FloatingCalendar({ 
  dates = [], api, householdId, onDateAdded, currentUser, onClose, isPopout = false, isDark = false, isDocked = false, onPopout
}) {
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(true);
  const containerRef = useRef(null);

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
    const onMouseMove = (e) => { if (isDragging) setPos({ x: e.pageX - rel.x, y: e.pageY - rel.y }); };
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

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openAdd, setOpenAdd] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('📅');

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const numDays = daysInMonth(year, month);
  const firstDay = (firstDayOfMonth(year, month) + 6) % 7; 

  const days = [];
  const prevMonthDate = new Date(year, month - 1);
  const prevMonthDays = daysInMonth(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
  for (let i = firstDay - 1; i >= 0; i--) days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  for (let i = 1; i <= numDays; i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  while (days.length < 42) days.push({ date: new Date(year, month + 1, days.length - numDays - firstDay + 1), isCurrentMonth: false });

  const eventsOnSelectedDate = useMemo(() => (dates || []).filter(d => {
      const dDate = new Date(d.date);
      return dDate.getDate() === selectedDate.getDate() && dDate.getMonth() === selectedDate.getMonth() && dDate.getFullYear() === selectedDate.getFullYear();
  }), [dates, selectedDate]);

  return (
    <Sheet
      ref={containerRef} variant="outlined" tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false); }}
      sx={{
        position: isPopout ? 'relative' : 'fixed',
        left: isPopout ? 0 : (isDocked ? 'inherit' : pos.x),
        bottom: isDocked ? 0 : 'inherit',
        top: !isDocked && !isPopout ? pos.y : 'inherit',
        width: isPopout ? '100%' : 350,
        height: isPopout ? '100%' : 500,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isPopout || isDocked ? 0 : 'md',
        boxShadow: 'lg', 
        opacity: isPopout || isDocked ? 1 : (isFocused ? 1 : 0.6), 
        transition: 'opacity 0.2s'
      }}
    >
      <Box onMouseDown={onMouseDown} sx={{ p: 1, bgcolor: 'background.level2', color: 'text.primary', display: 'flex', alignItems: 'center', cursor: isDocked ? 'default' : 'move' }}>
        {!isDocked && !isPopout && <DragIndicator fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
        <Typography level="title-sm" sx={{ flexGrow: 1, color: 'inherit' }}>Calendar</Typography>
        {!isPopout && <IconButton size="sm" variant="plain" color="inherit" onClick={onPopout}><OpenInNew fontSize="inherit" /></IconButton>}
        <IconButton size="sm" variant="plain" color="inherit" onClick={onClose} sx={{ ml: 1 }}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography level="title-md" fontWeight="bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</Typography>
          <Box><IconButton size="sm" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><ChevronLeft /></IconButton><IconButton size="sm" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><ChevronRight /></IconButton></Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 1 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Typography key={i} level="body-xs" fontWeight="bold" textColor="neutral.500" textAlign="center">{d}</Typography>)}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 2 }}>
          {days.map((d, i) => {
            const isSelected = d.date.toDateString() === selectedDate.toDateString();
            return (
              <IconButton key={i} size="sm" variant={isSelected ? 'solid' : 'plain'} color={isSelected ? 'primary' : 'neutral'} onClick={() => setSelectedDate(d.date)} sx={{ opacity: d.isCurrentMonth ? 1 : 0.3 }}>
                {d.date.getDate()}
              </IconButton>
            );
          })}
        </Box>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {eventsOnSelectedDate.map(e => <Sheet key={e.id} variant="soft" sx={{ p: 1, mb: 1, borderRadius: 'sm', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>{e.emoji || '📅'}</Typography>
                <Typography level="body-xs" fontWeight="bold">{e.title}</Typography>
            </Sheet>)}
        </Box>
      </Box>
    </Sheet>
  );
}