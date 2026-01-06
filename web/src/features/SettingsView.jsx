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
  AddCircle, HomeWork, Warning 
} from '@mui/icons-material';
import TotemIcon from '../components/TotemIcon';
import MembersView from './MembersView';

export default function SettingsView({ 
  household, users, currentUser, members,
  onAddMember, onRemoveMember, onUpdateMember,
  onAddUser, onRemoveUser, onUpdateRole, onCreateUser, 
  adminHouseholds, onManageAccess, onUpdateHousehold,
  onDeleteHousehold 
}) {
  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  // 🛡️ PERMISSION CHECK: Determine if the user has Admin rights to this house
  const isHouseholdAdmin = household?.role === 'admin' || currentUser?.role === 'sysadmin';

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

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Tabs 
        value={tab} 
        onChange={(e, v) => setTab(v)} 
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}
      >
        <Tab label="General" icon={<Info fontSize="small"/>} iconPosition="start" />
        <Tab label="Residents" icon={<Groups fontSize="small"/>} iconPosition="start" />
        <Tab label="App Access" icon={<ManageAccounts fontSize="small"/>} iconPosition="start" />
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

      {/* --- TAB 1: RESIDENTS --- */}
      {tab === 1 && (
        <Box sx={{ p: 3 }}>
          <MembersView 
            members={members} 
            onAddMember={onAddMember} 
            onRemoveMember={onRemoveMember} 
            onUpdateMember={onUpdateMember} 
          />
        </Box>
      )}

      {/* --- TAB 2: APP ACCESS --- */}
      {tab === 2 && (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Authorized Users</Typography>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<AddCircle />} 
              onClick={() => setCreateOpen(true)}
              disabled={!isHouseholdAdmin}
            >
              Create User
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users && users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">{u.username}</Typography>
                      <Typography variant="caption">{u.email}</Typography>
                    </TableCell>
                    <TableCell><Chip label={u.role} size="small" /></TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        onClick={() => onManageAccess(u)}
                        disabled={!isHouseholdAdmin}
                      >
                        <HomeWork fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => onRemoveUser(u.id)}
                        disabled={!isHouseholdAdmin || u.username === currentUser.username} // Cannot delete self
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

      {/* CREATE USER DIALOG */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle>Create Account</DialogTitle>
          <DialogContent>
            <TextField margin="dense" name="newUsername" label="Username" fullWidth required />
            <TextField margin="dense" name="newEmail" label="Email" type="email" fullWidth required />
            <TextField margin="dense" name="newPassword" label="Password" type="password" fullWidth required />
            <FormControl fullWidth margin="dense">
              <InputLabel>Initial Role</InputLabel>
              <Select name="newRole" defaultValue="member">
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}