import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, List, ListItem, ListItemButton, ListItemText, 
  ListItemIcon, Avatar, Paper, Tabs, Tab, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Person, Shield, Gavel, Add, Edit, Delete, 
  ChildCare, Face, Visibility, ContactPage, Payments
} from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';

export default function PeopleView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, isDark, showNotification } = useOutletContext();
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isAdding, setIsNew] = useState(false);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const people = useMemo(() => 
    (members || []).filter(m => m.type !== 'pet'), 
  [members]);

  // Set initial selection
  useMemo(() => {
    if (people.length > 0 && !selectedId) setSelectedId(people[0].id);
  }, [people, selectedId]);

  const selectedPerson = people.find(p => p.id === selectedId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (isAdding) {
        await api.post(`/households/${householdId}/members`, data);
        showNotification("Person added.", "success");
      } else {
        await api.put(`/households/${householdId}/members/${selectedId}`, data);
        showNotification("Details updated.", "success");
      }
      fetchHhMembers(householdId);
      setIsNew(false);
    } catch (err) {
      showNotification("Failed to save.", "error");
    }
  };

  const handleTypeIcon = (type) => {
    if (type === 'child') return <ChildCare />;
    if (type === 'viewer') return <Visibility />;
    return <Face />;
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        {/* LEFT: SELECTION LIST */}
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ borderRadius: 3, height: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover' }}>
              <Typography variant="h6" fontWeight="bold">People</Typography>
              {isHouseholdAdmin && (
                <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setIsNew(true)}>Add</Button>
              )}
            </Box>
            <List sx={{ pt: 0 }}>
              {people.map(p => (
                <ListItem key={p.id} disablePadding divider>
                  <ListItemButton 
                    selected={selectedId === p.id} 
                    onClick={() => { setSelectedId(p.id); setActiveTab(0); }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ 
                        bgcolor: getEmojiColor(p.emoji || p.name[0], isDark),
                        width: 32, height: 32, fontSize: '1rem'
                      }}>
                        {p.emoji || p.name[0]}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText primary={p.name} secondary={p.type.toUpperCase()} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* RIGHT: DETAILS AREA */}
        <Grid item xs={12} md={9}>
          {!selectedPerson ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Select a person to view or edit their details.</Typography>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 3, minHeight: '600px' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ px: 2 }}>
                  <Tab icon={<ContactPage />} iconPosition="start" label="Identity" />
                  <Tab icon={<Shield />} iconPosition="start" label="Protection & Legal" disabled={selectedPerson.type === 'child'} />
                  <Tab icon={<Payments />} iconPosition="start" label="Misc Costs" />
                </Tabs>
              </Box>

              <Box sx={{ p: 4 }}>
                {activeTab === 0 && (
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}><TextField name="name" label="Full Name" defaultValue={selectedPerson.name} fullWidth required /></Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Role / Type</InputLabel>
                          <Select name="type" defaultValue={selectedPerson.type} label="Role / Type">
                            <MenuItem value="adult">Adult</MenuItem>
                            <MenuItem value="child">Child</MenuItem>
                            <MenuItem value="viewer">Viewer</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}><TextField name="alias" label="Alias" defaultValue={selectedPerson.alias} fullWidth /></Grid>
                      <Grid item xs={12} md={4}><TextField name="dob" label="Date of Birth" type="date" defaultValue={selectedPerson.dob} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                      <Grid item xs={12} md={4}><TextField name="emoji" label="Emoji Icon" defaultValue={selectedPerson.emoji} fullWidth placeholder="👨" /></Grid>
                      <Grid item xs={12}><TextField name="notes" label="Personal Notes" defaultValue={selectedPerson.notes} multiline rows={3} fullWidth /></Grid>
                      <Grid item xs={12}>
                        <Button type="submit" variant="contained" size="large">Update Identity</Button>
                      </Grid>
                    </Grid>
                  </form>
                )}

                {activeTab === 1 && (
                  <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>Life Insurance</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Key protection details for household members.</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}><TextField name="life_insurance_provider" label="Provider" defaultValue={selectedPerson.life_insurance_provider} fullWidth /></Grid>
                      <Grid item xs={12} md={3}><TextField name="life_insurance_premium" label="Monthly Premium (£)" type="number" defaultValue={selectedPerson.life_insurance_premium} fullWidth /></Grid>
                      <Grid item xs={12} md={3}><TextField name="life_insurance_expiry" label="Expiry Date" type="date" defaultValue={selectedPerson.life_insurance_expiry} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                      
                      <Grid item xs={12} sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Gavel fontSize="small" /> Wills & Estate
                        </Typography>
                        <TextField name="will_details" label="Will / Estate Details" defaultValue={selectedPerson.will_details} multiline rows={4} fullWidth placeholder="Location of original document, executors, key instructions..." />
                      </Grid>
                      <Grid item xs={12}>
                        <Button type="submit" variant="contained" size="large">Save Legal Info</Button>
                      </Grid>
                    </Grid>
                  </form>
                )}

                {activeTab === 2 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Recurring Miscellaneous Costs</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Add specific recurring costs for {selectedPerson.name} that are not covered in global modules.</Typography>
                    <RecurringCostsWidget 
                      api={api} 
                      householdId={householdId} 
                      parentType="person" 
                      parentId={selectedPerson.id} 
                      isAdmin={isHouseholdAdmin}
                      showNotification={showNotification}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* ADD NEW PERSON DIALOG */}
      <Dialog open={isAdding} onClose={() => setIsNew(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
            <DialogTitle>Add New Household Member</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField name="name" label="Full Name" fullWidth required />
                    <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select name="type" defaultValue="adult" label="Type">
                            <MenuItem value="adult">Adult</MenuItem>
                            <MenuItem value="child">Child</MenuItem>
                            <MenuItem value="viewer">Viewer (Read-Only)</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField name="dob" label="Date of Birth" type="date" fullWidth InputLabelProps={{shrink:true}} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setIsNew(false)}>Cancel</Button>
                <Button type="submit" variant="contained">Create Person</Button>
            </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
