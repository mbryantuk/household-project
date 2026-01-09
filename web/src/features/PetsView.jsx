import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, List, ListItem, ListItemButton, ListItemText, 
  ListItemIcon, Avatar, Paper, Tabs, Tab, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Pets as PetIcon, Shield, Add, Edit, Delete, 
  Restaurant, MedicalServices, Payments, Info
} from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';

export default function PetsView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, isDark, showNotification } = useOutletContext();
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isAdding, setIsNew] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const pets = useMemo(() => 
    (members || []).filter(m => m.type === 'pet'), 
  [members]);

  useMemo(() => {
    if (pets.length > 0 && !selectedId) setSelectedId(pets[0].id);
  }, [pets, selectedId]);

  const selectedPet = pets.find(p => p.id === selectedId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.type = 'pet'; // Always force pet type here
    try {
      if (isAdding) {
        await api.post(`/households/${householdId}/members`, data);
        showNotification("Pet added.", "success");
      } else {
        await api.put(`/households/${householdId}/members/${selectedId}`, data);
        showNotification("Pet updated.", "success");
      }
      fetchHhMembers(householdId);
      setIsNew(false);
    } catch (err) {
      showNotification("Failed to save.", "error");
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
    <Box sx={{ height: '100%' }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        {/* LEFT SELECTION */}
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ borderRadius: 3, height: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover' }}>
              <Typography variant="h6" fontWeight="bold">Pets</Typography>
              {isHouseholdAdmin && (
                <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setIsNew(true)}>Add</Button>
              )}
            </Box>
            <List sx={{ pt: 0 }}>
              {pets.map(p => (
                <ListItem key={p.id} disablePadding divider>
                  <ListItemButton 
                    selected={selectedId === p.id} 
                    onClick={() => { setSelectedId(p.id); setActiveTab(0); }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: getEmojiColor(getPetEmoji(p), isDark), width: 32, height: 32 }}>
                        {getPetEmoji(p)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText primary={p.name} secondary={p.species || 'PET'} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* RIGHT DETAILS */}
        <Grid item xs={12} md={9}>
          {!selectedPet ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Select a pet to view their asset register.</Typography>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 3, minHeight: '600px' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ px: 2 }}>
                  <Tab icon={<Info />} iconPosition="start" label="General" />
                  <Tab icon={<Shield />} iconPosition="start" label="Insurance & Health" />
                  <Tab icon={<Payments />} iconPosition="start" label="Misc Costs" />
                </Tabs>
              </Box>

              <Box sx={{ p: 4 }}>
                {activeTab === 0 && (
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}><TextField name="name" label="Pet Name" defaultValue={selectedPet.name} fullWidth required /></Grid>
                      <Grid item xs={12} md={6}><TextField name="species" label="Species (e.g. Dog, Cat)" defaultValue={selectedPet.species} fullWidth /></Grid>
                      <Grid item xs={12} md={4}><TextField name="breed" label="Breed" defaultValue={selectedPet.breed} fullWidth /></Grid>
                      <Grid item xs={12} md={4}><TextField name="dob" label="Date of Birth" type="date" defaultValue={selectedPet.dob} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                      <Grid item xs={12} md={4}><TextField name="emoji" label="Emoji" defaultValue={selectedPet.emoji} fullWidth placeholder="🐶" /></Grid>
                      <Grid item xs={12} md={6}><TextField name="microchip_number" label="Microchip #" defaultValue={selectedPet.microchip_number} fullWidth /></Grid>
                      <Grid item xs={12} md={6}><TextField name="gender" label="Gender" defaultValue={selectedPet.gender} fullWidth /></Grid>
                      <Grid item xs={12}><TextField name="notes" label="Notes" defaultValue={selectedPet.notes} multiline rows={3} fullWidth /></Grid>
                      <Grid item xs={12}><Button type="submit" variant="contained">Update General Info</Button></Grid>
                    </Grid>
                  </form>
                )}

                {activeTab === 1 && (
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MedicalServices fontSize="small" /> Insurance Details
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}><TextField name="pet_insurance_provider" label="Insurance Provider" defaultValue={selectedPet.pet_insurance_provider} fullWidth /></Grid>
                      <Grid item xs={12} md={3}><TextField name="pet_insurance_premium" label="Monthly Premium (£)" type="number" defaultValue={selectedPet.pet_insurance_premium} fullWidth /></Grid>
                      <Grid item xs={12} md={3}><TextField name="pet_insurance_expiry" label="Expiry Date" type="date" defaultValue={selectedPet.pet_insurance_expiry} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                      
                      <Grid item xs={12} sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Restaurant fontSize="small" /> Nutrition (Monthly Forecast)
                        </Typography>
                        <TextField name="food_monthly_cost" label="Estimated Monthly Food Cost (£)" type="number" defaultValue={selectedPet.food_monthly_cost} fullWidth />
                      </Grid>
                      <Grid item xs={12}><Button type="submit" variant="contained">Save Health & Nutrition</Button></Grid>
                    </Grid>
                  </form>
                )}

                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Pet-Specific Recurring Costs</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Record recurring costs like grooming, vet subscriptions, or special medication for {selectedPet.name}.</Typography>
                    <RecurringCostsWidget 
                      api={api} 
                      householdId={householdId} 
                      parentType="pet" 
                      parentId={selectedPet.id} 
                      isAdmin={isHouseholdAdmin}
                      showNotification={showNotification}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* ADD DIALOG */}
      <Dialog open={isAdding} onClose={() => setIsNew(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
            <DialogTitle>Add New Pet</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField name="name" label="Pet Name" fullWidth required />
                    <TextField name="species" label="Species (e.g. Dog, Cat)" fullWidth required />
                    <TextField name="breed" label="Breed" fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setIsNew(false)}>Cancel</Button>
                <Button type="submit" variant="contained">Create Pet</Button>
            </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
