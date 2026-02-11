import { useMemo, useCallback } from 'react';
import { Box, Typography, Stack, Chip } from '@mui/joy';
import { Event as EventIcon } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import { getEmojiColor } from '../../theme';

export default function EventsWidget({ dates }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const parseDate = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, []);

  const getDaysUntil = useCallback((dateStr) => {
    const originalDate = parseDate(dateStr);
    if (!originalDate) return null;

    const nextAnniversary = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
    if (nextAnniversary < today) {
      nextAnniversary.setFullYear(today.getFullYear() + 1);
    }

    return Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
  }, [today, parseDate]);

  const upcomingEvents = useMemo(() => {
    return (dates || [])
      .filter(d => d.type !== 'birthday')
      .map(d => {
        const days = getDaysUntil(d.date);
        return days !== null ? { ...d, daysUntil: days } : null;
      })
      .filter(d => d !== null && d.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [dates, getDaysUntil]);

  return (
    <WidgetWrapper title="Calendar" icon={<EventIcon />} color="neutral"> 
      {upcomingEvents.length > 0 ? (
        <Stack spacing={1.5}>
          {upcomingEvents.map((e) => (
            <Box 
              key={e.id} 
              sx={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                p: 1.5, bgcolor: 'background.level1', borderRadius: 'sm' 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                    width: 32, height: 32, borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: getEmojiColor(e.emoji || '📅'), 
                    color: 'white' // Standardize text color on generated backgrounds
                }}>
                    {e.emoji ? <Typography sx={{ fontSize: '1rem' }}>{e.emoji}</Typography> : <EventIcon sx={{ fontSize: '1.1rem' }} />}
                </Box>
                <Box>
                  <Typography level="body-sm" fontWeight="bold">{e.title}</Typography>
                  <Typography level="body-xs" color="neutral">
                    {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>
              </Box>
              <Chip 
                size="sm" 
                color={e.daysUntil === 0 ? "danger" : "neutral"} 
                variant={e.daysUntil === 0 ? "solid" : "outlined"}
                sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
              >
                {e.daysUntil === 0 ? "Today!" : e.daysUntil === 1 ? "Tomorrow" : `${e.daysUntil} days`}
              </Chip>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography level="body-sm" color="neutral" sx={{ fontStyle: 'italic', py: 2, textAlign: 'center' }}>
          No upcoming events scheduled.
        </Typography>
      )}
    </WidgetWrapper>
  );
}
