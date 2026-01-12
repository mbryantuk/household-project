import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Grid, Sheet, Button, 
  IconButton, Chip, Modal, ModalDialog, DialogTitle, DialogContent, 
  DialogActions, Input, List, ListItem, ListItemContent, 
  Divider, Table, Tooltip, Stack, FormControl, FormLabel
} from '@mui/joy';
import { 
  Add, Delete, Key, AddHome, 
  CloudDownload, CloudUpload, Restore, History, Person
} from '@mui/icons-material';

export default function AccessControl({
  api, // Use prop instead of context
  users, 
  currentUser,
  households, 
  onCreateHousehold,
  onDeleteHousehold,
  onRemoveUser,
  showNotification,
  confirmAction
}) {
  // Household Creation State
  const [openAddHouse, setOpenAddHouse] = useState(false);
  const [newHouse, setNewHouse] = useState({ name: '', adminUsername: 'Admin', adminPassword: '' });

  // Backup State
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const fileInputRef = useRef(null);

  const isSysAdmin = currentUser?.role === 'sysadmin';

  const fetchBackups = useCallback(async () => {
    if (!api) return;
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
      showNotification("System backup created successfully.", "success");
    } catch (err) {
      showNotification("Failed to create backup: " + err.message, "error");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = (filename) => {
    confirmAction(
      "Restore System",
      `Are you sure you want to restore ${filename}? This will overwrite ALL system data.`,
      async () => {
        setBackupLoading(true);
        try {
          await api.post(`/admin/backups/restore/${filename}`);
          showNotification("System restored. Refreshing...", "success");
          window.location.reload();
        } catch (err) {
          showNotification("Restore failed: " + err.message, "error");
          setBackupLoading(false);
        }
      }
    );
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
      .catch(err => showNotification("Download failed: " + err.message, "error"));
  };

  const handleUploadBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    confirmAction(
      "Upload & Restore Backup",
      "This will upload and restore the backup immediately. Current system data will be overwritten. Continue?",
      () => {
        const formData = new FormData();
        formData.append('backup', file);

        setBackupLoading(true);
        api.post('/admin/backups/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        .then(() => {
            showNotification("Backup restored successfully.", "success");
            window.location.reload();
        })
        .catch(err => {
            showNotification("Upload failed: " + err.message, "error");
            setBackupLoading(false);
        })
        .finally(() => {
            e.target.value = null;
        });
      }
    );
  };

  const handleCreateHouseSubmit = (e) => {
    e.preventDefault();
    onCreateHousehold(newHouse);
    setOpenAddHouse(false);
    setNewHouse({ name: '', adminUsername: 'Admin', adminPassword: '' });
  };

  return (
    <Box sx={{ maxWidth: 1000, margin: '0 auto', p: 3 }}>
      <Typography level="h2" mb={4} fontWeight="300">Platform Administration</Typography>
      
      {/* --- FULL SYSTEM BACKUP (SysAdmin Only) --- */}
      {isSysAdmin && (
        <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', mb: 4, bgcolor: 'background.surface' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography level="h4" startDecorator={<History />}>System Backup & Recovery</Typography>
              <Typography level="body-sm" color="neutral">
                Manage system-wide data snapshots including all households.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <input type="file" ref={fileInputRef} hidden accept=".zip" onChange={handleUploadBackup} />
                <Button variant="outlined" startDecorator={<CloudUpload />} onClick={() => fileInputRef.current.click()} disabled={backupLoading}>
                    Upload
                </Button>
                <Button variant="solid" startDecorator={<Add />} onClick={handleCreateBackup} loading={backupLoading}>
                    Create Full Backup
                </Button>
            </Box>
          </Box>
          
          <Sheet variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', borderRadius: 'sm' }}>
            <Table stickyHeader hoverRow>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Date Created</th>
                  <th>Size</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups && backups.map((b) => (
                  <tr key={b.filename}>
                    <td>{b.filename}</td>
                    <td>{new Date(b.created).toLocaleString()}</td>
                    <td>{(b.size / 1024 / 1024).toFixed(2)} MB</td>
                    <td style={{ textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Tooltip title="Download" variant="soft">
                            <IconButton onClick={() => handleDownloadBackup(b.filename)} size="sm">
                              <CloudDownload />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Restore System" variant="soft">
                            <IconButton onClick={() => handleRestoreBackup(b.filename)} size="sm" color="warning">
                              <Restore />
                            </IconButton>
                          </Tooltip>
                      </Box>
                    </td>
                  </tr>
                ))}
                {(!backups || backups.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>No system backups found.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Sheet>
        </Sheet>
      )}

      {/* --- TENANTS OVERVIEW --- */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography level="h4">Platform Households</Typography>
            <Typography level="body-sm" color="neutral">Global overview of all registered households.</Typography>
          </Box>
          <Button variant="solid" startDecorator={<AddHome />} onClick={() => setOpenAddHouse(true)}>Add Household</Button>
        </Box>
        
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
          <Table hoverRow>
            <thead>
              <tr>
                <th>Household Name</th>
                <th>Access Key</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {households && households.map((h) => (
                <tr key={h.id}>
                  <td><strong>{h.name}</strong></td>
                  <td>
                    <Chip startDecorator={<Key />} size="sm" color="primary" variant="outlined" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
                        {h.access_key}
                    </Chip>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <IconButton 
                      onClick={() => {
                          confirmAction(
                            "Delete Household",
                            `Are you sure you want to PERMANENTLY delete "${h.name}"? This cannot be undone.`,
                            () => onDeleteHousehold(h.id)
                          );
                      }} 
                      size="sm" 
                      color="danger"
                      variant="plain"
                    >
                      <Delete />
                    </IconButton>
                  </td>
                </tr>
              ))}
              {(!households || households.length === 0) && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'gray' }}>No households created yet.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Sheet>
      </Sheet>

      {/* --- GLOBAL SYSADMINS --- */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md' }}>
        <Typography level="h4" mb={1}>System Administrators</Typography>
        <Typography level="body-sm" color="neutral" mb={2}>
          Users with global access to the entire platform.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <List>
          {users && users.filter(u => u.system_role === 'sysadmin').map((u) => (
            <ListItem 
              key={u.id} 
              endAction={
                u.username !== currentUser?.username && (
                  <IconButton color="danger" size="sm" variant="plain" onClick={() => onRemoveUser(u.id)}><Delete /></IconButton>
                )
              }
            >
              <ListItemContent>
                  <Typography level="title-sm" startDecorator={<Person />}>{u.username}</Typography>
                  <Typography level="body-xs">{u.email || 'No email set'}</Typography>
              </ListItemContent>
            </ListItem>
          ))}
        </List>
      </Sheet>

      {/* --- DIALOG: CREATE HOUSEHOLD --- */}
      <Modal open={openAddHouse} onClose={() => setOpenAddHouse(false)}>
        <ModalDialog>
            <DialogTitle>Create New Household</DialogTitle>
            <DialogContent>
                <form onSubmit={handleCreateHouseSubmit}>
                    <Stack spacing={2} mt={1}>
                        <FormControl required>
                            <FormLabel>Household Name</FormLabel>
                            <Input 
                                value={newHouse.name} 
                                onChange={e => setNewHouse({...newHouse, name: e.target.value})} 
                            />
                        </FormControl>
                        
                        <Sheet variant="soft" sx={{ p: 2, borderRadius: 'sm' }}>
                            <Typography level="title-sm" mb={1}>Initial Administrator</Typography>
                            <Stack spacing={1}>
                                <FormControl required>
                                    <FormLabel>Username</FormLabel>
                                    <Input 
                                        size="sm"
                                        value={newHouse.adminUsername} 
                                        onChange={e => setNewHouse({...newHouse, adminUsername: e.target.value})} 
                                    />
                                </FormControl>
                                <FormControl required>
                                    <FormLabel>Password</FormLabel>
                                    <Input 
                                        type="password" size="sm"
                                        value={newHouse.adminPassword} 
                                        onChange={e => setNewHouse({...newHouse, adminPassword: e.target.value})} 
                                    />
                                </FormControl>
                            </Stack>
                        </Sheet>
                        
                        <DialogActions>
                            <Button variant="plain" color="neutral" onClick={() => setOpenAddHouse(false)}>Cancel</Button>
                            <Button type="submit" variant="solid">Create Household</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}