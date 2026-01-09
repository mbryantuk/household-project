import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Button, 
  IconButton, Chip, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, List, ListItem, ListItemText, 
  Divider, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  CircularProgress, Tooltip
} from '@mui/material';
import { 
  Add, Delete, Key, AddHome, 
  CloudDownload, CloudUpload, Restore, History 
} from '@mui/icons-material';

export default function AccessControl({
  users, 
  currentUser,
  households, 
  onCreateHousehold,
  onDeleteHousehold,
  onRemoveUser
}) {
  const { api } = useOutletContext();
  
  // Household Creation State
  const [openAddHouse, setOpenAddHouse] = useState(false);
  const [newHouse, setNewHouse] = useState({ name: '', adminUsername: 'Admin', adminPassword: '' });

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
    
    if (!window.confirm("This will upload and restore the backup immediately. Current system data will be overwritten. Continue?")) {
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

  const handleCreateHouseSubmit = (e) => {
    e.preventDefault();
    onCreateHousehold(newHouse);
    setOpenAddHouse(false);
    setNewHouse({ name: '', adminUsername: 'Admin', adminPassword: '' });
  };

  return (
    <Box sx={{ maxWidth: 1000, margin: '0 auto', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: '300' }}>Platform Administration</Typography>
      
      {/* --- FULL SYSTEM BACKUP (SysAdmin Only) --- */}
      {isSysAdmin && (
        <Card variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 4, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <History /> System Backup & Recovery
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage system-wide data snapshots including all households.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <input type="file" ref={fileInputRef} hidden accept=".zip" onChange={handleUploadBackup} />
                <Button variant="outlined" startIcon={<CloudUpload />} onClick={() => fileInputRef.current.click()} disabled={backupLoading}>
                    Upload
                </Button>
                <Button variant="contained" startIcon={<Add />} onClick={handleCreateBackup} disabled={backupLoading}>
                    {backupLoading ? <CircularProgress size={20} /> : "Create Full Backup"}
                </Button>
            </Box>
          </Box>
          
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
                      <Tooltip title="Download">
                        <IconButton onClick={() => handleDownloadBackup(b.filename)} size="small">
                          <CloudDownload fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Restore System">
                        <IconButton onClick={() => handleRestoreBackup(b.filename)} size="small" color="warning">
                          <Restore fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {backups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>No system backups found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* --- TENANTS OVERVIEW --- */}
      <Card variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6">Platform Households</Typography>
            <Typography variant="body2" color="text.secondary">Global overview of all registered households.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddHome />} onClick={() => setOpenAddHouse(true)}>Add Household</Button>
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
                    <IconButton 
                      onClick={() => {
                          if (window.confirm(`Are you sure you want to PERMANENTLY delete "${h.name}"? This cannot be undone.`)) {
                              onDeleteHousehold(h.id);
                          }
                      }} 
                      size="small" 
                      color="error"
                      title="Delete Household"
                    >
                      <Delete fontSize="small" />
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

      {/* --- GLOBAL SYSADMINS --- */}
      <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>System Administrators</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Users with global access to the entire platform.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <List dense>
          {users && users.filter(u => u.system_role === 'sysadmin').map((u) => (
            <ListItem 
              key={u.id} 
              divider
              secondaryAction={
                u.username !== currentUser?.username && (
                  <IconButton color="error" size="small" onClick={() => onRemoveUser(u.id)}><Delete fontSize="small" /></IconButton>
                )
              }
            >
              <ListItemText primary={u.username} secondary={u.email || 'No email set'} />
            </ListItem>
          ))}
        </List>
      </Card>

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
            <Button type="submit" variant="contained">Create Household</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
