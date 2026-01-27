import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Grid, Avatar, CircularProgress, Card, IconButton
} from '@mui/joy';
import { 
  Delete, Add, Info, Payments, PhotoCamera
} from '@mui/icons-material';
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

export default function PetsView() {
  const { api, id: householdId, household, user: currentUser, showNotification, confirmAction, fetchHhMembers: refreshSidebar } = useOutletContext();
  const { petId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🐾');
  
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  const fetchPetsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/members`);
      setPets((res.data || []).filter(m => m.type === 'pet'));
    } catch (err) {
      console.error("Failed to fetch pets", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  const selectedPet = useMemo(() => 
    pets.find(p => p.id === parseInt(petId)), 
  [pets, petId]);

  useEffect(() => {
    if (selectedPet) {
        setSelectedEmoji(selectedPet.emoji || '🐾');
    } else if (petId === 'new') {
        setSelectedEmoji('🐾');
    }
  }, [selectedPet, petId]);

  useEffect(() => { fetchPetsList(); }, [fetchPetsList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    data.type = 'pet';

    try {
      if (petId === 'new') {
        const res = await api.post(`/households/${householdId}/members`, data);
        showNotification("Pet added.", "success");
        refreshSidebar(householdId);
        navigate(`../pets/${res.data.id}`);
      } else {
        await api.put(`/households/${householdId}/members/${petId}`, data);
        showNotification("Pet updated.", "success");
        fetchPetsList();
        refreshSidebar(householdId);
      }
    } catch {
      showNotification("Error saving pet.", "danger");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  if (petId !== 'new' && !selectedPet) {
    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography level="h2">Pets</Typography>
                <Typography level="body-md" color="neutral">Your animal companions.</Typography>
              </Box>
              {isAdmin && <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('new')}>Add Pet</Button>}
            </Box>
            <Grid container spacing={2}>
                {pets.map(p => (
                    <Grid xs={12} sm={6} md={4} key={p.id}>
                        <Card variant="outlined" sx={{ flexDirection: 'row', gap: 2, alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(String(p.id))}>
                            <Avatar size="lg" sx={{ bgcolor: getEmojiColor(p.emoji) }}>{p.emoji}</Avatar>
                            <Box>
                                <Typography level="title-md">{p.name}</Typography>
                                <Typography level="body-xs">{p.species || 'Pet'}</Typography>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
  }

  return (
    <Box key={petId}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography level="h2">{petId === 'new' ? 'Add New Pet' : selectedPet.name}</Typography>
        {petId !== 'new' && isAdmin && (
            <Button color="danger" variant="soft" startDecorator={<Delete />} onClick={() => confirmAction("Remove Pet", "Are you sure?", () => api.delete(`/households/${householdId}/members/${petId}`).then(() => navigate('..')))}>Remove</Button>
        )}
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '500px', overflow: 'hidden' }}>
        {petId !== 'new' && (
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
                <TabList variant="plain" sx={{ p: 1, gap: 1, bgcolor: 'background.level1', mx: 2, mt: 2, borderRadius: 'md' }}>
                    <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'}><Info /> Identity</Tab>
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'}><Payments /> Costs</Tab>
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: 4 }}>
          {(activeTab === 0 || petId === 'new') && (
            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid xs={12} md={2}>
                        <IconButton onClick={() => setEmojiPickerOpen(true)} variant="outlined" sx={{ width: 80, height: 80, borderRadius: 'xl' }}>
                            <Typography level="h1">{selectedEmoji}</Typography>
                            <PhotoCamera sx={{ position: 'absolute', bottom: -5, right: -5, fontSize: '1.2rem', color: 'primary.solidBg' }} />
                        </IconButton>
                    </Grid>
                    <Grid xs={12} md={5}>
                        <FormControl required><FormLabel>Pet Name</FormLabel><Input name="name" defaultValue={selectedPet?.name} /></FormControl>
                    </Grid>
                    <Grid xs={12} md={5}>
                        <FormControl required><FormLabel>Species</FormLabel><Input name="species" placeholder="e.g. Dog, Cat" defaultValue={selectedPet?.species} /></FormControl>
                    </Grid>
                    <Grid xs={12}><Button type="submit" size="lg">{petId === 'new' ? 'Create' : 'Update'}</Button></Grid>
                </Grid>
            </form>
          )}

          {activeTab === 1 && petId !== 'new' && (
            <RecurringChargesWidget 
                api={api} householdId={householdId} household={household}
                entityType="pet" entityId={petId} 
                segments={[
                    { id: 'insurance', label: 'Insurance' },
                    { id: 'other', label: 'Other' }
                ]}
                title="Pet Costs"
                showNotification={showNotification}
                confirmAction={confirmAction}
            />
          )}
        </Box>
      </Sheet>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setSelectedEmoji(e); setEmojiPickerOpen(false); }} />
    </Box>
  );
}
