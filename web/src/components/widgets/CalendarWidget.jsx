import React, { useState, useMemo } from 'react';
import { 
  Box, Typography, IconButton, Divider, Sheet, Stack
} from '@mui/joy';
import { 
  ChevronLeft, ChevronRight, CalendarMonth
} from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

export default function CalendarWidget({ dates = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      return dDate.getDate() === selectedDate.getDate() && 
             dDate.getMonth() === selectedDate.getMonth() && 
             dDate.getFullYear() === selectedDate.getFullYear();
  }), [dates, selectedDate]);

  return (
    <WidgetWrapper title="Calendar" icon={<CalendarMonth />} color="danger">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography level="title-sm" fontWeight="bold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Typography>
        <Box>
          <IconButton size="sm" variant="plain" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
            <ChevronLeft fontSize="small" />
          </IconButton>
          <IconButton size="sm" variant="plain" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', mb: 1 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Typography key={i} level="body-xs" fontWeight="bold" textColor="neutral.500" textAlign="center">
            {d}
          </Typography>
        ))}
        {days.map((d, i) => {
          const isSelected = d.date.toDateString() === selectedDate.toDateString();
          const hasEvents = (dates || []).some(ev => {
              const evDate = new Date(ev.date);
              return evDate.toDateString() === d.date.toDateString();
          });

          return (
            <IconButton 
              key={i} 
              size="sm" 
              variant={isSelected ? 'solid' : 'plain'} 
              color={isSelected ? 'primary' : 'neutral'} 
              onClick={() => setSelectedDate(d.date)} 
              sx={{ 
                opacity: d.isCurrentMonth ? 1 : 0.3,
                minHeight: 28, height: 28, width: '100%',
                position: 'relative'
              }}
            >
              <Typography level="body-xs" textColor="inherit">{d.date.getDate()}</Typography>
              {hasEvents && !isSelected && (
                  <Box sx={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', bgcolor: 'danger.solidBg' }} />
              )}
            </IconButton>
          );
        })}
      </Box>

      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
        {eventsOnSelectedDate.length > 0 ? (
          <Stack spacing={0.5}>
            {eventsOnSelectedDate.map(e => (
              <Sheet 
                key={e.id} 
                variant="soft" 
                sx={{ p: 0.5, px: 1, borderRadius: 'xs', display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Typography sx={{ fontSize: '0.9rem' }}>{e.emoji || '📅'}</Typography>
                <Typography level="body-xs" fontWeight="bold" noWrap>{e.title}</Typography>
              </Sheet>
            ))}
          </Stack>
        ) : (
          <Typography level="body-xs" color="neutral" sx={{ textAlign: 'center', py: 1, fontStyle: 'italic' }}>
            No events
          </Typography>
        )}
      </Box>
    </WidgetWrapper>
  );
}
