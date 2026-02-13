import { useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Sheet, Grid, Button } from '@mui/joy';
import GenericObjectView from '../components/objects/GenericObjectView';

export default function PetsView() {
  const { api, id: householdId, household, members = [], fetchHhMembers, user: currentUser, showNotification, confirmAction } = useOutletContext();
  const { petId } = useParams();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';

  const enabledModules = useMemo(() => {
    try {
        return household?.enabled_modules ? JSON.parse(household.enabled_modules) : ['pets', 'vehicles', 'meals'];
    } catch { return ['pets', 'vehicles', 'meals']; }
  }, [household]);

  // Derived State
  const selectedPet = useMemo(() => {
    if (petId === 'new') return null;
    return (members || []).find(m => m.id === parseInt(petId) && m.type === 'pet');
  }, [members, petId]);

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

  if (!enabledModules.includes('pets')) return null;

  const FIELDS = [
    { name: 'emoji', type: 'emoji' },
    { name: 'name', label: 'Pet Name', required: true, gridSpan: { md: 5 } },
    { name: 'species', label: 'Species (e.g. Dog, Cat)', required: true, gridSpan: { md: 5 }, placeholder: "Dog, Cat, Hamster..." },
    { name: 'breed', label: 'Breed', gridSpan: { md: 4 } },
    { name: 'dob', label: 'Date of Birth', type: 'date', gridSpan: { md: 4 } },
    { name: 'microchip_number', label: 'Microchip #', gridSpan: { md: 4 } },
    { name: 'gender', label: 'Gender', gridSpan: { md: 6 } },
    { name: 'notes', label: 'Notes', gridSpan: { xs: 12 } }
  ];

  const COST_SEGMENTS = [
      { id: 'food', label: 'Food & Supplies' },
      { id: 'insurance', label: 'Pet Insurance' },
      { id: 'vet', label: 'Vet & Medical' },
      { id: 'other', label: 'Other' }
  ];

  // --- LIST VIEW ---
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
                      <Button variant="solid" onClick={() => navigate('new')}>Add Pet</Button>
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

  // --- DETAIL VIEW ---
  return (
    <GenericObjectView
        key={petId}
        type="pet" // API uses type='pet' inside members table, but we might need to handle this specially if endpoint is /members
        // Wait, the API endpoint for pets is /households/:id/members but with type='pet'.
        // My GenericObjectView posts to `endpoint`.
        // If I use `endpoint` as `/households/${householdId}/members`, it will work if I include `type: 'pet'` in data.
        id={petId}
        householdId={householdId}
        api={api}
        endpoint={`/households/${householdId}/members`}
        initialData={selectedPet}
        defaultValues={{ emoji: '🐾', type: 'pet', name: '', species: '', breed: '', dob: '', notes: '' }}
        fields={FIELDS}
        costSegments={COST_SEGMENTS}
        onSave={() => fetchHhMembers(householdId)}
        onDelete={() => {
            fetchHhMembers(householdId);
            navigate('..');
        }}
        onCancel={() => navigate('..')}
        scope={{ isAdmin, showNotification, confirmAction }}
        title={(data) => petId === 'new' ? 'Add New Pet' : data.name}
        subtitle={petId === 'new' ? 'Enter pet details below.' : 'View and manage pet information.'}
    />
  );
}
