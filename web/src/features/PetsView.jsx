import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Divider, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Grid, Tooltip, IconButton
} from '@mui/joy';
import { 
  Delete, Payments, Info, Add
} from '@mui/icons-material';
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';
import EmojiPicker from '../components/EmojiPicker';

export default function PetsView() {
  const { api, id: householdId, household, members = [], fetchHhMembers, user: currentUser, showNotification, confirmAction } = useOutletContext();
  const { petId } = useParams();

  const enabledModules = useMemo(() => {
    try {
        return household?.enabled_modules ? JSON.parse(household.enabled_modules) : ['pets', 'vehicles', 'meals'];
    } catch { return ['pets', 'vehicles', 'meals']; }
  }, [household]);

  const navigate = useNavigate();

  useEffect(() => {
    if (!enabledModules.includes('pets')) {
        navigate(`/household/${householdId}/house`, { replace: true });
    }
  }, [enabledModules, navigate, householdId]);

  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localPet, setLocalPet] = useState(null);
  
  const isAdmin = currentUser?.role === 'admin';

  const selectedPet = useMemo(() => {
    if (localPet && String(localPet.id) === String(petId)) return localPet;
    return (members || []).find(m => m.id === parseInt(petId) && m.type === 'pet');
  }, [members, petId, localPet]);

  const [formData, setFormData] = useState({
    name: '', species: '', breed: '', dob: '', emoji: '🐾', notes: '',
    microchip_number: '', gender: ''
  });

  // Fetch pet if not in members list
  useEffect(() => {
    if (petId && petId !== 'new' && !selectedPet && !loading) {
        Promise.resolve().then(() => setLoading(true));
        api.get(`/households/${householdId}/members/${petId}`)
            .then(res => setLocalPet(res.data))
            .catch(() => showNotification("Failed to load pet.", "danger"))
            .finally(() => setLoading(false));
    }
  }, [petId, selectedPet, api, householdId, loading, showNotification]);

  useEffect(() => {
    if (selectedPet) {
      const data = {
        name: selectedPet.name || '',
        species: selectedPet.species || '',
        breed: selectedPet.breed || '',
        dob: selectedPet.dob || '',
        emoji: selectedPet.emoji || '🐾',
        notes: selectedPet.notes || '',
        microchip_number: selectedPet.microchip_number || '',
        gender: selectedPet.gender || ''
      };
      Promise.resolve().then(() => setFormData(data));
    } else if (petId === 'new') {
      const data = {
        name: '', species: '', breed: '', dob: '', emoji: '🐾', notes: '',
        microchip_number: '', gender: ''
      };
      Promise.resolve().then(() => setFormData(data));
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
        setLocalPet(res.data);
        await fetchHhMembers(householdId);
        navigate(`/household/${householdId}/house`, { replace: true });
      } else {
        await api.put(`/households/${householdId}/members/${petId}`, data);
        showNotification("Pet updated.", "success");
        fetchHhMembers(householdId);
      }
     } catch {
      showNotification("Failed to save.", "danger");
    }
  };

  const handleDelete = () => {
    confirmAction(
        "Remove Pet",
        `Are you sure you want to remove ${selectedPet.name}? This will delete all their data.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/members/${petId}`);
                showNotification("Pet removed.", "neutral");
                fetchHhMembers(householdId);
                navigate('..');
             } catch {
                showNotification("Failed to delete.", "danger");
            }
        }
    );
  };

  const groupedPets = useMemo(() => {
      const pets = (members || []).filter(m => m.type === 'pet');
      const groups = {};
      pets.forEach(p => {
          const species = p.species || 'Other';
          if (!groups[species]) groups[species] = [];
          groups[species].push(p);
      });
      return groups;
  }, [members]);

  if (!petId) {
    return (
        <Box>
            <Box sx={{ 
                mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                flexWrap: 'wrap', gap: 2 
            }}>
              <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
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

            {Object.keys(groupedPets).length === 0 && (
                 <Typography level="body-lg" textAlign="center" sx={{ mt: 5, color: 'neutral.500' }}>No pets found.</Typography>
            )}

            {Object.entries(groupedPets).map(([species, pets]) => (
                <Box key={species} sx={{ mb: 4 }}>
                    <Typography level="h4" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 'sm', opacity: 0.7 }}>
                        {species}s
                    </Typography>
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
                                        <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{p.alias || (p.name || '').split(' ')[0]}</Typography>
                                        <Typography level="body-sm" color="neutral">{p.species} • {p.breed}</Typography>
                                    </Box>
                                </Sheet>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            ))}
        </Box>
    );
  }

  if (loading || (petId !== 'new' && !selectedPet)) {
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
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
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
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
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Pet Costs</Tab>
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {(activeTab === 0 || petId === 'new') && (
            <Box>
                <Box sx={{ mb: 4 }}>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                        Pet Identity
                    </Typography>
                    <Typography level="body-md" color="neutral">Core personal identification and breed background.</Typography>
                </Box>
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
                            <Input name="species" value={formData.species} onChange={handleChange} placeholder="Dog, Cat, Hamster..." />
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
            </Box>
          )}

          {activeTab === 1 && petId !== 'new' && (
            <Box>
              <RecurringChargesWidget 
                api={api} 
                householdId={householdId} 
                household={household}
                entityType="pet" 
                entityId={petId} 
                segments={[
                    { id: 'food', label: 'Food & Supplies' },
                    { id: 'insurance', label: 'Pet Insurance' },
                    { id: 'vet', label: 'Vet & Medical' },
                    { id: 'other', label: 'Other' }
                ]}
                title="Pet Recurring Costs"
                showNotification={showNotification}
                confirmAction={confirmAction}
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