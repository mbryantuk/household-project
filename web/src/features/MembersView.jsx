import { useState } from 'react';
import { 
  Box, Typography, Paper, Grid, TextField, FormControl, InputLabel, 
  Select, MenuItem, Button, Chip, IconButton, Avatar, Card, CardHeader, 
  Divider, Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import { PersonAdd, Delete, Groups, Edit, ChildCare, Face, Visibility } from '@mui/icons-material'; // Added Visibility icon

const PET_SPECIES = ['Dog', 'Cat', 'Hamster', 'Rabbit', 'Bird', 'Fish', 'Reptile', 'Other'];

export default function MembersView({ members, onAddMember, onRemoveMember, onUpdateMember }) {
  const [memberType, setMemberType] = useState('adult');
  const [editMember, setEditMember] = useState(null);

  const getResidentAvatar = (m) => {
    const type = m?.type?.toLowerCase();
    const gender = m?.gender?.toLowerCase();
    const species = m?.species?.toLowerCase();
    
    if (type === 'pet') {
      switch (species) {
        case 'dog': return '🐶'; case 'cat': return '🐱'; case 'hamster': return '🐹';
        case 'bird': return '🐦'; case 'fish': return '🐟'; default: return '🐾';
      }
    }
    // Added specific icon for Viewer type
    if (type === 'viewer') return <Visibility />; 
    
    if (gender === 'male') return type === 'child' ? '👦' : '👨';
    if (gender === 'female') return type === 'child' ? '👧' : '👩';
    return type === 'child' ? <ChildCare /> : <Face />;
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onUpdateMember(editMember.id, Object.fromEntries(formData.entries()));
    setEditMember(null);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Groups color="primary" /> Household Residents
      </Typography>

      {/* ADD FORM */}
      <Box component="form" onSubmit={onAddMember} sx={{ mb: 4, p: 3, bgcolor: '#fcfcfc', border: '1px solid #eee', borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select name="type" value={memberType} label="Type" onChange={(e) => setMemberType(e.target.value)}>
                <MenuItem value="adult">Adult</MenuItem>
                <MenuItem value="child">Child</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem> {/* 🟢 Added Viewer Option */}
                <MenuItem value="pet">Pet</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={8}><TextField name="name" label="Full Name" fullWidth size="small" required /></Grid>
          {memberType !== 'pet' ? (
            <>
              <Grid item xs={12} sm={4}><TextField name="alias" label="Alias" fullWidth size="small" /></Grid>
              <Grid item xs={12} sm={4}><TextField name="dob" label="DOB" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select name="gender" label="Gender" defaultValue="none">
                    <MenuItem value="none">Not Specified</MenuItem><MenuItem value="male">Male</MenuItem><MenuItem value="female">Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          ) : (
            <Grid item xs={12} sm={12}>
              <FormControl fullWidth size="small"><InputLabel>Species</InputLabel>
                <Select name="species" label="Species" defaultValue="Dog">{PET_SPECIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12}><Button type="submit" variant="contained" fullWidth startIcon={<PersonAdd />}>Add Resident</Button></Grid>
        </Grid>
      </Box>

      {/* LIST */}
      <Grid container spacing={2}>
        {members.map((m) => (
          <Grid item xs={12} sm={6} md={4} key={m.id}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardHeader
                avatar={<Avatar sx={{ bgcolor: m.type === 'pet' ? '#fff9c4' : '#e3f2fd', fontSize: '1.2rem' }}>{getResidentAvatar(m)}</Avatar>}
                action={
                  <Box>
                    <IconButton size="small" onClick={() => setEditMember(m)}><Edit fontSize="small" /></IconButton>
                    <IconButton color="error" size="small" onClick={() => onRemoveMember(m.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                }
                title={m.name || 'Unnamed Resident'}
                subheader={m.alias ? `"${m.alias}"` : (m.type ? m.type.toUpperCase() : 'RESIDENT')}
              />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* EDIT DIALOG */}
      <Dialog open={Boolean(editMember)} onClose={() => setEditMember(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit Resident</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small"><InputLabel>Type</InputLabel>
                  <Select name="type" defaultValue={editMember?.type} label="Type">
                    <MenuItem value="adult">Adult</MenuItem>
                    <MenuItem value="child">Child</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem> {/* 🟢 Added Viewer Option */}
                    <MenuItem value="pet">Pet</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {/* ... rest of the edit form stays the same ... */}
              <Grid item xs={12} sm={6}><TextField name="name" label="Name" fullWidth size="small" defaultValue={editMember?.name} required /></Grid>
              <Grid item xs={12} sm={6}><TextField name="alias" label="Alias" fullWidth size="small" defaultValue={editMember?.alias} /></Grid>
              <Grid item xs={12} sm={6}><TextField name="dob" label="DOB" type="date" fullWidth size="small" defaultValue={editMember?.dob} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}>
                 <FormControl fullWidth size="small"><InputLabel>Gender</InputLabel>
                  <Select name="gender" defaultValue={editMember?.gender || 'none'} label="Gender">
                    <MenuItem value="none">None</MenuItem><MenuItem value="male">Male</MenuItem><MenuItem value="female">Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small"><InputLabel>Species</InputLabel>
                <Select name="species" defaultValue={editMember?.species || 'Dog'} label="Species">
                    {PET_SPECIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setEditMember(null)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}