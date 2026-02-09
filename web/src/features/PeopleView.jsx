import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Divider, Button, Input, FormControl, FormLabel, 
  IconButton, Tooltip, 
  Grid, Tabs, TabList, Tab, CircularProgress
} from '@mui/joy';
import { 
  Delete, Payments, ContactPage, School
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import AppSelect from '../components/ui/AppSelect'; 
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';
import SchoolTermsWidget from '../components/ui/SchoolTermsWidget';
import EntityGrid from '../components/ui/EntityGrid';

export default function PeopleView() {
  const { api, id: householdId, household, members = [], fetchHhMembers, user: currentUser, showNotification, confirmAction } = useOutletContext();
  const { personId } = useParams();

  const enabledModules = useMemo(() => {
    try {
        return household?.enabled_modules ? JSON.parse(household.enabled_modules) : ['pets', 'vehicles', 'meals'];
    } catch { return ['pets', 'vehicles', 'meals']; }
  }, [household]);

  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localPerson, setLocalPerson] = useState(null);
  
  const isAdmin = currentUser?.role === 'admin';

  const selectedPerson = useMemo(() => {
    if (localPerson && String(localPerson.id) === String(personId)) return localPerson;
    return (members || []).find(m => m.id === parseInt(personId));
  }, [members, personId, localPerson]);

  const isChild = selectedPerson?.type === 'child' || new URLSearchParams(location.search).get('type') === 'child';

  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('type') || 'adult';

  const [formData, setFormData] = useState({
    first_name: '', middle_name: '', last_name: '',
    type: initialType, alias: '', dob: '', emoji: '👨', notes: '',
  });

  // Fetch person if not in members list (e.g. direct link or just created)
  useEffect(() => {
    if (personId && personId !== 'new' && !selectedPerson && !loading) {
        setLoading(true);
        api.get(`/households/${householdId}/members/${personId}`)
            .then(res => setLocalPerson(res.data))
            .catch(() => showNotification("Failed to load person.", "danger"))
            .finally(() => setLoading(false));
    }
  }, [personId, selectedPerson, api, householdId, loading, showNotification]);

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
      });
    } else if (personId === 'new') {
      const currentType = new URLSearchParams(location.search).get('type') || 'adult';
      setFormData({
        first_name: '', middle_name: '', last_name: '',
        type: currentType, alias: '', dob: '', emoji: currentType === 'child' ? '👶' : '👨', notes: '',
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
        // Update local person immediately to prevent fallback to list
        setLocalPerson(res.data);
        await fetchHhMembers(householdId);
        // Return to Household Hub
        navigate(`/household/${householdId}/house`, { replace: true });
      } else {
        await api.put(`/households/${householdId}/members/${personId}`, formData);
        showNotification("Details updated.", "success");
        fetchHhMembers(householdId);
      }
     } catch {
      showNotification("Failed to save.", "danger");
    }
  };

  const handleDelete = () => {
    confirmAction(
        "Remove Person",
        `Are you sure you want to remove ${selectedPerson.name}? This will also delete their recurring costs.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/members/${personId}`);
                showNotification("Person removed.", "neutral");
                fetchHhMembers(householdId);
                navigate('..');
             } catch {
                showNotification("Failed to delete.", "danger");
            }
        }
    );
  };

  const groupedMembers = useMemo(() => {
    const groups = {
        adults: [],
        children: [],
        pets: []
    };
    (members || []).forEach(m => {
        if (m.type === 'pet') groups.pets.push(m);
        else if (m.type === 'child') groups.children.push(m);
        else groups.adults.push(m);
    });
    return groups;
  }, [members]);


  if (!personId) {
    const sections = [
        {
            title: 'Adults',
            items: groupedMembers.adults,
            onAdd: isAdmin ? () => navigate('new?type=adult') : null,
            addLabel: 'Add Adult'
        },
        {
            title: 'Children',
            items: groupedMembers.children,
            onAdd: isAdmin ? () => navigate('new?type=child') : null,
            addLabel: 'Add Child'
        }
    ];

    if (enabledModules.includes('pets')) {
        sections.push({
            title: 'Pets',
            items: groupedMembers.pets,
            onAdd: isAdmin ? () => navigate('new?type=pet') : null, 
            addLabel: 'Add Pet'
        });
    }

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                  People & Residents
                </Typography>
                <Typography level="body-md" color="neutral">
                  Select a resident to manage their details.
                </Typography>
            </Box>
            
            <EntityGrid 
                sections={sections}
                onSelect={(person) => navigate(String(person.id))}
                renderItem={(person) => (
                    <>
                        <Box sx={{ fontSize: '3rem' }}>{person.emoji || (person.type === 'pet' ? '🐾' : '👨')}</Box>
                        <Typography level="title-md" sx={{ fontWeight: 'lg', textAlign: 'center' }}>
                            {person.alias || (person.name || '').split(' ')[0]}
                        </Typography>
                        <Typography level="body-xs" color="neutral" sx={{ textTransform: 'uppercase' }}>
                            {person.role || person.type}
                        </Typography>
                    </>
                )}
            />
        </Box>
    );
  }

  if (loading || (personId !== 'new' && !selectedPerson)) {
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
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
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><Payments sx={{ mr: 1 }}/> Recurring Costs</Tab>
                    {isChild && (
                        <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={{ flex: 'none' }}><School sx={{ mr: 1 }}/> School Terms</Tab>
                    )}
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
                            { value: 'child', label: 'Child' },
                            ...(enabledModules.includes('pets') ? [{ value: 'pet', label: 'Pet' }] : [])
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
              <RecurringChargesWidget 
                api={api} 
                householdId={householdId} 
                household={household}
                entityType="member" 
                entityId={personId} 
                segments={[
                    ...(selectedPerson?.type === 'child' ? [{ id: 'pocket_money', label: 'Pocket Money' }] : []),
                    ...(selectedPerson?.type === 'adult' ? [{ id: 'fun_money', label: 'Fun Money' }] : []),
                    { id: 'insurance', label: 'Insurance' },
                    { id: 'subscription', label: 'Subscriptions' },
                    { id: 'other', label: 'Other' }
                ]}
                title="Personal Recurring Costs"
                showNotification={showNotification}
                confirmAction={confirmAction}
              />
            </Box>
          )}

          {activeTab === 2 && isChild && personId !== 'new' && (
            <Box>
                <SchoolTermsWidget 
                    api={api} 
                    householdId={householdId} 
                    memberId={personId}
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
        title="Select Person Emoji"
      />
    </Box>
  );
}