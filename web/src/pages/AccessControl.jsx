import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardContent, Button, 
  IconButton, Chip, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, List, ListItem, ListItemText, 
  Divider, Stack, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert
} from '@mui/material';
import { Add, Delete, Edit, Home, Person, VpnKey, AddHome, Key, Refresh, PersonAdd, CloudDownload, CloudUpload, Restore, History } from '@mui/icons-material';

export default function AccessControl({
  users, 
  currentUser,
  households, 
  onCreateUser, 
  onCreateHousehold,
  onUpdateHousehold,
  onRemoveUser
}) {
  const { api } = useOutletContext();
  const [openAddUser, setOpenAddUser] = useState(false);  
  const [editingUser, setEditingUser] = useState(null); 
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'member' });

  // Household Creation State
  const [openAddHouse, setOpenAddHouse] = useState(false);
  const [newHouse, setNewHouse] = useState({ name: '', adminUsername: 'Admin', adminPassword: '' });

  // Household Editing State
  const [editingHousehold, setEditingHousehold] = useState(null);
  const [openEditHousehold, setOpenEditHousehold] = useState(false);
  const [currentHouseholdData, setCurrentHouseholdData] = useState({ name: '', access_key: '', theme: 'default' });

  // Backup State
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const fileInputRef = useRef(null);

  const isSysAdmin = currentUser?.role === 'sysadmin';

  const fetchBackups = useCallback(async () => {
    try {
      const res = await api.get('/admin/backups');
      setBackups(res.data);
    } catch (err) {
      console.error("Failed to fetch backups", err);
    }
  }, [api]);

  useEffect(() => {
    if (isSysAdmin) {
      fetchBackups();
    }
  }, [isSysAdmin, fetchBackups]);

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      await api.post('/admin/backups/trigger');
      await fetchBackups();
      alert("Backup created successfully.");
    } catch (err) {
      alert("Failed to create backup: " + err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to restore ${filename}? This will overwrite current data.`)) return;
    setBackupLoading(true);
    try {
      await api.post(`/admin/backups/restore/${filename}`);
      alert("System restored. Please refresh the page.");
      window.location.reload();
    } catch (err) {
      alert("Restore failed: " + err.message);
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = (filename) => {
    // Direct download link
    const link = document.createElement('a');
    link.href = `${api.defaults.baseURL}/admin/backups/download/${filename}?token=${localStorage.getItem('token')}`; // Assuming simple token passing or cookie
    // Since we use Bearer token header, standard link href might fail if API requires header.
    // So we use axios to get blob.
    api.get(`/admin/backups/download/${filename}`, { responseType: 'blob' })
      .then(response => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(err => alert("Download failed: " + err.message));
  };

  const handleUploadBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!window.confirm("This will upload and restore the backup immediately. Current data will be overwritten. Continue?")) {
        e.target.value = null;
        return;
    }

    const formData = new FormData();
    formData.append('backup', file);

    setBackupLoading(true);
    api.post('/admin/backups/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then(() => {
        alert("Backup restored successfully.");
        window.location.reload();
    })
    .catch(err => {
        alert("Upload failed: " + err.message);
        setBackupLoading(false);
    })
    .finally(() => {
        e.target.value = null;
    });
  };

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

  return (
    <Box sx={{ maxWidth: 1000, margin: '0 auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>Platform Administration</Typography>
      
      {/* --- BACKUP & RECOVERY SECTION (SysAdmin Only) --- */}
      {isSysAdmin && (
        <Card variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 4, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <History /> Backup & Recovery
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage system-wide data snapshots.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <input type="file" ref={fileInputRef} hidden accept=".zip" onChange={handleUploadBackup} />
                <Button variant="outlined" startIcon={<CloudUpload />} onClick={() => fileInputRef.current.click()} disabled={backupLoading}>
                    Upload
                </Button>
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateBackup} disabled={backupLoading}>
                    Create Backup
                </Button>
            </Box>
          </Box>
          
          {backupLoading && <Box sx={{ width: '100%', mb: 2 }}><CircularProgress size={20} /> Processing...</Box>}

          <TableContainer component={Paper} variant="outlined" elevation={0} sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Date Created</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.filename}>
                    <TableCell>{b.filename}</TableCell>
                    <TableCell>{new Date(b.created).toLocaleString()}</TableCell>
                    <TableCell>{(b.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleDownloadBackup(b.filename)} title="Download">
                        <CloudDownload fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handleRestoreBackup(b.filename)} title="Restore" color="warning">
                        <Restore fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {backups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>No backups found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* --- TENANTS SECTION (SysAdmin Only) --- */}
      {isSysAdmin && (
        <Card variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">Platform Tenants</Typography>
              <Typography variant="body2" color="text.secondary">Active households and their access keys.</Typography>
            </Box>
            <Button variant="contained" startIcon={<AddHome />} onClick={() => setOpenAddHouse(true)}>New Household</Button>
          </Box>
          
          <TableContainer component={Paper} variant="outlined" elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Household Name</TableCell>
                  <TableCell>Access Key</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {households && households.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell><strong>{h.name}</strong></TableCell>
                    <TableCell>
                      <Chip icon={<Key fontSize="small"/>} label={h.access_key} size="small" color="primary" variant="outlined" sx={{ fontWeight: 'bold', letterSpacing: 1 }} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleEditHouseholdClick(h)} size="small" title="Edit Household">
                        <Edit fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!households || households.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>No households created yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* --- SYSTEM USERS SECTION --- */}
      <Card variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">System-Wide Users</Typography>
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setOpenAddUser(true)}>Add User</Button>
        </Box>
        <Divider sx={{ my: 2 }} />
        <List>
          {users && users.map((u) => (
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
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
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
                <IconButton onClick={() => setCurrentHouseholdData(prev => ({...prev, access_key: Math.random().toString(16).slice(2, 8).toUpperCase()}))} size="small">
                  <Refresh fontSize="small" />
                </IconButton>
              ),
            }}
            helperText="Click refresh to generate a new key."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditHousehold(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateHouseholdSubmit}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}