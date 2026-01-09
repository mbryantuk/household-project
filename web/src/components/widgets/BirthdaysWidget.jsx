import { useMemo } from 'react';
import { Box, Typography, Stack, Avatar, Chip, useTheme } from '@mui/material';
import { Cake } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import { getEmojiColor } from '../../theme';

export default function BirthdaysWidget({ dates, members }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const getDaysUntilAndAge = (dateStr) => {
    const originalDate = parseDate(dateStr);
    if (!originalDate) return null;

    const nextAnniversary = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
    if (nextAnniversary < today) {
      nextAnniversary.setFullYear(today.getFullYear() + 1);
    }

    const daysUntil = Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
    const age = nextAnniversary.getFullYear() - originalDate.getFullYear();
    
    return { daysUntil, nextAge: age };
  };

  const upcomingBirthdays = useMemo(() => {
    const birthdayItems = [];
    const seenMemberIds = new Set();

    (dates || []).filter(d => d.type === 'birthday').forEach(d => {
      const stats = getDaysUntilAndAge(d.date);
      if (stats) {
        let emoji = d.emoji;
        if (!emoji && d.member_id) {
          const member = members.find(m => m.id === d.member_id);
          if (member) emoji = member.emoji;
        }

        birthdayItems.push({
          id: `date-${d.id}`,
          name: d.title.replace("'s Birthday", ""),
          emoji: emoji,
          ...stats
        });
        if (d.member_id) seenMemberIds.add(d.member_id);
      }
    });

    (members || []).filter(m => m.dob && !seenMemberIds.has(m.id)).forEach(m => {
      const stats = getDaysUntilAndAge(m.dob);
      if (stats) {
        birthdayItems.push({
          id: `member-${m.id}`,
          name: m.name,
          emoji: m.emoji,
          ...stats
        });
      }
    });

    return birthdayItems
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [dates, members, today]);

  return (
    <WidgetWrapper title="Upcoming Birthdays" icon={<Cake />} color="primary">
      {upcomingBirthdays.length > 0 ? (
        <Stack spacing={1.5}>
          {upcomingBirthdays.map((m) => (
            <Box 
              key={m.id} 
              sx={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                p: 1.5, bgcolor: 'action.hover', borderRadius: 2 
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ 
                    bgcolor: getEmojiColor(m.emoji || (m.name ? m.name[0].toUpperCase() : '?'), isDark), 
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)', 
                    width: 32, height: 32, fontSize: '1rem', fontWeight: 'bold' 
                }}>
                  {m.emoji || (m.name ? m.name[0].toUpperCase() : '?')}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight="bold">{m.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Turning {m.nextAge}</Typography>
                </Box>
              </Box>
              <Chip 
                size="small" 
                color={m.daysUntil < 7 ? "error" : "primary"} 
                variant={m.daysUntil < 7 ? "filled" : "outlined"}
                label={m.daysUntil === 0 ? "Today!" : m.daysUntil === 1 ? "Tomorrow" : `${m.daysUntil} days`} 
                sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
              />
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2, textAlign: 'center' }}>
          No upcoming birthdays found.
        </Typography>
      )}
    </WidgetWrapper>
  );
}
