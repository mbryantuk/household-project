import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Grid, 
  ButtonGroup, Button, Table, Chip, IconButton, FormControl, FormLabel, Select, Option,
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Avatar, 
  Stack, Tooltip, Switch, LinearProgress, List, ListItem, ListItemContent, ListItemDecorator, 
  Alert, Divider
} from '@mui/joy';
import { 
  ManageAccounts, Backup, PersonAdd, Edit, Delete, 
  Schedule, CloudDownload, Download, Restore, ExitToApp, Security,
  ToggleOn, ToggleOff, Mail, Badge
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';
import pkg from '../../package.json';

export default function SettingsView({
  household, users, currentUser, api, onUpdateHousehold, 
  currentMode, showNotification, confirmAction
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

  const MobileUserCard = ({ user }) => (
    <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar size="md" sx={{ bgcolor: user.avatar ? getEmojiColor(user.avatar, isDark) : 'neutral.solidBg', opacity: user.is_active ? 1 : 0.5 }}>
                {user.avatar || user.first_name?.[0] || user.email?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
                <Typography level="title-md" noWrap sx={{ textDecoration: user.is_active ? 'none' : 'line-through', opacity: user.is_active ? 1 : 0.6 }}>
                    {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'New User'}
                </Typography>
                <Typography level="body-xs" noWrap>{user.email || '-'}</Typography>
            </Box>
        </Box>
        <Stack direction="row" spacing={1} mb={2}>
            <Chip size="sm" variant="soft" color={user.is_active ? 'success' : 'neutral'}>{user.is_active ? 'Active' : 'Inactive'}</Chip>
            <Chip size="sm" variant="soft" color={user.role === 'admin' ? 'danger' : (user.role === 'member' ? 'primary' : 'neutral')} startDecorator={<Security sx={{ fontSize: '14px' }} />}>{user.role?.toUpperCase()}</Chip>
        </Stack>
        <Divider />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1.5 }}>
            {isAdmin && currentUser.id !== user.id && (
                <Button size="sm" variant="soft" color={user.is_active ? "warning" : "success"} onClick={() => handleToggleActivation(user)}>{user.is_active ? 'Deactivate' : 'Activate'}</Button>
            )}
            {isAdmin && <IconButton size="sm" variant="solid" color="primary" onClick={() => openEditUser(user)}><Edit /></IconButton>}
            {currentUser.id !== user.id ? (isAdmin && <IconButton size="sm" variant="solid" color="danger" onClick={() => handleRemoveUser(user.id, user.first_name || user.email)}><Delete /></IconButton>) : <Button size="sm" variant="solid" color="warning" startDecorator={<ExitToApp />} onClick={() => handleRemoveUser(user.id, 'yourself')}>Leave</Button>}
        </Box>
    </Sheet>
  );

  return (
    <Box sx={{ pb: { xs: 10, md: 0 } }}>
      <Typography level="h2" fontWeight="300" mb={2} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>Settings</Typography>
      
      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden', minHeight: 400 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ bgcolor: 'transparent' }}>
          <TabList 
            variant="plain" 
            sx={{ 
                p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: { xs: 1, md: 2 }, mt: 2, 
                overflowX: 'auto', '::-webkit-scrollbar': { display: 'none' },
                whiteSpace: 'nowrap'
            }}
          >
            <Tab variant={tab === 0 ? 'solid' : 'plain'} color={tab === 0 ? 'primary' : 'neutral'} indicatorInset sx={{ minWidth: 100, flexShrink: 0 }}>
                <ListItemDecorator><ManageAccounts /></ListItemDecorator> Users
            </Tab>
            <Tab variant={tab === 1 ? 'solid' : 'plain'} color={tab === 1 ? 'primary' : 'neutral'} indicatorInset sx={{ minWidth: 100, flexShrink: 0 }}>
                <ListItemDecorator><Backup /></ListItemDecorator> Data
            </Tab>
          </TabList>
          
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {tab === 0 && (
              <Box>
                  <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' } }}>
                      <Box><Typography level="h4">Authorized Users</Typography><Typography level="body-sm">Manage household members and permissions.</Typography></Box>
                      {isAdmin && <Button variant="solid" color="primary" startDecorator={<PersonAdd />} onClick={openAddUser}>Invite User</Button>}
                  </Box>
                  <Box sx={{ display: { xs: 'block', md: 'none' } }}>{localUsers.map(u => <MobileUserCard key={u.id} user={u} />)}</Box>
                  <Sheet variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 'sm', overflow: 'auto' }}>
                    <Table hoverRow sx={{ '& tr > *': { verticalAlign: 'middle' } }}>
                        <thead><tr><th style={{ width: 60 }}></th><th>User</th><th>Email</th><th>Status</th><th>Permissions</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                        <tbody>{localUsers.map(u => (
                            <tr key={u.id}>
                                <td><Avatar size="sm" sx={{ bgcolor: u.avatar ? getEmojiColor(u.avatar, isDark) : 'neutral.solidBg', opacity: u.is_active ? 1 : 0.5 }}>{u.avatar || u.first_name?.[0]}</Avatar></td>
                                <td><Typography level="title-sm" sx={{ textDecoration: u.is_active ? 'none' : 'line-through', opacity: u.is_active ? 1 : 0.6 }}>{u.first_name} {u.last_name}</Typography></td>
                                <td><Typography level="body-xs" sx={{ opacity: u.is_active ? 1 : 0.6 }}>{u.email}</Typography></td>
                                <td><Chip size="sm" variant="soft" color={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Chip></td>
                                <td><Chip size="sm" variant="soft" color={u.role === 'admin' ? 'danger' : (u.role === 'member' ? 'primary' : 'neutral')} startDecorator={<Security sx={{ fontSize: '14px' }} />}>{u.role?.toUpperCase()}</Chip></td>
                                <td style={{ textAlign: 'right' }}><Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    {isAdmin && currentUser.id !== u.id && <IconButton size="sm" color={u.is_active ? "warning" : "success"} onClick={() => handleToggleActivation(u)}>{u.is_active ? <ToggleOn /> : <ToggleOff />}</IconButton>}
                                    {isAdmin && <IconButton size="sm" color="primary" onClick={() => openEditUser(u)}><Edit /></IconButton>}
                                    {currentUser.id !== u.id ? (isAdmin && <IconButton size="sm" color="danger" onClick={() => handleRemoveUser(u.id, u.first_name || u.email)}><Delete /></IconButton>) : <IconButton size="sm" color="warning" onClick={() => handleRemoveUser(u.id, 'yourself')}><ExitToApp /></IconButton>}
                                </Box></td>
                            </tr>
                        ))}</tbody>
                    </Table>
                  </Sheet>
              </Box>
            )}
            {tab === 1 && (
              <Box>
                  <Typography level="h4" mb={2}>Backup & Restore</Typography>
                  <Sheet variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 'md' }}>
                      <form onSubmit={(e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); onUpdateHousehold({ auto_backup: data.auto_backup === 'on' ? 1 : 0, backup_retention: parseInt(data.backup_retention) }); }}>
                          <Stack spacing={3}>
                              <FormControl orientation="horizontal" sx={{ gap: 1 }}><Switch name="auto_backup" defaultChecked={Boolean(household?.auto_backup)} /><FormLabel>Enable Nightly Backups</FormLabel></FormControl>
                              <FormControl><FormLabel>Retention (Days)</FormLabel><Input name="backup_retention" type="number" defaultValue={household?.backup_retention || 7} /></FormControl>
                              <Button type="submit" variant="outlined" fullWidth startDecorator={<Schedule />}>Update Schedule</Button>
                          </Stack>
                      </form>
                  </Sheet>
                  <Stack spacing={3}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          <Button variant="solid" fullWidth startDecorator={<Backup />} onClick={() => { api.post(`/households/${household.id}/backups/trigger`).then(() => { showNotification("Manual backup created.", "success"); fetchBackups(); }).catch(() => showNotification("Failed to create backup.", "danger")); }}>Create Backup</Button>
                          <Button variant="outlined" fullWidth startDecorator={<CloudDownload />} onClick={() => { const url = `${api.defaults.baseURL}/households/${household.id}/db/download`; window.open(url, '_blank'); }}>Export DB</Button>
                      </Stack>
                      <Typography level="title-lg">Recent Backups</Typography>
                      {backupLoading ? <LinearProgress /> : (
                          <List variant="outlined" sx={{ borderRadius: 'sm' }}>{backups.map((b, i) => (
                              <Box key={b.filename}>
                                  <ListItem endAction={<Stack direction="row" spacing={1}><IconButton size="sm" onClick={() => { const url = `${api.defaults.baseURL}/households/${household.id}/backups/download/${b.filename}`; window.open(url, '_blank'); }}><Download /></IconButton><IconButton size="sm" color="warning" onClick={() => { confirmAction("Restore Backup", `Are you sure you want to restore ${b.filename}?`, async () => { try { await api.post(`/households/${household.id}/backups/restore/${b.filename}`); showNotification("Restore successful.", "success"); setTimeout(() => window.location.reload(), 1500); } catch (err) { showNotification("Restore failed.", "danger"); } }); }}><Restore /></IconButton></Stack>}>
                                      <ListItemContent><Typography level="title-sm" noWrap sx={{ maxWidth: { xs: 150, md: '100%' } }}>{b.filename}</Typography><Typography level="body-xs">{(b.size / 1024).toFixed(1)} KB - {b.date}</Typography></ListItemContent>
                                  </ListItem>{i < backups.length - 1 && <Divider />}
                              </Box>
                          ))}</List>
                      )}
                  </Stack>
              </Box>
            )}
          </Box>
        </Tabs>
      </Sheet>

      <Modal open={userDialogOpen} onClose={() => setUserDialogOpen(false)}>
        <ModalDialog sx={{ maxWidth: 500, width: '90%' }}>
            <DialogTitle>{editUser ? 'Edit User' : 'Invite User'}</DialogTitle>
            <form onSubmit={handleUserSubmit}>
                <DialogContent>
                    <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                            <Tooltip title="Change Emoji" variant="soft">
                                <Avatar 
                                    size="lg" 
                                    sx={{ bgcolor: getEmojiColor(selectedUserEmoji, isDark), cursor: 'pointer' }}
                                    onClick={() => setEmojiPickerOpen(true)}
                                >
                                    {selectedUserEmoji}
                                </Avatar>
                            </Tooltip>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <FormControl required sx={{ flex: 1 }}><FormLabel>First Name</FormLabel><Input name="first_name" defaultValue={editUser?.first_name || ''} /></FormControl>
                            <FormControl required sx={{ flex: 1 }}><FormLabel>Last Name</FormLabel><Input name="last_name" defaultValue={editUser?.last_name || ''} /></FormControl>
                        </Stack>
                        <FormControl required><FormLabel>Email Address</FormLabel><Input type="email" name="email" startDecorator={<Mail />} defaultValue={editUser?.email || ''} disabled={!!editUser} /></FormControl>
                        <FormControl><FormLabel>Role</FormLabel><Select name="role" defaultValue={editUser?.role || 'member'}><Option value="member">Member (Read/Write)</Option><Option value="admin">Admin (Full Access)</Option></Select></FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button type="submit" variant="solid">Save User</Button>
                    <Button variant="plain" color="neutral" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
                </DialogActions>
            </form>
        </ModalDialog>
      </Modal>

      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(emoji) => { setSelectedUserEmoji(emoji); setEmojiPickerOpen(false); }} title="Select User Emoji" isDark={isDark} />
    </Box>
  );
}