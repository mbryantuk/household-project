import { Box, Typography, Grid, Avatar } from '@mui/material';
import BirthdaysWidget from '../components/widgets/BirthdaysWidget';
import EventsWidget from '../components/widgets/EventsWidget';

export default function HomeView({ members, household, currentUser, dates }) {
  
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
        {/* WIDGETS */}
        <Grid item xs={12} md={6}>
          <BirthdaysWidget dates={dates} members={members} />
        </Grid>
        <Grid item xs={12} md={6}>
          <EventsWidget dates={dates} />
        </Grid>

        {/* Placeholder for future widgets */}
        <Grid item xs={12}>
           <Box sx={{ 
             borderRadius: 3, 
             p: 4,
             display: 'flex', 
             flexDirection: 'column',
             alignItems: 'center', 
             justifyContent: 'center', 
             opacity: 0.7, 
             border: '2px dashed',
             borderColor: 'divider',
             minHeight: 150,
             bgcolor: 'action.hover'
           }}>
             <Typography variant="h6" color="text.secondary" gutterBottom>Add more widgets</Typography>
             <Typography variant="body2" color="text.secondary">Customize your dashboard with more tools in a future update.</Typography>
           </Box>
        </Grid>
      </Grid>
    </Box>
  );
}