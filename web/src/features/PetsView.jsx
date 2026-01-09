import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Paper, Tabs, Tab, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Stack, Divider, CircularProgress,
  Tooltip, IconButton
} from '@mui/material';
import { 
  Shield, Delete, Restaurant, MedicalServices, Payments, Info
} from '@mui/icons-material';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import EmojiPicker from '../components/EmojiPicker';

export default function PetsView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, isDark, showNotification, confirmAction } = useOutletContext();
  const { petId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const selectedPet = useMemo(() => 
    (members || []).find(m => m.id === parseInt(petId) && m.type === 'pet'), 
  [members, petId]);

  // Use controlled state for form fields to ensure they update correctly when selection changes
  const [formData, setFormData] = useState({
    name: '', species: '', breed: '', dob: '', emoji: '🐾', notes: '',
    microchip_number: '', gender: '', pet_insurance_provider: '',
    pet_insurance_premium: 0, pet_insurance_expiry: '', food_monthly_cost: 0
  });

  useEffect(() => {
    if (selectedPet) {
      setFormData({
        name: selectedPet.name || '',
        species: selectedPet.species || '',
        breed: selectedPet.breed || '',
        dob: selectedPet.dob || '',
        emoji: selectedPet.emoji || '🐾',
        notes: selectedPet.notes || '',
        microchip_number: selectedPet.microchip_number || '',
        gender: selectedPet.gender || '',
        pet_insurance_provider: selectedPet.pet_insurance_provider || '',
        pet_insurance_premium: selectedPet.pet_insurance_premium || 0,
        pet_insurance_expiry: selectedPet.pet_insurance_expiry || '',
        food_monthly_cost: selectedPet.food_monthly_cost || 0
      });
    } else if (petId === 'new') {
      setFormData({
        name: '', species: '', breed: '', dob: '', emoji: '🐾', notes: '',
        microchip_number: '', gender: '', pet_insurance_provider: '',
        pet_insurance_premium: 0, pet_insurance_expiry: '', food_monthly_cost: 0
      });
    }
  }, [selectedPet, petId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData, type: 'pet' };

    try {
      if (petId === 'new') {
        const res = await api.post(`/households/${householdId}/members`, data);
        showNotification("Pet added.", "success");
        fetchHhMembers(householdId);
        navigate(`../${res.data.id}`);
      } else {
        await api.put(`/households/${householdId}/members/${petId}`, data);
        showNotification("Pet updated.", "success");
        fetchHhMembers(householdId);
      }
    } catch (err) {
      showNotification("Failed to save.", "error");
    }
  };

  const handleDelete = () => {
    confirmAction(
        "Remove Pet",
        `Are you sure you want to remove ${selectedPet.name}? This will delete all their nutritional and insurance data.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/members/${petId}`);
                showNotification("Pet removed.", "info");
                fetchHhMembers(householdId);
                navigate('..');
            } catch (err) {
                showNotification("Failed to delete.", "error");
            }
        }
    );
  };

  const getAutoPetEmoji = (species) => {
    const s = species?.toLowerCase();
    if (s === 'dog') return '🐶';
    if (s === 'cat') return '🐱';
    if (s === 'bird') return '🐦';
    if (s === 'fish') return '🐟';
    return '🐾';
  };

  if (petId !== 'new' && !selectedPet) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Select a pet from the menu.</Typography></Box>;
  }

  return (
    <Box key={petId}> {/* Force re-render on ID change */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="300">
            {petId === 'new' ? 'Add New Pet' : selectedPet.name}
        </Typography>
        {petId !== 'new' && isHouseholdAdmin && (
            <Button color="error" startIcon={<Delete />} onClick={handleDelete}>Remove Pet</Button>
        )}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3, minHeight: '600px', overflow: 'hidden' }}>
        {petId !== 'new' && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ px: 2 }}>
                    <Tab icon={<Info />} iconPosition="start" label="General" />
                    <Tab icon={<Shield />} iconPosition="start" label="Insurance & Health" />
                    <Tab icon={<Payments />} iconPosition="start" label="Misc Costs" />
                </Tabs>
            </Box>
        )}

        <Box sx={{ p: 4 }}>
          {(activeTab === 0 || petId === 'new') && (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={2}>
                    <Tooltip title="Pick an emoji">
                        <IconButton 
                            onClick={() => setEmojiPickerOpen(true)} 
                            sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', width: 80, height: 80 }}
                        >
                            <Typography sx={{ fontSize: '2.5rem' }}>{formData.emoji}</Typography>
                        </IconButton>
                    </Tooltip>
                </Grid>
                <Grid item xs={12} md={5}><TextField name="name" label="Pet Name" value={formData.name} onChange={handleChange} fullWidth required /></Grid>
                <Grid item xs={12} md={5}><TextField name="species" label="Species (e.g. Dog, Cat)" value={formData.species} onChange={handleChange} fullWidth required /></Grid>
                <Grid item xs={12} md={4}><TextField name="breed" label="Breed" value={formData.breed} onChange={handleChange} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField name="dob" label="Date of Birth" type="date" value={formData.dob} onChange={handleChange} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                <Grid item xs={12} md={4}><TextField name="microchip_number" label="Microchip #" value={formData.microchip_number} onChange={handleChange} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField name="gender" label="Gender" value={formData.gender} onChange={handleChange} fullWidth /></Grid>
                <Grid item xs={12}><TextField name="notes" label="Notes" value={formData.notes} onChange={handleChange} multiline rows={3} fullWidth /></Grid>
                <Grid item xs={12}>
                    <Button type="submit" variant="contained" size="large">
                        {petId === 'new' ? 'Create Pet' : 'Update General Info'}
                    </Button>
                </Grid>
              </Grid>
            </form>
          )}

          {activeTab === 1 && petId !== 'new' && (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Insurance Details</Typography>
                </Grid>
                <Grid item xs={12} md={6}><TextField name="pet_insurance_provider" label="Insurance Provider" value={formData.pet_insurance_provider} onChange={handleChange} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField name="pet_insurance_premium" label="Monthly Premium (£)" type="number" value={formData.pet_insurance_premium} onChange={handleChange} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField name="pet_insurance_expiry" label="Policy Expiry" type="date" value={formData.pet_insurance_expiry} onChange={handleChange} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Restaurant fontSize="small" /> Nutrition (Monthly Forecast)
                  </Typography>
                  <TextField name="food_monthly_cost" label="Estimated Monthly Food Cost (£)" type="number" value={formData.food_monthly_cost} onChange={handleChange} fullWidth />
                </Grid>
                <Grid item xs={12}><Button type="submit" variant="contained" size="large">Save Health & Nutrition</Button></Grid>
              </Grid>
            </form>
          )}

          {activeTab === 2 && petId !== 'new' && (
            <Box>
              <Typography variant="h6" gutterBottom>Pet-Specific Recurring Costs</Typography>
              <RecurringCostsWidget 
                api={api} 
                householdId={householdId} 
                parentType="pet" 
                parentId={petId} 
                isAdmin={isHouseholdAdmin}
                showNotification={showNotification}
              />
            </Box>
          )}
        </Box>
      </Paper>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
            setFormData(prev => ({ ...prev, emoji }));
            setEmojiPickerOpen(false);
        }}
        title="Select Pet Emoji"
      />
    </Box>
  );
}