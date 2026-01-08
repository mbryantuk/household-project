import { useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Chip, Stack } from '@mui/material';
import { Cake } from '@mui/icons-material';

export default function HomeView({ members, household, currentUser }) {
  
  // Logical calculation for upcoming birthdays
  const today = new Date();
  const upcomingBirthdays = (members || [])
    .filter(m => m.dob && m.name) 
    .map(m => {
      const birthDate = new Date(m.dob);
      const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
      const age = nextBirthday.getFullYear() - birthDate.getFullYear();

      return { ...m, daysUntil, nextAge: age };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5); 

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: '300', mb: 1 }}>
        {greeting}, <Box component="span" sx={{ fontWeight: '700', color: 'primary.main' }}>{currentUser?.username || 'User'}</Box>
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Currently managing the <Box component="span" sx={{ fontWeight: '600', color: 'text.primary' }}>{household?.name || 'Unknown'}</Box> household.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <Card variant="outlined" sx={{ 
            borderRadius: 3, 
            borderLeft: '6px solid', 
            borderColor: 'primary.main', 
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
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
                          color: 'white', 
                          fontWeight: 'bold', 
                          width: 32, 
                          height: 32, 
                          fontSize: '0.9rem' 
                        }}>
                          {/* Crash Prevention: Optional chaining and fallback */}
                          {m.name ? m.name[0].toUpperCase() : '?'}
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

        <Grid item xs={12} md={6} lg={8}>
           <Card variant="outlined" sx={{ 
             borderRadius: 3, 
             height: '100%', 
             display: 'flex', 
             flexDirection: 'column',
             alignItems: 'center', 
             justifyContent: 'center', 
             opacity: 0.5, 
             borderStyle: 'dashed',
             minHeight: 200
           }}>
             <Typography variant="h6" color="text.secondary">House Overview</Typography>
             <Typography variant="body2" color="text.secondary">Your activity feed and task lists will appear here.</Typography>
           </Card>
        </Grid>
      </Grid>
    </Box>
  );
}