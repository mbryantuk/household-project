import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, Divider
} from '@mui/material';
import { Edit, Delete, PersonAdd, Cake, Face, Shield, Gavel } from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import RecurringCostsWidget from '../components/widgets/RecurringCostsWidget';

export default function PeopleView() {
  const { api, id: householdId, members, fetchHhMembers, user: currentUser, isDark, showNotification } = useOutletContext();
  const [editMember, setEditMember] = useState(null);
  
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const people = useMemo(() => 
    (members || []).filter(m => m.type !== 'pet'), 
  [members]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      await api.put(`/households/${householdId}/members/${editMember.id}`, data);
      showNotification("Person updated.", "success");
      fetchHhMembers(householdId);
      setEditMember(null);
    } catch (err) {
      showNotification("Failed to update.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this person?")) return;
    try {
      await api.delete(`/households/${householdId}/members/${id}`);
      showNotification("Person removed.", "info");
      fetchHhMembers(householdId);
    } catch (err) {
      showNotification("Failed to delete.", "error");
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="300">People</Typography>
        {isHouseholdAdmin && (
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => {/* TODO */}}>
                Add Person
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {people.map(m => (
          <Grid item xs={12} key={m.id}>
            <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Avatar sx={{ 
                            bgcolor: getEmojiColor(m.emoji || m.name[0], isDark),
                            width: 64, height: 64, fontSize: '2rem'
                        }}>
                            {m.emoji || m.name[0].toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography variant="h6">{m.name}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                <Chip label={m.type.toUpperCase()} size="small" variant="outlined" />
                                {m.dob && <Chip icon={<Cake sx={{ fontSize: '0.8rem !important' }} />} label={m.dob} size="small" />}
                            </Stack>
                        </Box>
                    </Box>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        {isHouseholdAdmin && (
                            <>
                                <Button size="small" startIcon={<Edit />} onClick={() => setEditMember(m)}>Edit Details</Button>
                                <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}><Delete fontSize="small" /></IconButton>
                            </>
                        )}
                    </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Shield fontSize="inherit" color="primary" /> Protection & Legal
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                        <Typography variant="body2">
                            <strong>Life Insurance:</strong> {m.life_insurance_provider || 'Not recorded'}
                            {m.life_insurance_premium > 0 && ` (£${m.life_insurance_premium}/mo)`}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Will / Legal:</strong> {m.will_details || 'No details recorded'}
                        </Typography>
                    </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                    <RecurringCostsWidget 
                        api={api} 
                        householdId={householdId} 
                        parentType="person" 
                        parentId={m.id} 
                        isAdmin={isHouseholdAdmin}
                        showNotification={showNotification}
                    />
                </Grid>
              </Grid>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={Boolean(editMember)} onClose={() => setEditMember(null)} fullWidth maxWidth="md">
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit {editMember?.name}</DialogTitle>
          <DialogContent dividers>
             <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}><TextField name="name" label="Name" defaultValue={editMember?.name} fullWidth required /></Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select name="type" defaultValue={editMember?.type || 'adult'} label="Type">
                            <MenuItem value="adult">Adult</MenuItem>
                            <MenuItem value="child">Child</MenuItem>
                            <MenuItem value="viewer">Viewer</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                
                <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Financial & Protection</Typography></Divider></Grid>
                
                <Grid item xs={12} md={6}><TextField name="life_insurance_provider" label="Life Insurance Provider" defaultValue={editMember?.life_insurance_provider} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField name="life_insurance_premium" label="Monthly Premium (£)" type="number" defaultValue={editMember?.life_insurance_premium} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField name="life_insurance_expiry" label="Policy Expiry" type="date" defaultValue={editMember?.life_insurance_expiry} fullWidth InputLabelProps={{shrink:true}} /></Grid>
                
                <Grid item xs={12}><TextField name="will_details" label="Will / Legal Details" defaultValue={editMember?.will_details} multiline rows={2} fullWidth placeholder="Location of original document, executors, etc." /></Grid>
                
                <Grid item xs={12}><TextField name="notes" label="General Notes" defaultValue={editMember?.notes} multiline rows={2} fullWidth /></Grid>
             </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditMember(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}