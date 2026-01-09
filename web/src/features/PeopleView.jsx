import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardHeader, Avatar, IconButton, 
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Tooltip, Stack, Chip
} from '@mui/material';
import { Edit, Delete, PersonAdd, Cake, Face, ChildCare, Visibility } from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

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
    if (!window.confirm("Remove this person from the household?")) return;
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
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => {/* TODO: Add new */}}>
                Add Person
            </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {people.map(m => (
          <Grid item xs={12} sm={6} md={4} key={m.id}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardHeader
                avatar={
                  <Avatar sx={{ 
                    bgcolor: getEmojiColor(m.emoji || m.name[0], isDark),
                    color: isDark ? 'white' : 'rgba(0,0,0,0.8)',
                    width: 48, height: 48, fontSize: '1.5rem'
                  }}>
                    {m.emoji || m.name[0].toUpperCase()}
                  </Avatar>
                }
                title={<Typography variant="h6">{m.name}</Typography>}
                subheader={
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip label={m.type.toUpperCase()} size="small" variant="outlined" />
                        {m.dob && <Chip icon={<Cake sx={{ fontSize: '0.8rem !important' }} />} label={m.dob} size="small" />}
                    </Stack>
                }
                action={isHouseholdAdmin && (
                  <Box>
                    <IconButton size="small" onClick={() => setEditMember(m)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                )}
              />
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={Boolean(editMember)} onClose={() => setEditMember(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit {editMember?.name}</DialogTitle>
          <DialogContent dividers>
             <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField name="name" label="Name" defaultValue={editMember?.name} fullWidth required />
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select name="type" defaultValue={editMember?.type || 'adult'} label="Type">
                                <MenuItem value="adult">Adult</MenuItem>
                                <MenuItem value="child">Child</MenuItem>
                                <MenuItem value="viewer">Viewer</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField name="dob" label="DOB" type="date" defaultValue={editMember?.dob} fullWidth InputLabelProps={{ shrink: true }} />
                    </Grid>
                </Grid>
                <TextField name="notes" label="Notes" defaultValue={editMember?.notes} multiline rows={3} fullWidth />
             </Stack>
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
