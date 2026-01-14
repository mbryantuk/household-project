import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Select, Option, Stack, Divider,
  Tooltip, IconButton, Grid
} from '@mui/joy';
import { 
  Shield, Delete, Restaurant, MedicalServices, Payments, Info, Add
} from '@mui/icons-material';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import EmojiPicker from '../components/EmojiPicker';

export default function PetsView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, showNotification, confirmAction } = useOutletContext();
  const { petId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin';

  const selectedPet = useMemo(() => 
    (members || []).find(m => m.id === parseInt(petId) && m.type === 'pet'), 
  [members, petId]);

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
      showNotification("Failed to save.", "danger");
    }
  };

  const handleDelete = () => {
    confirmAction(
        "Remove Pet",
        `Are you sure you want to remove ${selectedPet.name}? This will delete all their nutritional and insurance data.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/members/${petId}`);
                showNotification("Pet removed.", "neutral");
                fetchHhMembers(householdId);
                navigate('..');
            } catch (err) {
                showNotification("Failed to delete.", "danger");
            }
        }
    );
  };

  if (petId !== 'new' && !selectedPet) {
    const pets = (members || []).filter(m => m.type === 'pet');
    return (
        <Box>
            <Box sx={{ 
                mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                flexWrap: 'wrap', gap: 2 
            }}>
              <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  Pets & Animals
                </Typography>
                <Typography level="body-md" color="neutral">
                  Manage your furry family members and their needs.
                </Typography>
              </Box>
              <Box>
                  {isAdmin && (
                      <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('new')}>Add Pet</Button>
                  )}
              </Box>
            </Box>
            <Grid container spacing={2}>
                {pets.map(p => (
                    <Grid xs={12} sm={6} md={4} key={p.id}>
                        <Sheet 
                            variant="outlined" 
                            sx={{ 
                                p: 2, borderRadius: 'md', display: 'flex', alignItems: 'center', gap: 2,
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                '&:hover': { bgcolor: 'background.level1' }
                            }}
                            onClick={() => navigate(String(p.id))}
                        >
                            <Box sx={{ fontSize: '2.5rem' }}>{p.emoji || '🐾'}</Box>
                            <Box>
                                <Typography level="title-md">{p.name}</Typography>
                                <Typography level="body-sm" color="neutral">{p.species} • {p.breed}</Typography>
                            </Box>
                        </Sheet>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
  }

  return (
    <Box key={petId}>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                {petId === 'new' ? 'Add New Pet' : selectedPet.name}
            </Typography>
            <Typography level="body-md" color="neutral">
                {petId === 'new' ? 'Enter pet details below.' : 'View and manage pet information.'}
            </Typography>
        </Box>
        <Box>
            {petId !== 'new' && isAdmin && (
                <Button color="danger" variant="soft" startDecorator={<Delete />} onClick={handleDelete}>Remove Pet</Button>
            )}
        </Box>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '600px', overflow: 'hidden' }}>
        {petId !== 'new' && (
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
                <TabList 
                    variant="plain" 
                    sx={{ 
                        p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2, 
                        overflow: 'auto',
                        '&::-webkit-scrollbar': { display: 'none' },
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Info sx={{ mr: 1 }}/> General</Tab>
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Shield sx={{ mr: 1 }}/> Insurance & Health</Tab>
                    <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Misc Costs</Tab>
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {(activeTab === 0 || petId === 'new') && (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid xs={12} md={2}>
                    <Tooltip title="Pick an emoji" variant="soft">
                        <IconButton 
                            onClick={() => setEmojiPickerOpen(true)} 
                            variant="outlined"
                            sx={{ width: 80, height: 80 }}
                        >
                            <Typography level="h1">{formData.emoji}</Typography>
                        </IconButton>
                    </Tooltip>
                </Grid>
                <Grid xs={12} md={5}>
                    <FormControl required>
                        <FormLabel>Pet Name</FormLabel>
                        <Input name="name" value={formData.name} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={5}>
                    <FormControl required>
                        <FormLabel>Species (e.g. Dog, Cat)</FormLabel>
                        <Input name="species" value={formData.species} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={4}>
                    <FormControl>
                        <FormLabel>Breed</FormLabel>
                        <Input name="breed" value={formData.breed} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={4}>
                    <FormControl>
                        <FormLabel>Date of Birth</FormLabel>
                        <Input name="dob" type="date" value={formData.dob} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={4}>
                    <FormControl>
                        <FormLabel>Microchip #</FormLabel>
                        <Input name="microchip_number" value={formData.microchip_number} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                    <FormControl>
                        <FormLabel>Gender</FormLabel>
                        <Input name="gender" value={formData.gender} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12}>
                    <FormControl>
                        <FormLabel>Notes</FormLabel>
                        <Input name="notes" value={formData.notes} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12}>
                    <Button type="submit" variant="solid" size="lg">
                        {petId === 'new' ? 'Create Pet' : 'Update General Info'}
                    </Button>
                </Grid>
              </Grid>
            </form>
          )}

          {activeTab === 1 && petId !== 'new' && (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid xs={12}>
                  <Typography level="title-lg">Insurance Details</Typography>
                </Grid>
                <Grid xs={12} md={6}>
                    <FormControl>
                        <FormLabel>Insurance Provider</FormLabel>
                        <Input name="pet_insurance_provider" value={formData.pet_insurance_provider} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={3}>
                    <FormControl>
                        <FormLabel>Monthly Premium (£)</FormLabel>
                        <Input name="pet_insurance_premium" type="number" value={formData.pet_insurance_premium} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={3}>
                    <FormControl>
                        <FormLabel>Policy Expiry</FormLabel>
                        <Input name="pet_insurance_expiry" type="date" value={formData.pet_insurance_expiry} onChange={handleChange} />
                    </FormControl>
                </Grid>
                
                <Grid xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography level="title-lg" startDecorator={<Restaurant />}>
                      Nutrition (Monthly Forecast)
                  </Typography>
                  <FormControl sx={{ mt: 2 }}>
                      <FormLabel>Estimated Monthly Food Cost (£)</FormLabel>
                      <Input name="food_monthly_cost" type="number" value={formData.food_monthly_cost} onChange={handleChange} />
                  </FormControl>
                </Grid>
                <Grid xs={12}>
                    <Button type="submit" variant="solid" size="lg">Save Health & Nutrition</Button>
                </Grid>
              </Grid>
            </form>
          )}

          {activeTab === 2 && petId !== 'new' && (
            <Box>
              <Typography level="title-lg" mb={2}>Pet-Specific Recurring Costs</Typography>
              <RecurringCostsWidget 
                api={api} 
                householdId={householdId} 
                parentType="pet" 
                parentId={petId} 
                isAdmin={isAdmin}
                showNotification={showNotification}
              />
            </Box>
          )}
        </Box>
      </Sheet>

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
