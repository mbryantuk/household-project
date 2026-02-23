import { useMemo, useCallback } from 'react';
import { Box, Typography, Stack, Avatar, Chip } from '@mui/joy';
import { Cake } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import { getEmojiColor } from '../../utils/colors';

export default function BirthdaysWidget({ dates, members }) {
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

  const getDaysUntilAndAge = useCallback(
    (dateStr) => {
      const originalDate = parseDate(dateStr);
      if (!originalDate) return null;

      const nextAnniversary = new Date(
        today.getFullYear(),
        originalDate.getMonth(),
        originalDate.getDate()
      );
      if (nextAnniversary < today) {
        nextAnniversary.setFullYear(today.getFullYear() + 1);
      }

      const daysUntil = Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
      const age = nextAnniversary.getFullYear() - originalDate.getFullYear();

      return { daysUntil, nextAge: age };
    },
    [today, parseDate]
  );

  const upcomingBirthdays = useMemo(() => {
    const birthdayItems = [];
    const seenMemberIds = new Set();

    (dates || [])
      .filter((d) => d.type === 'birthday')
      .forEach((d) => {
        const stats = getDaysUntilAndAge(d.date);
        if (stats) {
          let emoji = d.emoji;
          if (!emoji && d.member_id) {
            const member = members.find((m) => m.id === d.member_id);
            if (member) emoji = member.emoji;
          }

          birthdayItems.push({
            id: `date-${d.id}`,
            name: d.title.replace("'s Birthday", ''),
            emoji: emoji,
            ...stats,
          });
          if (d.member_id) seenMemberIds.add(d.member_id);
        }
      });

    (members || [])
      .filter((m) => m.dob && !seenMemberIds.has(m.id))
      .forEach((m) => {
        const stats = getDaysUntilAndAge(m.dob);
        if (stats) {
          birthdayItems.push({
            id: `member-${m.id}`,
            name: m.name,
            emoji: m.emoji,
            ...stats,
          });
        }
      });

    return birthdayItems.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);
  }, [dates, members, getDaysUntilAndAge]);

  return (
    <WidgetWrapper title="Upcoming Birthdays" icon={<Cake />} color="primary">
      {upcomingBirthdays.length > 0 ? (
        <Stack spacing={1.5}>
          {upcomingBirthdays.map((m) => (
            <Box
              key={m.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                bgcolor: 'background.level1',
                borderRadius: 'sm',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: getEmojiColor(m.emoji || (m.name ? m.name[0].toUpperCase() : '?')),
                    fontSize: '1rem',
                    fontWeight: 'bold',
                  }}
                >
                  {m.emoji || (m.name ? m.name[0].toUpperCase() : '?')}
                </Avatar>
                <Box>
                  <Typography level="body-sm" fontWeight="bold">
                    {m.name}
                  </Typography>
                  <Typography level="body-xs" color="neutral">
                    Turning {m.nextAge}
                  </Typography>
                </Box>
              </Box>
              <Chip
                size="sm"
                color={m.daysUntil < 7 ? 'danger' : 'primary'}
                variant={m.daysUntil < 7 ? 'solid' : 'outlined'}
                sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
              >
                {m.daysUntil === 0
                  ? 'Today!'
                  : m.daysUntil === 1
                    ? 'Tomorrow'
                    : `${m.daysUntil} days`}
              </Chip>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography
          level="body-sm"
          color="neutral"
          sx={{ fontStyle: 'italic', py: 2, textAlign: 'center' }}
        >
          No upcoming birthdays found.
        </Typography>
      )}
    </WidgetWrapper>
  );
}
