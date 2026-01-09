import { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Paper, Tabs, Tab, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Stack, Divider,
  Tooltip, IconButton
} from '@mui/material';
import { 
  Person, Shield, Gavel, Delete, Face, ChildCare, 
  Visibility, ContactPage, Payments
} from '@mui/icons-material';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';
import EmojiPicker from '../components/EmojiPicker';

export default function PeopleView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, isDark, showNotification, confirmAction } = useOutletContext();
  const { personId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const selectedPerson = useMemo(() => 
    (members || []).find(m => m.id === parseInt(personId)), 
  [members, personId]);

  // Use state for form fields to ensure they update when selection changes
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
      showNotification("Failed to save.", "error");
    }
  };

  const handleDelete = () => {
    confirmAction(
        "Remove Person",
        `Are you sure you want to remove ${selectedPerson.name}? This will also delete their recurring costs and birthdays.`,
        async () => {
            try {
                await api.delete(`/households/${householdId}/members/${personId}`);
                showNotification("Person removed.", "info");
                fetchHhMembers(householdId);
                navigate('..');
            } catch (err) {
                showNotification("Failed to delete.", "error");
            }
        }
    );
  };

  if (personId !== 'new' && !selectedPerson) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Select a person from the menu.</Typography></Box>;
  }

  return (
    <Box key={personId}> {/* Force re-render on ID change */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="300">
            {personId === 'new' ? 'Add New Person' : selectedPerson.name}
        </Typography>
        {personId !== 'new' && isHouseholdAdmin && (
            <Button color="error" startIcon={<Delete />} onClick={handleDelete}>Remove Person</Button>
        )}
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3, minHeight: '600px', overflow: 'hidden' }}>
        {personId !== 'new' && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ px: 2 }}>
                    <Tab icon={<ContactPage />} iconPosition="start" label="Identity" />
                    <Tab icon={<Shield />} iconPosition="start" label="Protection & Legal" disabled={formData.type === 'child'} />
                    <Tab icon={<Payments />} iconPosition="start" label="Misc Costs" />
                </Tabs>
            </Box>
        )}

        <Box sx={{ p: 4 }}>
          {(activeTab === 0 || personId === 'new') && (
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
                <Grid item xs={12} md={5}>
                    <TextField name="name" label="Full Name" value={formData.name} onChange={handleChange} fullWidth required />
                </Grid>
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth>
                    <InputLabel>Role / Type</InputLabel>
                    <Select name="type" value={formData.type} label="Role / Type" onChange={handleChange}>
                      <MenuItem value="adult">Adult</MenuItem>
                      <MenuItem value="child">Child</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}><TextField name="alias" label="Alias" value={formData.alias} onChange={handleChange} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField name="dob" label="Date of Birth" type="date" value={formData.dob} onChange={handleChange} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                <Grid item xs={12}><TextField name="notes" label="Personal Notes" value={formData.notes} onChange={handleChange} multiline rows={3} fullWidth /></Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" size="large">
                    {personId === 'new' ? 'Create Person' : 'Update Identity'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          )}

          {activeTab === 1 && personId !== 'new' && (
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Life Insurance</Typography>
                </Grid>
                <Grid item xs={12} md={6}><TextField name="life_insurance_provider" label="Provider" value={formData.life_insurance_provider} onChange={handleChange} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField name="life_insurance_premium" label="Monthly Premium (£)" type="number" value={formData.life_insurance_premium} onChange={handleChange} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField name="life_insurance_expiry" label="Policy Expiry" type="date" value={formData.life_insurance_expiry} onChange={handleChange} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Gavel fontSize="small" /> Wills & Estate
                  </Typography>
                  <TextField name="will_details" label="Will / Estate Details" value={formData.will_details} onChange={handleChange} multiline rows={4} fullWidth placeholder="Location of original document, executors, key instructions..." />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" size="large">Save Legal Info</Button>
                </Grid>
              </Grid>
            </form>
          )}

          {activeTab === 2 && personId !== 'new' && (
            <Box>
              <Typography variant="h6" gutterBottom>Recurring Miscellaneous Costs</Typography>
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
      </Paper>

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
