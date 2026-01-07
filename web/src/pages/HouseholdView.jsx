import React, { useState } from 'react';
import { 
  Box, Typography, Grid, Card, CardActionArea, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Button, List, ListItem, ListItemText, IconButton, Divider, 
  Paper, MenuItem, Select, InputLabel, FormControl 
} from '@mui/material';
import { Add, Delete, PersonAdd, ColorLens, Edit, GroupAdd } from '@mui/icons-material';
import HomeView from '../features/HomeView';
import MembersView from '../features/MembersView';
import TotemIcon from '../components/TotemIcon';

export default function HouseholdView(props) {
  const { 
    view, 
    household, 
    households, 
    currentUser, 
    users, 
    members, 
    onSelectHousehold,
    onCreateHousehold,
    onUpdateHousehold,
    onDeleteHousehold,
    onAddMember,
    onRemoveMember,
    onUpdateMember,
    onCreateUser,
    onRemoveUser
  } = props;
  
  // --- DIALOG & FORM STATES ---
  const [isHouseDialogOpen, setIsHouseDialogOpen] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  
  const [openAddUser, setOpenAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'member' });

  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [assignment, setAssignment] = useState({ userId: '', householdId: '', role: 'member' });

  // --- HANDLERS ---
  const handleCreateSubmit = () => {
    if (newHouseName.trim()) {
      onCreateHousehold(newHouseName);
      setNewHouseName('');
      setIsHouseDialogOpen(false);
    }
  };

  const handleAddUserSubmit = () => {
    if (newUser.username && newUser.password) {
      onCreateUser(newUser);
      setOpenAddUser(false);
      setNewUser({ username: '', password: '', role: 'member' });
    }
  };

  // Only allow assigning users to households where the current user is an Admin or SysAdmin
  const assignableHouseholds = households.filter(hh => hh.role === 'admin' || currentUser?.role === 'sysadmin');

  // --- 1. DASHBOARD VIEW (Grid of Households) ---
  if (view === 'dashboard') {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: '300' }}>My Households</Typography>
        <Grid container spacing={3}>
          {households && households.map(hh => (
            <Grid item xs={12} sm={6} md={4} key={hh.id}>
              <Card elevation={3} sx={{ borderRadius: 4 }}>
                <CardActionArea onClick={() => onSelectHousehold(hh)} sx={{ p: 4, textAlign: 'center' }}>
                  <TotemIcon colorway={hh.theme} sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h5" fontWeight="bold">{hh.name}</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
          
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined" sx={{ borderStyle: 'dashed', borderRadius: 4, height: '100%' }}>
              <CardActionArea 
                onClick={() => setIsHouseDialogOpen(true)} 
                sx={{ p: 4, textAlign: 'center', height: '100%' }}
              >
                <Add sx={{ fontSize: 40, color: 'text.secondary' }} />
                <Typography color="text.secondary">New Household</Typography>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        <Dialog open={isHouseDialogOpen} onClose={() => setIsHouseDialogOpen(false)}>
          <DialogTitle>Add New Household</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Household Name" fullWidth variant="standard"
              value={newHouseName} onChange={(e) => setNewHouseName(e.target.value)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsHouseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} variant="contained" disabled={!newHouseName.trim()}>Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Loading state
  if (!household && view !== 'dashboard' && view !== 'access') return <CircularProgress sx={{ display: 'block', m: 'auto', mt: 10 }} />;

  // --- 2. APP ACCESS (User & Household Management) ---
  if (view === 'access') {
    return (
      <Box sx={{ maxWidth: 800 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>App Access</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Manage system users and their access to specific households.
        </Typography>

        <Card sx={{ p: 3, borderRadius: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">System-Wide Users</Typography>
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setOpenAddUser(true)}>Add User</Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          <List>
            {users.map((u) => (
              <ListItem 
                key={u.id} 
                divider
                secondaryAction={
                  <Box>
                    <IconButton onClick={() => setEditingUser(u)} sx={{ mr: 1 }}><Edit /></IconButton>
                    {u.username !== currentUser?.username && (
                      <IconButton color="error" onClick={() => onRemoveUser(u.id)}><Delete /></IconButton>
                    )}
                  </Box>
                }
              >
                <ListItemText primary={u.username} secondary={`System Role: ${u.system_role || 'Member'}`} />
              </ListItem>
            ))}
          </List>
        </Card>

        {/* HOUSEHOLD ASSIGNMENT SECTION */}
        {(currentUser?.role === 'sysadmin' || households.some(h => h.role === 'admin')) && (
          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Household Assignments</Typography>
              <Button variant="outlined" startIcon={<GroupAdd />} onClick={() => setOpenAssignDialog(true)}>Assign to House</Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Use this to grant an existing user access to a specific household you manage.
            </Typography>
          </Card>
        )}

        {/* --- DIALOG: ADD/EDIT SYSTEM USER --- */}
        <Dialog open={openAddUser || !!editingUser} onClose={() => {setOpenAddUser(false); setEditingUser(null);}} fullWidth maxWidth="xs">
          <DialogTitle>{editingUser ? `Edit ${editingUser.username}` : 'Add New System User'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!editingUser && (
              <>
                <TextField label="Username" fullWidth value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} />
                <TextField label="Password" type="password" fullWidth value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} />
              </>
            )}
            <FormControl fullWidth>
              <InputLabel>System Role</InputLabel>
              <Select 
                value={editingUser ? editingUser.system_role : newUser.role} 
                label="System Role" 
                onChange={e => editingUser ? setEditingUser({...editingUser, system_role: e.target.value}) : setNewUser({...newUser, role: e.target.value})}
              >
                <MenuItem value="sysadmin">Admin (God Mode)</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {setOpenAddUser(false); setEditingUser(null);}}>Cancel</Button>
            <Button variant="contained" onClick={editingUser ? () => setEditingUser(null) : handleAddUserSubmit}>
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* --- DIALOG: ASSIGN USER TO HOUSEHOLD --- */}
        <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} fullWidth maxWidth="xs">
          <DialogTitle>Assign User to Household</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>User</InputLabel>
              <Select value={assignment.userId} label="User" onChange={e => setAssignment({...assignment, userId: e.target.value})}>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Household</InputLabel>
              <Select value={assignment.householdId} label="Household" onChange={e => setAssignment({...assignment, householdId: e.target.value})}>
                {assignableHouseholds.map(h => <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Household Role</InputLabel>
              <Select value={assignment.role} label="Household Role" onChange={e => setAssignment({...assignment, role: e.target.value})}>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => setOpenAssignDialog(false)}>Assign Access</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // --- 3. SPECIFIC HOUSEHOLD SELECTED ---
  return (
    <Box>
      {view === 'home' && (
        <HomeView household={household} members={props.members} currentUser={currentUser} />
      )}
      {view === 'members' && (
        <MembersView members={members} onAddMember={onAddMember} onRemoveMember={onRemoveMember} onUpdateMember={onUpdateMember} />
      )}
      {view === 'settings' && (
        <Box sx={{ maxWidth: 800 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>Household Settings</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom>General Information</Typography>
                <TextField fullWidth label="Household Name" defaultValue={household?.name} margin="normal" variant="outlined"
                  onBlur={(e) => { if (e.target.value !== household?.name) onUpdateHousehold({ name: e.target.value }); }} />
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ p: 3, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ColorLens sx={{ mr: 1, color: 'primary.main' }} /><Typography variant="h6">Theme & Colorway</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {['default', 'ocean', 'forest', 'sunset'].map((t) => (
                    <Button key={t} variant={household?.theme === t ? "contained" : "outlined"} 
                      onClick={() => onUpdateHousehold({ theme: t })} sx={{ textTransform: 'capitalize' }}>{t}</Button>
                  ))}
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, mt: 2, bgcolor: 'error.lighter', borderRadius: 3, border: '1px solid', borderColor: 'error.main' }}>
                <Typography variant="h6" color="error.main" gutterBottom>Danger Zone</Typography>
                <Button variant="contained" color="error" onClick={() => onDeleteHousehold(household.id)}>Delete Household</Button>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}