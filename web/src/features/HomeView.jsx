import { Box, Typography, Grid, Stack, Button } from '@mui/joy';
import Add from '@mui/icons-material/Add';
import Tune from '@mui/icons-material/Tune';
import { useHousehold } from '../contexts/HouseholdContext';

// Import existing widgets
import WealthWidget from '../components/widgets/WealthWidget';
import BudgetStatusWidget from '../components/widgets/BudgetStatusWidget';
import CalendarWidget from '../components/widgets/CalendarWidget';
import NotesWidget from '../components/widgets/NotesWidget';
import VehiclesWidget from '../components/widgets/VehiclesWidget';
import PensionsWidget from '../components/widgets/PensionsWidget';
import EventsWidget from '../components/widgets/EventsWidget';
import ErrorBoundary from '../components/ErrorBoundary';

const GridItem = ({ children, sx = {} }) => (
  <Box sx={{ height: '100%', minHeight: 0, ...sx }}>
    <ErrorBoundary>{children}</ErrorBoundary>
  </Box>
);

export default function HomeView() {
  const { user, household, api, members, dates, onUpdateProfile } = useHousehold();
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 3, p: { xs: 1, md: 2 } }}>
      
      {/* 1. Header Section */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg' }}>{greeting}, {user?.first_name || 'Friend'}</Typography>
          <Typography level="body-md" color="neutral">{dateStr} • {household?.name}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
           <Button variant="outlined" startDecorator={<Tune />} size="sm">Customize</Button>
           <Button startDecorator={<Add />} size="sm">Quick Add</Button>
        </Stack>
      </Stack>

      {/* 2. The Bento Grid */}
      <Grid container spacing={2}>
        
        {/* Priority 1: Money Status (Budget) */}
        <Grid xs={12} md={4}>
           <GridItem><BudgetStatusWidget compact api={api} household={household} /></GridItem>
        </Grid>

        {/* Priority 2: Immediate Schedule (Next Event) */}
        <Grid xs={12} md={4}>
           <GridItem><EventsWidget limit={1} variant="hero" dates={dates} members={members} /></GridItem>
        </Grid>

        {/* Priority 3: Total Wealth Snapshot */}
        <Grid xs={12} md={4}>
           <GridItem><WealthWidget variant="summary" api={api} household={household} /></GridItem>
        </Grid>

        {/* 3. The "Main Stage" - Deep Interaction */}
        <Grid xs={12} lg={8} sx={{ minHeight: 400 }}>
           <GridItem><CalendarWidget dates={dates} members={members} api={api} household={household} /></GridItem>
        </Grid>

        {/* 4. The "Sidekick" - Quick Lists */}
        <Grid xs={12} lg={4}>
           <Stack spacing={2} sx={{ height: '100%' }}>
              <Box sx={{ flex: 1 }}><NotesWidget user={user} onUpdateProfile={onUpdateProfile} /></Box>
           </Stack>
        </Grid>

        {/* 5. The "Archive" - Slow Moving Data */}
        <Grid xs={12} md={6} lg={4}>
           <GridItem><PensionsWidget api={api} household={household} /></GridItem>
        </Grid>
        <Grid xs={12} md={6} lg={4}>
           <GridItem><VehiclesWidget api={api} household={household} /></GridItem>
        </Grid>
        <Grid xs={12} md={6} lg={4}>
           <GridItem><NotesWidget title="Quick Pad" /></GridItem>
        </Grid>

      </Grid>
    </Box>
  );
}