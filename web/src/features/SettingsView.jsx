import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Button, Input, 
  FormControl, FormLabel, Stack, Grid, Avatar, IconButton, 
  Divider, ButtonGroup, Switch, CircularProgress, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions,
  Select, Option
} from '@mui/joy';
import { 
  Settings, Save, PersonAdd, Edit, Delete, LightMode, DarkMode, 
  SettingsBrightness, Contrast, ExitToApp, ToggleOn, ToggleOff
} from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function SettingsView({ 
    household, users, currentUser, api, onUpdateHousehold, 
    currentMode, onModeChange, useDracula, onDraculaChange,
    showNotification, confirmAction
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [editUser, setEditUser] = useState(null);
  const [isInvite, setIsInvite] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const navigate = useNavigate();

  const isAdmin = currentUser?.role === 'admin';

  const handleToggleActivation = async (u) => {
    if (!isAdmin) return;
    try {
      await api.put(`/households/${household.id}/users/${u.id}/status`, { is_active: !u.is_active });
      showNotification(`User ${u.is_active ? 'deactivated' : 'activated'}.`, "success");
      window.location.reload(); 
    } catch (err) {
      showNotification("Failed to update user status.", "danger");
    }
  };

  const handleRemoveUser = (userId, name) => {
    confirmAction(
        userId === currentUser.id ? "Leave Household" : "Remove User",
        `Are you sure you want to remove ${name} from '${household.name}'?`,
        async () => {
            try {
                await api.delete(`/households/${household.id}/users/${userId}`);
                showNotification("User removed.", "success");
                if (userId === currentUser.id) window.location.href = '/select-household';
                else window.location.reload();
            } catch (err) {
                showNotification("Failed to remove user.", "danger");
            }
        }
    );
  };

  const handleSaveUser = async (e) => {
      e.preventDefault();
      setSavingUser(true);
      const data = Object.fromEntries(new FormData(e.currentTarget));
      try {
          if (isInvite) {
              await api.post(`/households/${household.id}/users`, data);
              showNotification("User invited successfully.", "success");
          } else {
              await api.put(`/households/${household.id}/users/${editUser.id}`, data);
              showNotification("User updated successfully.", "success");
          }
          setEditUser(null);
          window.location.reload();
      } catch (err) {
          showNotification("Failed to save user.", "danger");
      } finally {
          setSavingUser(false);
      }
  };

  const openEditUser = (u) => { setEditUser(u); setIsInvite(false); };
  const openAddUser = () => { setEditUser({}); setIsInvite(true); };

  return (
    <Box>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Household Settings
          </Typography>
          <Typography level="body-md" color="neutral">
            Manage members, roles, and preferences for <b>{household?.name}</b>.
          </Typography>
        </Box>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: 500, overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
          <TabList 
            variant="plain" 
            sx={{ 
                p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2,
                overflow: 'auto', '&::-webkit-scrollbar': { display: 'none' }
            }}
          >
            <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'}>User Access</Tab>
            <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'}>System Role</Tab>
            <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'}>Interface</Tab>
          </TabList>

          <Box sx={{ p: { xs: 2, md: 4 } }}>
            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>Member Permissions</Typography>
                        <Typography level="body-md" color="neutral">Control who has access to this household and their level of control.</Typography>
                    </Box>
                    {isAdmin && <Button variant="solid" color="primary" startDecorator={<PersonAdd />} onClick={openAddUser}>Invite User</Button>}
                </Box>
                
                <Stack spacing={2}>
                    {users.map(u => (
                        <Sheet key={u.id} variant="outlined" sx={{ p: 2, borderRadius: 'md', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: getEmojiColor(u.avatar || u.first_name?.[0], false) }}>{u.avatar || u.first_name?.[0]}</Avatar>
                                <Box>
                                    <Typography level="title-sm" sx={{ fontWeight: 'lg' }}>{u.first_name} {u.last_name} {u.id === currentUser.id && '(You)'}</Typography>
                                    <Typography level="body-xs" color="neutral">{u.email} • {u.role}</Typography>
                                </Box>
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                {isAdmin && currentUser.id !== u.id && <IconButton size="sm" color={u.is_active ? "warning" : "success"} onClick={() => handleToggleActivation(u)}>{u.is_active ? <ToggleOn /> : <ToggleOff />}</IconButton>}
                                {isAdmin && <IconButton size="sm" color="primary" onClick={() => openEditUser(u)}><Edit /></IconButton>}
                                {currentUser.id !== u.id ? (isAdmin && <IconButton size="sm" color="danger" onClick={() => handleRemoveUser(u.id, u.first_name || u.email)}><Delete /></IconButton>) : <IconButton size="sm" color="warning" onClick={() => handleRemoveUser(u.id, 'yourself')}><ExitToApp /></IconButton>}
                            </Stack>
                        </Sheet>
                    ))}
                </Stack>
              </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>Household Context Roles</Typography>
                        <Typography level="body-md" color="neutral">Assign specific roles to define what each member can edit within this household.</Typography>
                    </Box>
                    <Sheet variant="soft" color="warning" sx={{ p: 2, borderRadius: 'md' }}>
                        <Typography level="body-sm" fontWeight="bold">Developer Note:</Typography>
                        <Typography level="body-sm">Granular context-based roles (Finance Lead, Inventory Manager) are planned for the next major release.</Typography>
                    </Sheet>
                </Box>
            )}

            {activeTab === 2 && (
                <Box sx={{ maxWidth: 400 }}>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>Display Preferences</Typography>
                        <Typography level="body-md" color="neutral">Customize how the interface looks and feels for you.</Typography>
                    </Box>
                    <Stack spacing={3}>
                        <FormControl>
                            <FormLabel>Color Mode</FormLabel>
                            <ButtonGroup variant="soft" sx={{ width: '100%' }}>
                                <Button fullWidth variant={currentMode === 'light' ? 'solid' : 'soft'} onClick={() => onModeChange('light')}><LightMode /></Button>
                                <Button fullWidth variant={currentMode === 'dark' ? 'solid' : 'soft'} onClick={() => onModeChange('dark')}><DarkMode /></Button>
                                <Button fullWidth variant={currentMode === 'system' ? 'solid' : 'soft'} onClick={() => onModeChange('system')}><SettingsBrightness /></Button>
                            </ButtonGroup>
                        </FormControl>

                        <FormControl orientation="horizontal" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <FormLabel sx={{ mb: 0 }}>Dracula Palette</FormLabel>
                                <Typography level="body-xs">Enhanced dark mode contrast</Typography>
                            </Box>
                            <Switch checked={useDracula} onChange={(e) => onDraculaChange(e.target.checked)} />
                        </FormControl>
                    </Stack>
                </Box>
            )}
          </Box>
        </Tabs>
      </Sheet>

      <Modal open={!!editUser} onClose={() => setEditUser(null)}>
          <ModalDialog>
              <DialogTitle>{isInvite ? 'Invite New Member' : `Edit ${editUser?.first_name}`}</DialogTitle>
              <form onSubmit={handleSaveUser}>
                  <Stack spacing={2} mt={1}>
                      <FormControl required>
                          <FormLabel>Email Address</FormLabel>
                          <Input name="email" type="email" defaultValue={editUser?.email} disabled={!isInvite} />
                      </FormControl>
                      <FormControl required={isInvite}>
                          <FormLabel>Role</FormLabel>
                          <Select name="role" defaultValue={editUser?.role || 'member'}>
                              <Option value="admin">Administrator</Option>
                              <Option value="member">Standard Member</Option>
                              <Option value="viewer">Viewer (Read-only)</Option>
                          </Select>
                      </FormControl>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2 }}>
                          <Button variant="plain" color="neutral" onClick={() => setEditUser(null)}>Cancel</Button>
                          <Button type="submit" variant="solid" loading={savingUser}>{isInvite ? 'Send Invitation' : 'Update User'}</Button>
                      </Box>
                  </Stack>
              </form>
          </ModalDialog>
      </Modal>
    </Box>
  );
}
