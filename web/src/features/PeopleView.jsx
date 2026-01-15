// ... imports
import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Button, Input, FormControl, FormLabel, 
  Stack, Avatar, IconButton, Divider, Tooltip, 
  Grid, Card, CardContent, Chip, Tabs, TabList, Tab, Table
} from '@mui/joy';
import { 
  Edit, Save, Delete, PersonAdd, UploadFile, MedicalServices, 
  Description, Euro, HealthAndSafety, Pets, History,
  Cake, VerifiedUser, Gavel, Shield, Payments, ContactPage, Add
} from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import EmojiPicker from '../components/EmojiPicker';
import AppSelect from '../components/ui/AppSelect'; // Architect's Rule: Use Shared Components
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';

export default function PeopleView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, showNotification, confirmAction } = useOutletContext();
  const { personId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin';

  const selectedPerson = useMemo(() => 
    (members || []).find(m => m.id === parseInt(personId)), 
  [members, personId]);

  // Extract query params for pre-filling type
  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('type') || 'adult';

  const [formData, setFormData] = useState({
    first_name: '', middle_name: '', last_name: '',
    type: initialType, alias: '', dob: '', emoji: '👨', notes: '',
    life_insurance_provider: '', life_insurance_premium: 0, life_insurance_expiry: '',
    will_details: ''
  });

  useEffect(() => {
    if (selectedPerson) {
      setFormData({
        first_name: selectedPerson.first_name || selectedPerson.name?.split(' ')[0] || '',
        middle_name: selectedPerson.middle_name || '',
        last_name: selectedPerson.last_name || selectedPerson.name?.split(' ').slice(1).join(' ') || '',
        type: selectedPerson.type || 'adult',
        alias: selectedPerson.alias || '',
        dob: selectedPerson.dob || '',
        emoji: selectedPerson.emoji || '👨',
        notes: selectedPerson.notes || '',
        life_insurance_provider: selectedPerson.life_insurance_provider || '',
        life_insurance_premium: selectedPerson.life_insurance_premium || 0,
        life_insurance_expiry: selectedPerson.life_insurance_expiry || '',
        will_details: selectedPerson.will_details || ''
      });
    } else if (personId === 'new') {
      // Re-read query param for fresh navigation
      const currentType = new URLSearchParams(location.search).get('type') || 'adult';
      setFormData({
        first_name: '', middle_name: '', last_name: '',
        type: currentType, alias: '', dob: '', emoji: currentType === 'child' ? '👶' : '👨', notes: '',
        life_insurance_provider: '', life_insurance_premium: 0, life_insurance_expiry: '',
        will_details: ''
      });
    }
  }, [selectedPerson, personId, location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (personId === 'new') {
        const res = await api.post(`/households/${householdId}/members`, formData);
        showNotification("Person added.", "success");
        fetchHhMembers(householdId);
        navigate(`../${res.data.id}`);
      } else {
        await api.put(`/households/${householdId}/members/${personId}`, formData);
        showNotification("Details updated.", "success");
        fetchHhMembers(householdId);
      }
    } catch (err) {
      showNotification("Failed to save.", "danger");
    }
  };

  const handleDelete = () => {
    confirmAction(
        "Remove Person",
        `Are you sure you want to remove ${selectedPerson.name}? This will also delete their recurring costs and birthdays.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/members/${personId}`);
                showNotification("Person removed.", "neutral");
                fetchHhMembers(householdId);
                navigate('..');
            } catch (err) {
                showNotification("Failed to delete.", "danger");
            }
        }
    );
  };


  if (personId !== 'new' && !selectedPerson) {
    const people = (members || []).filter(m => m.type !== 'pet');
    return (
        <Box>
            <Box sx={{ 
                mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                flexWrap: 'wrap', gap: 2 
            }}>
              <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                  People & Residents
                </Typography>
                <Typography level="body-md" color="neutral">
                  Manage your household members and guests.
                </Typography>
              </Box>
              <Box>
                  {isAdmin && (
                      <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('new')}>Add Person</Button>
                  )}
              </Box>
            </Box>
            <Grid container spacing={2}>
                {people.map(p => (
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
                            <Box sx={{ fontSize: '2.5rem' }}>{p.emoji || '👨'}</Box>
                            <Box>
                                <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{p.name}</Typography>
                                <Typography level="body-sm" color="neutral">{p.role || p.type}</Typography>
                            </Box>
                        </Sheet>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
  }

  return (
    <Box key={personId}>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                {personId === 'new' ? `Add New ${formData.type === 'child' ? 'Child' : 'Person'}` : selectedPerson.name}
            </Typography>
            <Typography level="body-md" color="neutral">
                {personId === 'new' ? 'Enter personal details below.' : 'View and manage personal information.'}
            </Typography>
        </Box>
        <Box>
            {personId !== 'new' && isAdmin && (
                <Button color="danger" variant="soft" startDecorator={<Delete />} onClick={handleDelete}>Remove Person</Button>
            )}
        </Box>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '600px', overflow: 'hidden' }}>
        {personId !== 'new' && (
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
                    <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><ContactPage sx={{ mr: 1 }}/> Identity</Tab>
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} disabled={formData.type === 'child'} sx={{ flex: 'none' }}><Shield sx={{ mr: 1 }}/> Protection & Legal</Tab>
                    <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Misc Costs</Tab>
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {(activeTab === 0 || personId === 'new') && (
            <Box>
                <Box sx={{ mb: 4 }}>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                        Personal Identity
                    </Typography>
                    <Typography level="body-md" color="neutral">Core personal identification and background.</Typography>
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
                    <Grid xs={12} md={10}>
                      <Grid container spacing={2}>
                        <Grid xs={12} md={4}>
                            <FormControl required>
                                <FormLabel>First Name</FormLabel>
                                <Input name="first_name" value={formData.first_name} onChange={handleChange} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Middle Name</FormLabel>
                                <Input name="middle_name" value={formData.middle_name} onChange={handleChange} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={4}>
                            <FormControl>
                                <FormLabel>Last Name</FormLabel>
                                <Input name="last_name" value={formData.last_name} onChange={handleChange} />
                            </FormControl>
                        </Grid>
                      </Grid>
                    </Grid>
                    
                    <Grid xs={12} md={6}>
                    <AppSelect 
                        label="Role / Type"
                        name="type"
                        value={formData.type}
                        onChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                        options={[
                            { value: 'adult', label: 'Adult' },
                            { value: 'child', label: 'Child' }
                        ]}
                    />
                    </Grid>
                    <Grid xs={12} md={6}>
                        <FormControl>
                            <FormLabel>Alias</FormLabel>
                            <Input name="alias" value={formData.alias} onChange={handleChange} />
                        </FormControl>
                    </Grid>
                    <Grid xs={12} md={6}>
                        <FormControl>
                            <FormLabel>Date of Birth</FormLabel>
                            <Input name="dob" type="date" value={formData.dob} onChange={handleChange} />
                        </FormControl>
                    </Grid>
                    <Grid xs={12}>
                        <FormControl>
                            <FormLabel>Personal Notes</FormLabel>
                            <Input name="notes" value={formData.notes} onChange={handleChange} />
                        </FormControl>
                    </Grid>
                    <Grid xs={12}>
                    <Button type="submit" variant="solid" size="lg">
                        {personId === 'new' ? 'Create Person' : 'Update Identity'}
                    </Button>
                    </Grid>
                </Grid>
                </form>
            </Box>
          )}

          {activeTab === 1 && personId !== 'new' && (
            <Box>
                {/* ... existing Legal content ... */}
                <Box sx={{ mb: 4 }}>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                        Protection & Legal
                    </Typography>
                    <Typography level="body-md" color="neutral">Insurance, Wills, and Legal documentation.</Typography>
                </Box>
                <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid xs={12}>
                    <Typography level="title-lg" sx={{ fontWeight: 'lg' }}>Life Insurance</Typography>
                    </Grid>
                    <Grid xs={12} md={6}>
                        <FormControl>
                            <FormLabel>Provider</FormLabel>
                            <Input name="life_insurance_provider" value={formData.life_insurance_provider} onChange={handleChange} />
                        </FormControl>
                    </Grid>
                    <Grid xs={12} md={3}>
                        <FormControl>
                            <FormLabel>Monthly Premium (£)</FormLabel>
                            <Input name="life_insurance_premium" type="number" value={formData.life_insurance_premium} onChange={handleChange} />
                        </FormControl>
                    </Grid>
                    <Grid xs={12} md={3}>
                        <FormControl>
                            <FormLabel>Policy Expiry</FormLabel>
                            <Input name="life_insurance_expiry" type="date" value={formData.life_insurance_expiry} onChange={handleChange} />
                        </FormControl>
                    </Grid>
                    
                    <Grid xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography level="title-lg" sx={{ fontWeight: 'lg' }} startDecorator={<Gavel />}>
                        Wills & Estate
                    </Typography>
                    <FormControl sx={{ mt: 2 }}>
                        <FormLabel>Will / Estate Details</FormLabel>
                        <Input name="will_details" value={formData.will_details} onChange={handleChange} placeholder="Location of original document, executors, key instructions..." />
                    </FormControl>
                    </Grid>
                    <Grid xs={12}>
                    <Button type="submit" variant="solid" size="lg">Save Legal Info</Button>
                    </Grid>
                </Grid>
                </form>
            </Box>
          )}

          {activeTab === 2 && personId !== 'new' && (
            <Box>
              <Box sx={{ mb: 4 }}>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Recurring Miscellaneous Costs</Typography>
                <Typography level="body-md" color="neutral">Costs specific to this resident.</Typography>
              </Box>
              <RecurringCostsWidget 
                api={api} 
                householdId={householdId} 
                parentType="person" 
                parentId={personId} 
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
        title="Select Person Emoji"
      />
    </Box>
  );
}