import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, TabPanel, Input, Grid, 
  ButtonGroup, Button, Table, Chip, IconButton, FormControl, FormLabel, Select, Option,
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Avatar, 
  Stack, Tooltip, Switch, LinearProgress, List, ListItem, ListItemContent, ListItemDecorator, 
  Alert, Divider
} from '@mui/joy';
import { 
  ManageAccounts, Backup, SettingsBrightness, PersonAdd, Edit, Delete, 
  Schedule, CloudDownload, Download, Restore, LightMode, DarkMode, ExitToApp, Security,
  ToggleOn, ToggleOff
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

export default function SettingsView({
  household, users, currentUser, api, onUpdateHousehold, 
  currentMode, onModeChange, useDracula, onDraculaChange,
  showNotification, confirmAction
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const isDark = currentMode === 'dark' || (currentMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [localUsers, setLocalUsers] = useState(users || []);
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedUserEmoji, setSelectedUserEmoji] = useState('👤');

  const isAdmin = currentUser?.role === 'admin';

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get(`/households/${household.id}/users`);
      setLocalUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users");
    }
  }, [api, household?.id]);

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
    if (tab === 0) fetchUsers();
    if (tab === 1) fetchBackups();
  }, [tab, fetchBackups, fetchUsers]);

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    data.avatar = selectedUserEmoji;

    try {
        if (editUser) {
            await api.put(`/households/${household.id}/users/${editUser.id}`, data);
            showNotification("User permissions updated.", "success");
        } else {
            await api.post(`/households/${household.id}/users`, data);
            showNotification(`Invite sent to ${data.email}`, "success");
        }
        fetchUsers();
        setUserDialogOpen(false);
        setEditUser(null);
    } catch (err) {
        showNotification(err.response?.data?.error || "Operation failed", "danger");
    }
  };

  const handleToggleActivation = async (user) => {
    const newStatus = !user.is_active;
    try {
        await api.put(`/households/${household.id}/users/${user.id}`, { is_active: newStatus });
        showNotification(`User ${newStatus ? 'activated' : 'deactivated'}.`, "success");
        fetchUsers();
    } catch (err) {
        showNotification("Failed to update user status.", "danger");
    }
  };

  const handleRemoveUser = (userId, userName) => {
    const isSelf = userId === currentUser.id;
    confirmAction(
        isSelf ? "Leave Household" : "Remove User",
        isSelf 
            ? `Are you sure you want to leave ${household.name}? You will lose access to all data in this household.`
            : `Are you sure you want to remove ${userName} from this household? They will no longer be able to access this data.`,
        async () => {
            try {
                await api.delete(`/households/${household.id}/users/${userId}`);
                showNotification(isSelf ? "You have left the household." : "User removed.", "success");
                if (isSelf) window.location.href = '/select-household';
                else fetchUsers();
            } catch (err) {
                showNotification("Failed to remove user.", "danger");
            }
        }
    );
  };

  const openEditUser = (user) => {
    setEditUser(user);
    setSelectedUserEmoji(user.avatar || '👤');
    setUserDialogOpen(true);
  };

  const openAddUser = () => {
    setEditUser(null);
    setSelectedUserEmoji('👤');
    setUserDialogOpen(true);
  };

  return (
    <Box>
      <Typography level="h2" fontWeight="300" mb={2}>Household Settings</Typography>
      
      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden', minHeight: 400 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ bgcolor: 'transparent' }}>
          <TabList tabFlex={1} sx={{ p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2 }}>
            <Tab variant={tab === 0 ? 'solid' : 'plain'} color={tab === 0 ? 'primary' : 'neutral'} indicatorInset>
                <ListItemDecorator><ManageAccounts /></ListItemDecorator> Team & Roles
            </Tab>
            <Tab variant={tab === 1 ? 'solid' : 'plain'} color={tab === 1 ? 'primary' : 'neutral'} indicatorInset>
                <ListItemDecorator><Backup /></ListItemDecorator> Data & Maintenance
            </Tab>
            <Tab variant={tab === 2 ? 'solid' : 'plain'} color={tab === 2 ? 'primary' : 'neutral'} indicatorInset>
                <ListItemDecorator><SettingsBrightness /></ListItemDecorator> Appearance
            </Tab>
          </TabList>

          <Box sx={{ p: 3 }}>
            {tab === 0 && (
              <Box>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography level="h4">Authorized Users</Typography>
                        <Typography level="body-sm">Manage who has access to your household data.</Typography>
                      </Box>
                      {isAdmin && <Button variant="solid" color="primary" startDecorator={<PersonAdd />} onClick={openAddUser}>Invite Collaborator</Button>}
                  </Box>
                  
                  <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
                    <Table hoverRow sx={{ '& tr > *': { verticalAlign: 'middle' } }}>
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}></th>
                            <th>User</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Permissions</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                            {localUsers.map(u => (
                                <tr key={u.id}>
                                    <td>
                                      <Avatar size="sm" sx={{ bgcolor: u.avatar ? getEmojiColor(u.avatar, isDark) : 'neutral.solidBg', opacity: u.is_active ? 1 : 0.5 }}>
                                        {u.avatar || u.first_name?.[0] || u.email?.[0]?.toUpperCase()}
                                      </Avatar>
                                    </td>
                                    <td>
                                        <Typography level="title-sm" sx={{ textDecoration: u.is_active ? 'none' : 'line-through', opacity: u.is_active ? 1 : 0.6 }}>
                                            {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'New User'}
                                        </Typography>
                                    </td>
                                    <td><Typography level="body-xs" sx={{ opacity: u.is_active ? 1 : 0.6 }}>{u.email || '-'}</Typography></td>
                                    <td>
                                        <Chip size="sm" variant="soft" color={u.is_active ? 'success' : 'neutral'}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </Chip>
                                    </td>
                                    <td>
                                        <Chip 
                                            size="sm" variant="soft" 
                                            color={u.role === 'admin' ? 'danger' : (u.role === 'member' ? 'primary' : 'neutral')}
                                            startDecorator={<Security sx={{ fontSize: '14px' }} />}
                                        >
                                            {u.role?.toUpperCase()}
                                        </Chip>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                            {isAdmin && currentUser.id !== u.id && (
                                                <Tooltip title={u.is_active ? "Deactivate" : "Activate"} variant="soft">
                                                    <IconButton size="sm" color={u.is_active ? "warning" : "success"} onClick={() => handleToggleActivation(u)}>
                                                        {u.is_active ? <ToggleOn /> : <ToggleOff />}
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {isAdmin && (
                                                <Tooltip title="Edit Permissions" variant="soft"><IconButton size="sm" color="primary" onClick={() => openEditUser(u)}><Edit /></IconButton></Tooltip>
                                            )}
                                            {currentUser.id !== u.id ? (
                                                isAdmin && <Tooltip title="Remove User" variant="soft"><IconButton size="sm" color="danger" onClick={() => handleRemoveUser(u.id, u.first_name || u.email)}><Delete /></IconButton></Tooltip>
                                            ) : (
                                                <Tooltip title="Leave Household" variant="soft"><IconButton size="sm" color="warning" onClick={() => handleRemoveUser(u.id, 'yourself')}><ExitToApp /></IconButton></Tooltip>
                                            )}
                                        </Box>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                  </Sheet>
              </Box>
            )}

            {tab === 1 && (
              <Box>
                  <Typography level="h4" mb={2}>Automated Backup Scheduler</Typography>
                  <Sheet variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 'md' }}>
                      <form onSubmit={(e) => {
                          e.preventDefault();
                          const data = Object.fromEntries(new FormData(e.currentTarget));
                          onUpdateHousehold({
                              auto_backup: data.auto_backup === 'on' ? 1 : 0,
                              backup_retention: parseInt(data.backup_retention)
                          });
                      }}>
                          <Grid container spacing={3} alignItems="center">
                              <Grid xs={12} md={4}>
                                  <FormControl orientation="horizontal" sx={{ gap: 1 }}>
                                      <Switch name="auto_backup" defaultChecked={Boolean(household?.auto_backup)} />
                                      <FormLabel>Enable Nightly Backups</FormLabel>
                                  </FormControl>
                              </Grid>
                              <Grid xs={12} md={4}>
                                  <FormControl>
                                    <FormLabel>Retention (Days)</FormLabel>
                                    <Input 
                                        name="backup_retention" 
                                        type="number" 
                                        defaultValue={household?.backup_retention || 7} 
                                    />
                                  </FormControl>
                              </Grid>
                              <Grid xs={12} md={4}>
                                  <Button type="submit" variant="outlined" fullWidth startDecorator={<Schedule />}>Update Schedule</Button>
                              </Grid>
                          </Grid>
                      </form>
                  </Sheet>

                  <Typography level="h4" mb={2}>Manual Backup & Export</Typography>
                  <Alert color="info" sx={{ mb: 3 }}>Backups are stored securely on the server. You can download your entire database at any time.</Alert>
                  
                  <Stack spacing={3}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button variant="solid" startDecorator={<Backup />} onClick={() => {
                              api.post(`/households/${household.id}/backups/trigger`)
                                .then(() => { showNotification("Manual backup created.", "success"); fetchBackups(); })
                                .catch(() => showNotification("Failed to create backup.", "danger"));
                          }}>Create Manual Backup</Button>
                          <Button variant="outlined" startDecorator={<CloudDownload />} onClick={() => {
                              const url = `${api.defaults.baseURL}/households/${household.id}/db/download`;
                              window.open(url, '_blank');
                          }}>Download Live Database (.db)</Button>
                      </Box>

                      <Divider />
                      
                      <Typography level="title-lg">Recent Backups</Typography>
                      {backupLoading ? <LinearProgress /> : (
                          <List variant="outlined" sx={{ borderRadius: 'sm' }}>
                              {backups.map((b, i) => (
                                  <Box key={b.filename}>
                                      <ListItem endAction={
                                          <Stack direction="row" spacing={1}>
                                              <Tooltip title="Download" variant="soft">
                                                <IconButton size="sm" onClick={() => {
                                                    const url = `${api.defaults.baseURL}/households/${household.id}/backups/download/${b.filename}`;
                                                    window.open(url, '_blank');
                                                }}><Download /></IconButton>
                                              </Tooltip>
                                              <Tooltip title="Restore" variant="soft">
                                                <IconButton size="sm" color="warning" onClick={() => {
                                                    confirmAction(
                                                        "Restore Backup",
                                                        `Are you sure you want to restore ${b.filename}? This will overwrite current data.`,
                                                        async () => {
                                                            try {
                                                                await api.post(`/households/${household.id}/backups/restore/${b.filename}`);
                                                                showNotification("Restore successful. Refreshing...", "success");
                                                                setTimeout(() => window.location.reload(), 1500);
                                                            } catch (err) {
                                                                showNotification("Restore failed.", "danger");
                                                            }
                                                        }
                                                    );
                                                }}><Restore /></IconButton>
                                              </Tooltip>
                                          </Stack>
                                      }>
                                          <ListItemContent>
                                              <Typography level="title-sm">{b.filename}</Typography>
                                              <Typography level="body-xs">{(b.size / 1024).toFixed(1)} KB - {b.date}</Typography>
                                          </ListItemContent>
                                      </ListItem>
                                      {i < backups.length - 1 && <Divider />}
                                  </Box>
                              ))}
                              {backups.length === 0 && <ListItem><ListItemContent>No backups found.</ListItemContent></ListItem>}
                          </List>
                      )}
                  </Stack>
              </Box>
            )}

            {tab === 2 && (
              <Box>
                  <Typography level="h4" mb={2}>System Theme</Typography>
                  <Stack spacing={4}>
                      <Box>
                          <Typography level="title-md" mb={1}>Mode</Typography>
                          <ButtonGroup variant="soft" color="primary" spacing={0.5}>
                              <Button 
                                variant={currentMode === 'light' ? 'solid' : 'soft'} 
                                onClick={() => onModeChange('light')}
                                startDecorator={<LightMode />}
                              >Light</Button>
                              <Button 
                                variant={currentMode === 'dark' ? 'solid' : 'soft'} 
                                onClick={() => onModeChange('dark')}
                                startDecorator={<DarkMode />}
                              >Dark</Button>
                              <Button 
                                variant={currentMode === 'system' ? 'solid' : 'soft'} 
                                onClick={() => onModeChange('system')}
                                startDecorator={<SettingsBrightness />}
                              >System</Button>
                          </ButtonGroup>
                      </Box>

                      <Box>
                          <FormControl orientation="horizontal" sx={{ gap: 2, alignItems: 'center' }}>
                              <Switch checked={useDracula} onChange={(e) => onDraculaChange(e.target.checked)} />
                              <Box>
                                  <Typography level="title-md">Enable Dracula Palette</Typography>
                                  <Typography level="body-sm">Use high-contrast purple and pink tones</Typography>
                              </Box>
                          </FormControl>
                      </Box>

                      <Divider />
                      
                      <Box sx={{ textAlign: 'center', opacity: 0.6 }}>
                          <Typography level="body-xs">Totem Application Version</Typography>
                          <Typography level="body-sm" fontWeight="bold">v2.1 (Mobile Stability)</Typography>
                      </Box>
                  </Stack>
              </Box>
            )}
          </Box>
        </Tabs>
      </Sheet>

      <Modal open={userDialogOpen} onClose={() => { setUserDialogOpen(false); setEditUser(null); }}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
            <DialogTitle>
                <ListItemDecorator sx={{ color: 'primary.main' }}><PersonAdd /></ListItemDecorator>
                {editUser ? 'Edit Permissions' : 'Invite to Household'}
            </DialogTitle>
            <DialogContent>
                <Typography level="body-sm" mb={2}>
                    {editUser 
                        ? `Update roles and profile for ${editUser.email}.`
                        : "Enter the user's email to grant them access to this household."}
                </Typography>
                <form onSubmit={handleUserSubmit}>
                    <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                          <Box 
                            sx={{ 
                              width: 64, height: 64, borderRadius: '50%', 
                              bgcolor: getEmojiColor(selectedUserEmoji, isDark),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '2rem', cursor: 'pointer', border: '2px solid', borderColor: 'primary.solidBg'
                            }}
                            onClick={() => setEmojiPickerOpen(true)}
                          >
                            {selectedUserEmoji}
                          </Box>
                        </Box>
                        
                        <Stack direction="row" spacing={2}>
                            <FormControl required sx={{ flex: 1 }}>
                                <FormLabel>First Name</FormLabel>
                                <Input name="firstName" defaultValue={editUser?.first_name} placeholder="e.g. John" />
                            </FormControl>
                            <FormControl required sx={{ flex: 1 }}>
                                <FormLabel>Last Name</FormLabel>
                                <Input name="lastName" defaultValue={editUser?.last_name} placeholder="e.g. Smith" />
                            </FormControl>
                        </Stack>
                        
                        <FormControl required disabled={!!editUser}>
                            <FormLabel>Email Address</FormLabel>
                            <Input name="email" type="email" defaultValue={editUser?.email} placeholder="collaborator@example.com" />
                        </FormControl>

                        <FormControl required>
                            <FormLabel>Assigned Role</FormLabel>
                            <Select name="role" defaultValue={editUser?.role || "member"}>
                                <Option value="admin">Admin (Full Control)</Option>
                                <Option value="member">Member (Read/Write)</Option>
                                <Option value="viewer">Viewer (Read-Only)</Option>
                            </Select>
                            <Typography level="body-xs" mt={1}>
                                Admins can manage users and backups. Members can edit data. Viewers can only see data.
                            </Typography>
                        </FormControl>
                        
                        {!editUser && (
                            <FormControl>
                                <FormLabel>Initial Password (Optional)</FormLabel>
                                <Input name="password" type="password" placeholder="Defaults to secure random" />
                            </FormControl>
                        )}

                        <DialogActions sx={{ mt: 2 }}>
                            <Button variant="plain" color="neutral" onClick={() => { setUserDialogOpen(false); setEditUser(null); }}>Cancel</Button>
                            <Button type="submit" variant="solid" color="primary">{editUser ? 'Save Changes' : 'Send Invite'}</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
            setSelectedUserEmoji(emoji);
            setEmojiPickerOpen(false);
        }}
        title="Select User Emoji"
      />
    </Box>
  );
}