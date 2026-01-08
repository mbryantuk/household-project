import { useState } from 'react';
import { 
  Box, Typography, Grid, Card, CardContent, Button, 
  IconButton, Chip, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, List, ListItem, ListItemText, 
  ListItemSecondaryAction, Divider, Stack
} from '@mui/material';
import { Add, Delete, Edit, Home, Person, VpnKey } from '@mui/icons-material';

export default function AccessControl({
  users, 
  currentUser,
  households, 
  onCreateUser, 
  onCreateHousehold,
  onUpdateHousehold,
  onRemoveUser
}) {
  const [openUser, setOpenUser] = useState(false);  const [editingUser, setEditingUser] = useState(null); 
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'member' });

  // Household Creation State
  const [openAddHouse, setOpenAddHouse] = useState(false);
  const [newHouse, setNewHouse] = useState({ name: '', adminUsername: 'Admin', adminPassword: '' });

  // Household Editing State
  const [editingHousehold, setEditingHousehold] = useState(null);
  const [openEditHousehold, setOpenEditHousehold] = useState(false);
  const [currentHouseholdData, setCurrentHouseholdData] = useState({ name: '', access_key: '', theme: 'default' });

  // The assignment dialog is now completely removed.
  // const [openAssignDialog, setOpenAssignDialog] = useState(false);
  // const [assignment, setAssignment] = useState({ userId: '', householdId: '', role: 'member' });

  const isSysAdmin = currentUser?.role === 'sysadmin';
  // Only allow assigning users to households where the current user is an Admin or SysAdmin
  // This logic is now obsolete as Household Assignments section is removed.
  // const assignableHouseholds = households.filter(hh => hh.role === 'admin' || currentUser?.role === 'sysadmin');

  const handleAddUserSubmit = () => {
    if (newUser.username && newUser.password) {
      onCreateUser(newUser);
      setOpenAddUser(false);
      setNewUser({ username: '', password: '', role: 'member' });
    }
  };

  const handleCreateHouseSubmit = (e) => {
    e.preventDefault();
    onCreateHousehold(newHouse);
    setOpenAddHouse(false);
    setNewHouse({ name: '', adminUsername: 'Admin', adminPassword: '' });
  };

  const handleEditHouseholdClick = (household) => {
    setEditingHousehold(household);
    setCurrentHouseholdData({
      name: household.name,
      access_key: household.access_key,
      theme: household.theme
    });
    setOpenEditHousehold(true);
  };

  const handleUpdateHouseholdSubmit = () => {
    if (editingHousehold) {
      onUpdateHousehold(editingHousehold.id, currentHouseholdData);
      setOpenEditHousehold(false);
      setEditingHousehold(null);
      setCurrentHouseholdData({ name: '', access_key: '', theme: 'default' });
    }
  };

  // The assignment dialog logic is now completely removed.
  // const handleAssignSubmit = () => {
  //   const selectedUser = users.find(u => u.id === assignment.userId);
  //   if (selectedUser && assignment.householdId) {
  //     onAssignUser({ 
  //       householdId: assignment.householdId, 
  //       username: selectedUser.username, 
  //       role: assignment.role 
  //     });
  //     setOpenAssignDialog(false);
  //   }
  // };

  return (
    <Box sx={{ maxWidth: 1000, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>Platform Administration</Typography>
      
      {/* --- TENANTS SECTION (SysAdmin Only) --- */}
      {isSysAdmin && (
        <Card sx={{ p: 3, borderRadius: 3, mb: 4, border: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">Platform Tenants</Typography>
              <Typography variant="body2" color="text.secondary">Active households and their access keys.</Typography>
            </Box>
            <Button variant="contained" startIcon={<DomainAdd />} onClick={() => setOpenAddHouse(true)}>New Household</Button>
          </Box>
          
          <TableContainer component={Paper} variant="outlined" elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Household Name</TableCell>
                  <TableCell>Access Key</TableCell>
                  <TableCell>Theme</TableCell>
                  <TableCell align="right">Actions</TableCell> {/* Changed from ID */}
                </TableRow>
              </TableHead>
              <TableBody>
                {households.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell><strong>{h.name}</strong></TableCell>
                    <TableCell>
                      <Chip icon={<Key fontSize="small"/>} label={h.access_key} size="small" color="primary" variant="outlined" sx={{ fontWeight: 'bold', letterSpacing: 1 }} />
                    </TableCell>
                    <TableCell><Chip label={h.theme} size="small" /></TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleEditHouseholdClick(h)} size="small" title="Edit Household">
                        <Edit fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {households.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>No households created yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* --- SYSTEM USERS SECTION --- */}
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

      {/* --- DIALOG: CREATE HOUSEHOLD --- */}
      <Dialog open={openAddHouse} onClose={() => setOpenAddHouse(false)}>
        <form onSubmit={handleCreateHouseSubmit}>
          <DialogTitle>Create New Household</DialogTitle>
          <DialogContent>
            <TextField 
              margin="dense" label="Household Name" fullWidth required 
              value={newHouse.name} onChange={e => setNewHouse({...newHouse, name: e.target.value})} 
            />
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Initial Administrator</Typography>
              <TextField 
                margin="dense" label="Admin Username" fullWidth required size="small"
                value={newHouse.adminUsername} onChange={e => setNewHouse({...newHouse, adminUsername: e.target.value})} 
              />
              <TextField 
                margin="dense" label="Admin Password" type="password" fullWidth required size="small"
                value={newHouse.adminPassword} onChange={e => setNewHouse({...newHouse, adminPassword: e.target.value})} 
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddHouse(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create Tenant</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* --- DIALOG: EDIT HOUSEHOLD --- */}
      <Dialog open={openEditHousehold} onClose={() => setOpenEditHousehold(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit Household: {editingHousehold?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField 
            label="Household Name" 
            fullWidth 
            value={currentHouseholdData.name} 
            onChange={e => setCurrentHouseholdData({...currentHouseholdData, name: e.target.value})} 
          />
          <TextField 
            label="Access Key" 
            fullWidth 
            value={currentHouseholdData.access_key} 
            onChange={e => setCurrentHouseholdData({...currentHouseholdData, access_key: e.target.value})} 
            InputProps={{
              endAdornment: (
                <IconButton onClick={() => setCurrentHouseholdData(prev => ({...prev, access_key: crypto.randomBytes(3).toString('hex').toUpperCase()}))} size="small">
                  <Refresh fontSize="small" />
                </IconButton>
              ),
            }}
            helperText="Click refresh to generate a new key."
          />
          <FormControl fullWidth>
            <InputLabel>Theme</InputLabel>
            <Select 
              value={currentHouseholdData.theme} 
              label="Theme" 
              onChange={e => setCurrentHouseholdData({...currentHouseholdData, theme: e.target.value})}
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="ocean">Ocean</MenuItem>
              <MenuItem value="forest">Forest</MenuItem>
              <MenuItem value="volcano">Volcano</MenuItem>
              <MenuItem value="sun">Sun</MenuItem>
              <MenuItem value="royal">Royal</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditHousehold(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateHouseholdSubmit}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}