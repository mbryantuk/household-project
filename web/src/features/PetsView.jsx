import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, Divider
} from '@mui/material';
import { Edit, Delete, Pets, Cake, Shield, Restaurant } from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';

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
      showNotification("Pet details updated.", "success");
      fetchHhMembers(householdId);
      setEditMember(null);
    } catch (err) {
      showNotification("Failed to update pet.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this pet?")) return;
    try {
      await api.delete(`/households/${householdId}/members/${id}`);
      showNotification("Pet removed.", "info");
      fetchHhMembers(householdId);
    } catch (err) {
      showNotification("Failed to delete pet.", "error");
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
            <Button variant="contained" startIcon={<Pets />} onClick={() => {/* TODO */}}>
                Add Pet
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {pets.map(m => (
          <Grid item xs={12} key={m.id}>
            <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Avatar sx={{ 
                            bgcolor: getEmojiColor(getPetEmoji(m), isDark),
                            width: 64, height: 64, fontSize: '2rem'
                        }}>
                            {getPetEmoji(m)}
                        </Avatar>
                        <Box>
                            <Typography variant="h6">{m.name}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                <Chip label={m.species || 'Pet'} size="small" variant="outlined" />
                                {m.breed && <Chip label={m.breed} size="small" />}
                            </Stack>
                        </Box>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        {isHouseholdAdmin && (
                            <>
                                <Button size="small" startIcon={<Edit />} onClick={() => setEditMember(m)}>Edit Details</Button>
                                <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}><Delete fontSize="small" /></IconButton>
                            </>
                        )}
                    </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Shield fontSize="inherit" color="primary" /> Healthcare & Nutrition
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                        <Typography variant="body2">
                            <strong>Pet Insurance:</strong> {m.pet_insurance_provider || 'Not recorded'}
                            {m.pet_insurance_premium > 0 && ` (£${m.pet_insurance_premium}/mo)`}
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Restaurant fontSize="inherit" color="action"/> 
                            <strong>Monthly Food:</strong> £{m.food_monthly_cost || 0}
                        </Typography>
                    </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                    <RecurringCostsWidget 
                        api={api} 
                        householdId={householdId} 
                        parentType="pet" 
                        parentId={m.id} 
                        isAdmin={isHouseholdAdmin}
                        showNotification={showNotification}
                    />
                </Grid>
              </Grid>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={Boolean(editMember)} onClose={() => setEditMember(null)} fullWidth maxWidth="md">
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit {editMember?.name}</DialogTitle>
          <DialogContent dividers>
             <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}><TextField name="name" label="Pet Name" defaultValue={editMember?.name} fullWidth required /></Grid>
                <Grid item xs={12} md={6}><TextField name="species" label="Species" defaultValue={editMember?.species} fullWidth /></Grid>
                
                <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Financial & Insurance</Typography></Divider></Grid>
                
                <Grid item xs={12} md={6}><TextField name="pet_insurance_provider" label="Insurance Provider" defaultValue={editMember?.pet_insurance_provider} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="pet_insurance_premium" label="Monthly Premium (£)" type="number" defaultValue={editMember?.pet_insurance_premium} fullWidth /></Grid>
                <Grid item xs={6} md={3}><TextField name="food_monthly_cost" label="Monthly Food Cost (£)" type="number" defaultValue={editMember?.food_monthly_cost} fullWidth /></Grid>
                
                <Grid item xs={12} md={6}><TextField name="pet_insurance_expiry" label="Policy Expiry" type="date" defaultValue={editMember?.pet_insurance_expiry} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                <Grid item xs={6} md={3}><TextField name="dob" label="Date of Birth" type="date" defaultValue={editMember?.dob} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                <Grid item xs={6} md={3}><TextField name="emoji" label="Emoji" defaultValue={editMember?.emoji} fullWidth placeholder="🐾" /></Grid>

                <Grid item xs={12}><TextField name="notes" label="General Notes" defaultValue={editMember?.notes} multiline rows={2} fullWidth /></Grid>
             </Grid>
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