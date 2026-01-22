import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Stack, Divider,
  Tooltip, IconButton, Grid
} from '@mui/joy';
import { 
  Delete, Restaurant, MedicalServices, Payments, Info, Add
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
    microchip_number: '', gender: ''
  });

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
        fetchHhMembers(householdId);
        navigate(`../pets/${res.data.id}`);
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

  if (petId !== 'new' && !selectedPet) {
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
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><MedicalServices sx={{ mr: 1 }}/> Vet & Insurance</Tab>
                    <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Restaurant sx={{ mr: 1 }}/> Food & Supplies</Tab>
                    <Tab variant={activeTab === 3 ? 'solid' : 'plain'} color={activeTab === 3 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Recurring Costs</Tab>
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
                <Box sx={{ mb: 4 }}>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                        Vet & Insurance
                    </Typography>
                    <Typography level="body-md" color="neutral">Manage recurring medical and insurance costs.</Typography>
                </Box>
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

          {activeTab === 2 && petId !== 'new' && (
            <Box>
                <Box sx={{ mb: 4 }}>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                        Food & Supplies
                    </Typography>
                    <Typography level="body-md" color="neutral">Manage recurring nutritional and supply costs.</Typography>
                </Box>
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

          {activeTab === 3 && petId !== 'new' && (
            <Box>
              <Box sx={{ mb: 4 }}>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Recurring Costs</Typography>
                <Typography level="body-md" color="neutral">Additional costs specific to this pet.</Typography>
              </Box>
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
