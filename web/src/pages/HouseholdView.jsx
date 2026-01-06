import { useState } from 'react';
import { 
  Box, Typography, Grid, Card, CardActionArea, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button 
} from '@mui/material';
import { Add } from '@mui/icons-material';
import SettingsView from '../features/SettingsView';
import HomeView from '../features/HomeView';
import TotemIcon from '../components/TotemIcon';

export default function HouseholdView(props) {
  // Destructured onDeleteHousehold from props to pass it down to SettingsView
  const { view, household, households, onSelectHousehold, onCreateHousehold, currentUser, onDeleteHousehold } = props;
  
  // Dialog state for creating new households
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');

  const handleCreateSubmit = () => {
    if (newHouseName.trim()) {
      onCreateHousehold(newHouseName);
      setNewHouseName('');
      setIsDialogOpen(false);
    }
  };

  // --- DASHBOARD VIEW (Grid of Households) ---
  if (view === 'dashboard') {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: '300' }}>My Households</Typography>
        <Grid container spacing={3}>
          {households && households.map(hh => (
            <Grid item xs={12} sm={6} md={4} key={hh.id}>
              <Card elevation={3} sx={{ borderRadius: 4 }}>
                <CardActionArea onClick={() => onSelectHousehold(hh)} sx={{ p: 4, textAlign: 'center' }}>
                  <TotemIcon colorway={hh.theme} sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h5" fontWeight="bold">{hh.name}</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
          
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined" sx={{ borderStyle: 'dashed', borderRadius: 4, height: '100%' }}>
              <CardActionArea 
                onClick={() => setIsDialogOpen(true)} 
                sx={{ p: 4, textAlign: 'center', height: '100%' }}
              >
                <Add sx={{ fontSize: 40, color: 'text.secondary' }} />
                <Typography color="text.secondary">New Household</Typography>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        {/* Creation Dialog */}
        <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
          <DialogTitle>Add New Household</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Household Name"
              fullWidth
              variant="standard"
              value={newHouseName}
              onChange={(e) => setNewHouseName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} variant="contained" disabled={!newHouseName.trim()}>
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Loading state if a specific household is selected but not yet loaded
  if (!household) return <CircularProgress sx={{ display: 'block', m: 'auto', mt: 10 }} />;

  // --- FEATURE VIEWS (Inside a Household) ---
  return (
    <Box>
      {view === 'home' && (
        <HomeView household={household} members={props.members} currentUser={currentUser} />
      )}
      {view === 'settings' && (
        /* onDeleteHousehold is now available inside SettingsView via {...props} */
        <SettingsView {...props} />
      )}
    </Box>
  );
}