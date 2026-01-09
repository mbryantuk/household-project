import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip
} from '@mui/material';
import { Edit, Delete, Pets, Cake } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function PetsView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, isDark, showNotification } = useOutletContext();
  const [editMember, setEditMember] = useState(null);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const pets = useMemo(() => 
    (members || []).filter(m => m.type === 'pet'), 
  [members]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      await api.put(`/households/${householdId}/members/${editMember.id}`, data);
      showNotification("Pet updated.", "success");
      fetchHhMembers(householdId);
      setEditMember(null);
    } catch (err) {
      showNotification("Failed to update.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this pet?")) return;
    try {
      await api.delete(`/households/${householdId}/members/${id}`);
      showNotification("Pet removed.", "info");
      fetchHhMembers(householdId);
    } catch (err) {
      showNotification("Failed to delete.", "error");
    }
  };

  const getPetEmoji = (m) => {
    if (m.emoji) return m.emoji;
    const species = m.species?.toLowerCase();
    switch(species) {
        case 'dog': return '🐶';
        case 'cat': return '🐱';
        case 'hamster': return '🐹';
        case 'bird': return '🐦';
        case 'fish': return '🐟';
        default: return '🐾';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="300">Pets</Typography>
        {isHouseholdAdmin && (
            <Button variant="contained" startIcon={<Pets />} onClick={() => {/* TODO: Add new */}}>
                Add Pet
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {pets.map(m => (
          <Grid item xs={12} sm={6} md={4} key={m.id}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardHeader
                avatar={
                  <Avatar sx={{ 
                    bgcolor: getEmojiColor(getPetEmoji(m), isDark),
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)',
                    width: 48, height: 48, fontSize: '1.5rem'
                  }}>
                    {getPetEmoji(m)}
                  </Avatar>
                }
                title={<Typography variant="h6">{m.name}</Typography>}
                subheader={
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip label={m.species || 'PET'} size="small" variant="outlined" />
                        {m.breed && <Chip label={m.breed} size="small" />}
                    </Stack>
                }
                action={isHouseholdAdmin && (
                  <Box>
                    <IconButton size="small" onClick={() => setEditMember(m)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                )}
              />
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={Boolean(editMember)} onClose={() => setEditMember(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit {editMember?.name}</DialogTitle>
          <DialogContent dividers>
             <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField name="name" label="Name" defaultValue={editMember?.name} fullWidth required />
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <TextField name="species" label="Species" defaultValue={editMember?.species} fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField name="breed" label="Breed" defaultValue={editMember?.breed} fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField name="dob" label="DOB" type="date" defaultValue={editMember?.dob} fullWidth InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField name="microchip_number" label="Microchip #" defaultValue={editMember?.microchip_number} fullWidth />
                    </Grid>
                </Grid>
                <TextField name="notes" label="Notes" defaultValue={editMember?.notes} multiline rows={3} fullWidth />
             </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditMember(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
