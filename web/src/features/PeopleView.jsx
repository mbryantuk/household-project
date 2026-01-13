import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Select, Option, Stack, Divider,
  Tooltip, IconButton, Grid
} from '@mui/joy';
import { 
  Shield, Gavel, Delete, ContactPage, Payments
} from '@mui/icons-material';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import EmojiPicker from '../components/EmojiPicker';

export default function PeopleView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, showNotification, confirmAction } = useOutletContext();
  const { personId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin';

  const selectedPerson = useMemo(() => 
    (members || []).find(m => m.id === parseInt(personId)), 
  [members, personId]);

  const [formData, setFormData] = useState({
    name: '', type: 'adult', alias: '', dob: '', emoji: '👨', notes: '',
    life_insurance_provider: '', life_insurance_premium: 0, life_insurance_expiry: '',
    will_details: ''
  });

  useEffect(() => {
    if (selectedPerson) {
      setFormData({
        name: selectedPerson.name || '',
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
      setFormData({
        name: '', type: 'adult', alias: '', dob: '', emoji: '👨', notes: '',
        life_insurance_provider: '', life_insurance_premium: 0, life_insurance_expiry: '',
        will_details: ''
      });
    }
  }, [selectedPerson, personId]);

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
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography level="h2" fontWeight="300">People</Typography>
                {isHouseholdAdmin && (
                    <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('new')}>Add Person</Button>
                )}
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
                                <Typography level="title-md">{p.name}</Typography>
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography level="h2" fontWeight="300">
            {personId === 'new' ? 'Add New Person' : selectedPerson.name}
        </Typography>
        {personId !== 'new' && isHouseholdAdmin && (
            <Button color="danger" variant="soft" startDecorator={<Delete />} onClick={handleDelete}>Remove Person</Button>
        )}
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
                        <FormLabel>Full Name</FormLabel>
                        <Input name="name" value={formData.name} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={5}>
                  <FormControl>
                    <FormLabel>Role / Type</FormLabel>
                    <Select name="type" value={formData.type} onChange={(e, v) => setFormData(prev => ({ ...prev, type: v }))}>
                      <Option value="adult">Adult</Option>
                      <Option value="child">Child</Option>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={12} md={4}>
                    <FormControl>
                        <FormLabel>Alias</FormLabel>
                        <Input name="alias" value={formData.alias} onChange={handleChange} />
                    </FormControl>
                </Grid>
                <Grid xs={12} md={4}>
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
          )}

          {activeTab === 1 && personId !== 'new' && (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid xs={12}>
                  <Typography level="title-lg">Life Insurance</Typography>
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
                  <Typography level="title-lg" startDecorator={<Gavel />}>
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
          )}

          {activeTab === 2 && personId !== 'new' && (
            <Box>
              <Typography level="title-lg" mb={2}>Recurring Miscellaneous Costs</Typography>
              <RecurringCostsWidget 
                api={api} 
                householdId={householdId} 
                parentType="person" 
                parentId={personId} 
                isAdmin={isHouseholdAdmin}
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