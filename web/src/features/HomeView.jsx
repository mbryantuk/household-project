import { useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Chip, Stack, Divider } from '@mui/material';
import { Cake, Event as EventIcon } from '@mui/icons-material';

export default function HomeView({ members, household, currentUser, dates }) {
  
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Helper to parse YYYY-MM-DD consistently without timezone shifts
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
    
    return { daysUntil, nextAge: age, dateObj: nextAnniversary };
  };

  // 🎂 BIRTHDAYS: From dates table (type=birthday) OR members table (fallback for legacy)
  const upcomingBirthdays = useMemo(() => {
    const birthdayItems = [];
    const seenMemberIds = new Set();

    // 1. Get from dates table (includes auto-synced ones)
    (dates || []).filter(d => d.type === 'birthday').forEach(d => {
      const stats = getDaysUntilAndAge(d.date);
      if (stats) {
        birthdayItems.push({
          id: `date-${d.id}`,
          name: d.title.replace("'s Birthday", ""),
          emoji: d.emoji,
          ...stats
        });
        if (d.member_id) seenMemberIds.add(d.member_id);
      }
    });

    // 2. Get from members table (legacy fallback for those without a dates entry)
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

  // 📅 EVENTS: Everything else from the dates table
  const upcomingEvents = useMemo(() => {
    return (dates || [])
      .filter(d => d.type !== 'birthday')
      .map(d => {
        const stats = getDaysUntilAndAge(d.date);
        return stats ? { ...d, daysUntil: stats.daysUntil } : null;
      })
      .filter(d => d !== null && d.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [dates, today]);

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: '300', mb: 0.5 }}>
            {greeting}, <Box component="span" sx={{ fontWeight: '700', color: 'primary.main' }}>{currentUser?.username || 'User'}</Box>
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Currently managing the <Box component="span" sx={{ fontWeight: '600', color: 'text.primary' }}>{household?.name || 'Unknown'}</Box> household.
          </Typography>
        </Box>
        {household?.avatar && (
            <Box sx={{ 
                fontSize: '3rem', 
                p: 1, 
                bgcolor: 'background.paper', 
                borderRadius: '50%', 
                boxShadow: 1, 
                width: 80, 
                height: 80, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid',
                borderColor: 'divider'
            }}>
                {household.avatar.startsWith('data:image') ? (
                    <Avatar src={household.avatar} sx={{ width: '100%', height: '100%' }} />
                ) : household.avatar}
            </Box>
        )}
      </Box>
      
      <Grid container spacing={3}>
        {/* BIRTHDAYS CARD */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ 
            borderRadius: 3, 
            borderLeft: '6px solid', 
            borderColor: 'primary.main', 
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            height: '100%'
          }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Cake color="primary" />
                <Typography variant="h6" fontWeight="bold">Upcoming Birthdays</Typography>
              </Stack>
              
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
                        bgcolor: 'action.hover', 
                        borderRadius: 2 
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                          bgcolor: 'primary.main', 
                          color: 'primary.contrastText', 
                          fontWeight: 'bold', 
                          width: 32, 
                          height: 32, 
                          fontSize: '1rem' 
                        }}>
                          {m.emoji || (m.name ? m.name[0].toUpperCase() : '?')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{m.name || 'Unknown'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Turning {m.nextAge}
                          </Typography>
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
            </CardContent>
          </Card>
        </Grid>

        {/* EVENTS CARD */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ 
            borderRadius: 3, 
            borderLeft: '6px solid', 
            borderColor: 'secondary.main', 
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            height: '100%'
          }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <EventIcon color="secondary" />
                <Typography variant="h6" fontWeight="bold">Upcoming Events</Typography>
              </Stack>
              
              {upcomingEvents.length > 0 ? (
                <Stack spacing={1.5}>
                  {upcomingEvents.map((e) => (
                    <Box 
                      key={e.id} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        p: 1.5, 
                        bgcolor: 'action.hover', 
                        borderRadius: 2 
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                            width: 32, height: 32, borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: 'secondary.main', color: 'secondary.contrastText'
                        }}>
                            {e.emoji ? (
                                <Typography sx={{ fontSize: '1rem' }}>{e.emoji}</Typography>
                            ) : (
                                <EventIcon sx={{ fontSize: '1.1rem' }} />
                            )}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{e.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        size="small" 
                        color={e.daysUntil === 0 ? "error" : "secondary"} 
                        variant={e.daysUntil === 0 ? "filled" : "outlined"}
                        label={e.daysUntil === 0 ? "Today!" : e.daysUntil === 1 ? "Tomorrow" : `${e.daysUntil} days`} 
                        sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                      />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                  No upcoming events scheduled.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
           <Card variant="outlined" sx={{ 
             borderRadius: 3, 
             p: 4,
             display: 'flex', 
             flexDirection: 'column',
             alignItems: 'center', 
             justifyContent: 'center', 
             opacity: 0.7, 
             borderStyle: 'dashed',
             minHeight: 150,
             bgcolor: 'action.hover'
           }}>
             <Typography variant="h6" color="text.secondary" gutterBottom>Household Activity</Typography>
             <Typography variant="body2" color="text.secondary">Detailed logs and resident activity will appear here in a future update.</Typography>
           </Card>
        </Grid>
      </Grid>
    </Box>
  );
}