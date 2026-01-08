import { useState } from 'react';
import { 
  Box, Typography, Grid, Card, CardActionArea, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button 
} from '@mui/material';
import { Add } from '@mui/icons-material';
import TotemIcon from '../components/TotemIcon';

export default function Dashboard({ households, onSelectHousehold, onCreateHousehold }) {
  const [isHouseDialogOpen, setIsHouseDialogOpen] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');

  const handleCreateSubmit = () => {
    if (newHouseName.trim()) {
      onCreateHousehold(newHouseName);
      setNewHouseName('');
      setIsHouseDialogOpen(false);
    }
  };

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
              onClick={() => setIsHouseDialogOpen(true)} 
              sx={{ p: 4, textAlign: 'center', height: '100%' }}
            >
              <Add sx={{ fontSize: 40, color: 'text.secondary' }} />
              <Typography color="text.secondary">New Household</Typography>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={isHouseDialogOpen} onClose={() => setIsHouseDialogOpen(false)}>
        <DialogTitle>Add New Household</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Household Name" fullWidth variant="standard"
            value={newHouseName} onChange={(e) => setNewHouseName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsHouseDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant="contained" disabled={!newHouseName.trim()}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
