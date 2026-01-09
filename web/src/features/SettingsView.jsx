import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Paper, Tabs, Tab, TextField, Grid, 
  ToggleButtonGroup, ToggleButton, Divider, Button,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Avatar, Card, CardHeader,
  Stack, Tooltip, Switch, FormControlLabel, InputAdornment, LinearProgress, List, ListItem, ListItemText, ListItemSecondaryAction, useTheme, Alert
} from '@mui/material';
import { 
  ManageAccounts, Backup, SettingsBrightness, PersonAdd, Delete, 
  Edit, Save, Schedule, Download, Restore, CloudDownload,
  DarkMode, LightMode
} from '@mui/icons-material';

export default function SettingsView({ 
  household, users, currentUser, api, onUpdateHousehold, 
  onCreateUser, onUpdateUser, onRemoveUser,
  currentMode, onModeChange, useDracula, onDraculaChange,
  showNotification, confirmAction
}) {
  const [tab, setTab] = useState(0);
  const theme = useTheme();
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchBackups = useCallback(async () => {
    if (!isAdmin) return;
    setBackupLoading(true);
    try {
      const res = await api.get(`/households/${household.id}/backups`);
      setBackups(res.data || []);
    } catch (err) {
      console.error("Failed to fetch backups");
    } finally {
      setBackupLoading(false);
    }
  }, [api, household?.id, isAdmin]);

  useEffect(() => {
    if (tab === 1) fetchBackups(); // Tab 1 is now Maintenance
  }, [tab, fetchBackups]);

  const handleCreateBackup = async () => {
    try {
      await api.post(`/households/${household.id}/backups/trigger`);
      showNotification("Manual backup created.", "success");
      fetchBackups();
    } catch (err) {
      showNotification("Failed to create backup.", "error");
    }
  };

  const handleRestore = (filename) => {
    confirmAction(
      "Restore Backup",
      `Are you sure you want to restore ${filename}? This will overwrite current data.`,
      async () => {
        try {
          await api.post(`/households/${household.id}/backups/restore/${filename}`);
          showNotification("Restore successful. Refreshing...", "success");
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
          showNotification("Restore failed.", "error");
        }
      }
    );
  };

  const handleDownload = (filename) => {
    const url = `${api.defaults.baseURL}/households/${household.id}/backups/download/${filename}`;
    window.open(url, '_blank');
  };

  const handleDownloadRawDb = () => {
    const url = `${api.defaults.baseURL}/households/${household.id}/db/download`;
    window.open(url, '_blank');
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (editUser) {
        onUpdateUser(editUser.id, data);
    } else {
        onCreateUser({ ...data, householdId: household.id });
    }
    setUserDialogOpen(false);
    setEditUser(null);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="300" gutterBottom>Settings</Typography>
      
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }} variant="outlined">
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: 'action.hover' }}>
          <Tab icon={<ManageAccounts />} iconPosition="start" label="Users" />
          <Tab icon={<Backup />} iconPosition="start" label="Maintenance" />
          <Tab icon={<SettingsBrightness />} iconPosition="start" label="Appearance" />
        </Tabs>

        <Box sx={{ p: 4 }}>
          {/* TAB 0: USERS */}
          {tab === 0 && (
            <Box>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Local Users</Typography>
                    {isAdmin && <Button variant="outlined" startIcon={<PersonAdd />} onClick={() => { setEditUser(null); setUserDialogOpen(true); }}>Add User</Button>}
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead><TableRow><TableCell>User</TableCell><TableCell>Role</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                        <TableBody>
                            {users.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.username}</TableCell>
                                    <TableCell><Chip label={u.role?.toUpperCase()} size="small" variant="outlined" /></TableCell>
                                    <TableCell align="right">
                                        {isAdmin && (
                                            <>
                                                <IconButton color="primary" onClick={() => { setEditUser(u); setUserDialogOpen(true); }}><Edit /></IconButton>
                                                {currentUser.username !== u.username && (
                                                    <IconButton color="error" onClick={() => onRemoveUser(u.id)}><Delete /></IconButton>
                                                )}
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
          )}

          {/* TAB 1: MAINTENANCE */}
          {tab === 1 && (
            <Box>
                <Typography variant="h6" gutterBottom>Automated Backup Scheduler</Typography>
                <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const data = Object.fromEntries(new FormData(e.currentTarget));
                        onUpdateHousehold({
                            auto_backup: data.auto_backup === 'on' ? 1 : 0,
                            backup_retention: parseInt(data.backup_retention)
                        });
                    }}>
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <FormControlLabel
                                    control={<Switch name="auto_backup" defaultChecked={Boolean(household?.auto_backup)} />}
                                    label="Enable Nightly Backups"
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField 
                                    name="backup_retention" 
                                    label="Retention (Days)" 
                                    type="number" 
                                    size="small"
                                    defaultValue={household?.backup_retention || 7} 
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Button type="submit" variant="outlined" fullWidth startIcon={<Schedule />}>Update Schedule</Button>
                            </Grid>
                        </Grid>
                    </form>
                </Paper>

                <Typography variant="h6" gutterBottom>Manual Backup & Export</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>Backups are stored securely on the server. You can download your entire database at any time.</Alert>
                
                <Stack spacing={3}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button variant="contained" startIcon={<Backup />} onClick={handleCreateBackup}>Create Manual Backup</Button>
                        <Button variant="outlined" startIcon={<CloudDownload />} onClick={handleDownloadRawDb}>Download Live Database (.db)</Button>
                    </Box>

                    <Divider />
                    
                    <Typography variant="subtitle1" fontWeight="bold">Recent Backups</Typography>
                    {backupLoading ? <LinearProgress /> : (
                        <List>
                            {backups.map(b => (
                                <ListItem key={b.filename} divider>
                                    <ListItemText primary={b.filename} secondary={`${(b.size / 1024).toFixed(1)} KB - ${b.date}`} />
                                    <Stack direction="row" spacing={1}>
                                        <Tooltip title="Download"><IconButton onClick={() => handleDownload(b.filename)}><Download /></IconButton></Tooltip>
                                        <Tooltip title="Restore"><IconButton color="warning" onClick={() => handleRestore(b.filename)}><Restore /></IconButton></Tooltip>
                                    </Stack>
                                </ListItem>
                            ))}
                            {backups.length === 0 && <Typography variant="body2" color="text.secondary">No backups found.</Typography>}
                        </List>
                    )}
                </Stack>
            </Box>
          )}

          {/* TAB 2: APPEARANCE */}
          {tab === 2 && (
            <Box>
                <Typography variant="h6" gutterBottom>System Theme</Typography>
                <Stack spacing={4}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Mode</Typography>
                        <ToggleButtonGroup value={currentMode} exclusive onChange={(e, v) => v && onModeChange(v)}>
                            <ToggleButton value="light"><LightMode sx={{ mr: 1 }} /> Light</ToggleButton>
                            <ToggleButton value="dark"><DarkMode sx={{ mr: 1 }} /> Dark</ToggleButton>
                            <ToggleButton value="system"><SettingsBrightness sx={{ mr: 1 }} /> System</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box>
                        <FormControlLabel
                            control={<Switch checked={useDracula} onChange={(e) => onDraculaChange(e.target.checked)} />}
                            label={
                                <Box>
                                    <Typography variant="body1">Enable Dracula Palette</Typography>
                                    <Typography variant="caption" color="text.secondary">Use high-contrast purple and pink tones for Dark Mode</Typography>
                                </Box>
                            }
                        />
                    </Box>
                </Stack>
            </Box>
          )}
        </Box>
      </Paper>

      {/* USER DIALOG */}
      <Dialog open={userDialogOpen} onClose={() => { setUserDialogOpen(false); setEditUser(null); }} fullWidth maxWidth="xs">
        <form onSubmit={handleUserSubmit}>
            <DialogTitle>{editUser ? 'Edit User' : 'Add Local User'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField name="username" label="Username" defaultValue={editUser?.username} fullWidth required />
                    {!editUser && <TextField name="password" label="Password" type="password" fullWidth required />}
                    <FormControl fullWidth>
                        <InputLabel>Role</InputLabel>
                        <Select name="role" defaultValue={editUser?.role || "member"} label="Role">
                            <MenuItem value="admin">Admin (Full Access)</MenuItem>
                            <MenuItem value="member">Member (Read/Write)</MenuItem>
                            <MenuItem value="viewer">Viewer (Read-Only)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => { setUserDialogOpen(false); setEditUser(null); }}>Cancel</Button>
                <Button type="submit" variant="contained">{editUser ? 'Save Changes' : 'Create User'}</Button>
            </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
