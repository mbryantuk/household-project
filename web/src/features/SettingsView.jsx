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
  Schedule, CloudDownload, Download, Restore, LightMode, DarkMode 
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

export default function SettingsView({
  household, users, currentUser, api, onUpdateHousehold, 
  onCreateUser, onUpdateUser, onRemoveUser,
  currentMode, onModeChange, useDracula, onDraculaChange,
  showNotification, confirmAction
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const isDark = currentMode === 'dark' || (currentMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedUserEmoji, setSelectedUserEmoji] = useState('👤');

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
    if (tab === 1) fetchBackups();
  }, [tab, fetchBackups]);

  const handleCreateBackup = async () => {
    try {
      await api.post(`/households/${household.id}/backups/trigger`);
      showNotification("Manual backup created.", "success");
      fetchBackups();
    } catch (err) {
      showNotification("Failed to create backup.", "danger");
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
          showNotification("Restore failed.", "danger");
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
    data.avatar = selectedUserEmoji;
    if (editUser) {
        onUpdateUser(editUser.id, data);
    } else {
        onCreateUser({ ...data, householdId: household.id });
    }
    setUserDialogOpen(false);
    setEditUser(null);
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
      <Typography level="h2" fontWeight="300" mb={2}>Settings</Typography>
      
      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden', minHeight: 400 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ bgcolor: 'transparent' }}>
          <TabList tabFlex={1} sx={{ p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2 }}>
            <Tab variant={tab === 0 ? 'solid' : 'plain'} color={tab === 0 ? 'primary' : 'neutral'} indicatorInset>
                <ListItemDecorator><ManageAccounts /></ListItemDecorator> Users
            </Tab>
            <Tab variant={tab === 1 ? 'solid' : 'plain'} color={tab === 1 ? 'primary' : 'neutral'} indicatorInset>
                <ListItemDecorator><Backup /></ListItemDecorator> Maintenance
            </Tab>
            <Tab variant={tab === 2 ? 'solid' : 'plain'} color={tab === 2 ? 'primary' : 'neutral'} indicatorInset>
                <ListItemDecorator><SettingsBrightness /></ListItemDecorator> Appearance
            </Tab>
          </TabList>

          <Box sx={{ p: 3 }}>
            {tab === 0 && (
              <Box>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography level="h4">Household Members</Typography>
                      {isAdmin && <Button variant="outlined" startDecorator={<PersonAdd />} onClick={openAddUser}>Invite User</Button>}
                  </Box>
                  <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
                    <Table hoverRow>
                        <thead>
                          <tr>
                            <th style={{ width: 60 }}></th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                      <Avatar size="sm" sx={{ bgcolor: u.avatar ? getEmojiColor(u.avatar, isDark) : 'neutral.solidBg' }}>
                                        {u.avatar || u.first_name?.[0] || u.email?.[0]?.toUpperCase()}
                                      </Avatar>
                                    </td>
                                    <td>{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.username || 'User')}</td>
                                    <td>{u.email || '-'}</td>
                                    <td><Chip size="sm" variant="outlined">{u.role?.toUpperCase()}</Chip></td>
                                    <td style={{ textAlign: 'right' }}>
                                        {isAdmin && (
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                <IconButton size="sm" color="primary" onClick={() => navigate(`users/${u.id}`)}><Edit /></IconButton>
                                                {currentUser.id !== u.id && (
                                                    <IconButton size="sm" color="danger" onClick={() => onRemoveUser(u.id)}><Delete /></IconButton>
                                                )}
                                            </Box>
                                        )}
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
                          <Button variant="solid" startDecorator={<Backup />} onClick={handleCreateBackup}>Create Manual Backup</Button>
                          <Button variant="outlined" startDecorator={<CloudDownload />} onClick={handleDownloadRawDb}>Download Live Database (.db)</Button>
                      </Box>

                      <Divider />
                      
                      <Typography level="title-lg">Recent Backups</Typography>
                      {backupLoading ? <LinearProgress /> : (
                          <List variant="outlined" sx={{ borderRadius: 'sm' }}>
                              {backups.map((b, i) => (
                                  <Box key={b.filename}>
                                      <ListItem endAction={
                                          <Stack direction="row" spacing={1}>
                                              <Tooltip title="Download" variant="soft"><IconButton size="sm" onClick={() => handleDownload(b.filename)}><Download /></IconButton></Tooltip>
                                              <Tooltip title="Restore" variant="soft"><IconButton size="sm" color="warning" onClick={() => handleRestore(b.filename)}><Restore /></IconButton></Tooltip>
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
                  </Stack>
              </Box>
            )}
          </Box>
        </Tabs>
      </Sheet>

      <Modal open={userDialogOpen} onClose={() => { setUserDialogOpen(false); setEditUser(null); }}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
            <DialogTitle>{editUser ? 'Edit User' : 'Invite User'}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleUserSubmit}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
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
                                <Input name="first_name" defaultValue={editUser?.first_name} />
                            </FormControl>
                            <FormControl required sx={{ flex: 1 }}>
                                <FormLabel>Last Name</FormLabel>
                                <Input name="last_name" defaultValue={editUser?.last_name} />
                            </FormControl>
                        </Stack>
                        
                        <FormControl required>
                            <FormLabel>Email Address</FormLabel>
                            <Input name="email" defaultValue={editUser?.email} />
                        </FormControl>

                        <FormControl required>
                            <FormLabel>Role</FormLabel>
                            <Select name="role" defaultValue={editUser?.role || "member"}>
                                <Option value="admin">Admin (Full Access)</Option>
                                <Option value="member">Member (Read/Write)</Option>
                                <Option value="viewer">Viewer (Read-Only)</Option>
                            </Select>
                        </FormControl>
                        
                        <FormControl>
                            <FormLabel>{editUser ? 'New Password (Optional)' : 'Initial Password (Optional)'}</FormLabel>
                            <Input name="password" type="password" placeholder="Leave blank to auto-generate/keep" />
                        </FormControl>

                        <DialogActions>
                            <Button variant="plain" color="neutral" onClick={() => { setUserDialogOpen(false); setEditUser(null); }}>Cancel</Button>
                            <Button type="submit" variant="solid">{editUser ? 'Save Changes' : 'Invite User'}</Button>
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