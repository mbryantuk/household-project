import { useState } from 'react';
import { 
  Box, Typography, Paper, Tabs, Tab, TextField, Grid, 
  ToggleButtonGroup, ToggleButton, Divider, Button,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Info, ManageAccounts, Groups, PersonAdd, Delete, 
  AddCircle, HomeWork, Warning, Edit 
} from '@mui/icons-material';
import TotemIcon from '../components/TotemIcon';

export default function SettingsView({ 
  household, users, currentUser,
    onRemoveUser
  }) {
    const [activeTab, setActiveTab] = useState(0);  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // 🛡️ PERMISSION CHECK: Determine if the user has Admin rights to this house
  // In Isolated Tenancy, the role is stored on the currentUser object
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  // 🛡️ LOADING GUARD
  if (!household) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading household settings...</Typography>
      </Box>
    );
  }

  const handleCreateSubmit = (e) => {
    e.preventDefault(); 
    const userData = {
      username: e.target.newUsername.value,
      password: e.target.newPassword.value,
      email: e.target.newEmail.value,
      role: e.target.newRole.value
    };
    onCreateUser(userData);
    setCreateOpen(false);
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (e.target.editRole.value) updates.role = e.target.editRole.value;
    if (e.target.editPassword.value) updates.password = e.target.editPassword.value;
    
    onUpdateUser(editingUser.id, updates);
    setEditOpen(false);
    setEditingUser(null);
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Tabs 
        value={tab} 
        onChange={(e, v) => setTab(v)} 
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}
      >
        <Tab label="General" icon={<Info fontSize="small"/>} iconPosition="start" />
        <Tab label="Household Access" icon={<ManageAccounts fontSize="small"/>} iconPosition="start" />
      </Tabs>

      {/* --- TAB 0: GENERAL --- */}
      {tab === 0 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Household Details</Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Household Name" 
                defaultValue={household.name || ''} 
                fullWidth 
                disabled={!isHouseholdAdmin} // 🛡️ Prevent non-admins from renaming
                onBlur={(e) => onUpdateHousehold({ name: e.target.value })}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" gutterBottom>Theme / Colorway</Typography>
          <ToggleButtonGroup
            value={household.theme || 'default'}
            exclusive
            onChange={(e, v) => v && onUpdateHousehold({ theme: v })}
            disabled={!isHouseholdAdmin} // 🛡️ Prevent non-admins from changing themes
            sx={{ flexWrap: 'wrap', gap: 1, mb: 4 }}
          >
            {['default', 'ocean', 'forest', 'volcano', 'sun', 'royal', 'dark'].map((t) => (
              <ToggleButton key={t} value={t} sx={{ borderRadius: '8px !important', border: '1px solid #ddd !important' }}>
                <TotemIcon colorway={t} sx={{ mr: 1 }} /> {t}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* 🔴 DANGER ZONE: Only visible to admins or sysadmins */}
          {isHouseholdAdmin && (
            <>
              <Divider sx={{ my: 4 }} />
              <Box sx={{ 
                p: 3, 
                borderRadius: 2, 
                border: '1px solid', 
                borderColor: 'error.light', 
                bgcolor: 'rgba(211, 47, 47, 0.04)' 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'error.main' }}>
                  <Warning sx={{ mr: 1 }} fontSize="small" />
                  <Typography variant="h6">Danger Zone</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Deleting this household will permanently remove all resident data, logs, and authorized user connections. 
                  This action is irreversible and the database file will be wiped from the server.
                </Typography>
                <Button 
                  variant="contained" 
                  color="error" 
                  startIcon={<Delete />}
                  onClick={() => onDeleteHousehold(household.id)}
                >
                  Delete {household.name}
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* --- TAB 1: HOUSEHOLD ACCESS (Previously App Access) --- */}
      {tab === 1 && (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6">Household Access</Typography>
              <Typography variant="caption" color="text.secondary">
                Control who can log in to <strong>{household.name}</strong>.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<PersonAdd />} 
              onClick={() => setCreateOpen(true)}
              disabled={!isHouseholdAdmin}
            >
              Grant Access
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Access Level</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users && users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="500">{u.username}</Typography>
                        {u.system_role === 'sysadmin' && (
                          <Chip label="SysAdmin" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={u.role.toUpperCase()} 
                        size="small" 
                        color={u.role === 'admin' ? 'primary' : 'default'} 
                        variant={u.role === 'viewer' ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {isHouseholdAdmin && u.username !== currentUser.username && (
                        <IconButton size="small" onClick={() => handleEditClick(u)} title="Edit User">
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => onRemoveUser(u.id)}
                        disabled={!isHouseholdAdmin || u.username === currentUser.username} 
                        title="Revoke Access"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* GRANT ACCESS DIALOG */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle>Grant Access</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a new account for a family member.
            </Typography>
            
            <TextField margin="dense" name="newUsername" label="Username" fullWidth required />
            <TextField margin="dense" name="newPassword" label="Password" type="password" fullWidth required />
            <TextField margin="dense" name="newEmail" label="Email (Optional)" type="email" fullWidth />
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Household Role</InputLabel>
              <Select name="newRole" defaultValue="member" label="Household Role">
                <MenuItem value="viewer">Viewer (Read Only)</MenuItem>
                <MenuItem value="member">Member (Can Edit)</MenuItem>
                <MenuItem value="admin">Admin (Full Control)</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create & Assign</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit User: {editingUser?.username}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Update role or reset password.
            </Typography>
            
            <TextField 
              margin="dense" name="editPassword" label="New Password (Optional)" 
              type="password" fullWidth helperText="Leave blank to keep current password"
            />
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Household Role</InputLabel>
              <Select name="editRole" defaultValue={editingUser?.role || 'member'} label="Household Role">
                <MenuItem value="viewer">Viewer (Read Only)</MenuItem>
                <MenuItem value="member">Member (Can Edit)</MenuItem>
                <MenuItem value="admin">Admin (Full Control)</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}