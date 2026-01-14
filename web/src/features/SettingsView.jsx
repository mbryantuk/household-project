import { useState, useEffect } from 'react';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Button, Input, 
  FormControl, FormLabel, Stack, Avatar, IconButton, 
  Divider, Modal, ModalDialog, DialogTitle, Select, Option, Grid, Chip, DialogContent, DialogActions
} from '@mui/joy';
import { 
  PersonAdd, Edit, Delete, ExitToApp, ToggleOn, ToggleOff,
  OpenInNew, Info, Verified, Code, Policy, Palette, AddHome
} from '@mui/icons-material';
import { getEmojiColor, THEMES } from '../theme';

export default function SettingsView({ 
    household, users, currentUser, api, showNotification, confirmAction, fetchHhUsers,
    themeId, onThemeChange
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [editUser, setEditUser] = useState(null);
  const [isInvite, setIsInvite] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // New Household Modal State
  const [isCreateHhModalOpen, setIsCreateHhModalOpen] = useState(false);
  const [newHhName, setNewHhName] = useState('');
  const [newHhTheme, setNewHhTheme] = useState('totem');
  const [isCreatingHh, setIsCreatingHh] = useState(false);
  
  // Controlled form state for the modal
  const [formData, setFormData] = useState({
      email: '',
      role: 'member',
      first_name: '',
      last_name: ''
  });

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
      if (editUser) {
          setFormData({
              email: editUser.email || '',
              role: editUser.role || 'member',
              first_name: editUser.first_name || '',
              last_name: editUser.last_name || ''
          });
      }
  }, [editUser]);

  const handleToggleActivation = async (u) => {
    if (!isAdmin) return;
    try {
      await api.put(`/households/${household.id}/users/${u.id}`, { is_active: !u.is_active });
      showNotification(`User ${u.is_active ? 'deactivated' : 'activated'}.`, "success");
      if (fetchHhUsers) fetchHhUsers(household.id);
      else window.location.reload(); 
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
                else if (fetchHhUsers) fetchHhUsers(household.id);
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
      try {
          if (isInvite) {
              await api.post(`/households/${household.id}/users`, formData);
              showNotification("User invited successfully.", "success");
          } else {
              await api.put(`/households/${household.id}/users/${editUser.id}`, formData);
              showNotification("User updated successfully.", "success");
          }
          setEditUser(null);
          if (fetchHhUsers) fetchHhUsers(household.id);
          else window.location.reload();
      } catch (err) {
          showNotification("Failed to save user.", "danger");
      } finally {
          setSavingUser(false);
      }
  };

  const handleCreateNewHousehold = async (e) => {
    e.preventDefault();
    if (!newHhName.trim()) return;
    setIsCreatingHh(true);
    try {
      const res = await api.post('/households', { 
        name: newHhName,
        theme: newHhTheme
      });
      showNotification(`Household "${newHhName}" created successfully.`, "success");
      setIsCreateHhModalOpen(false);
      setNewHhName('');
      setNewHhTheme('totem');
      
      // Navigate to the new household
      window.location.href = `/household/${res.data.id}/dashboard`;
    } catch (err) {
      showNotification("Failed to create new household.", "danger");
    } finally {
      setIsCreatingHh(false);
    }
  };

  const openEditUser = (u) => { 
    setEditUser(u); 
    setIsInvite(false); 
  };
  const openAddUser = () => { 
    setEditUser({ email: '', role: 'member', first_name: '', last_name: '' }); 
    setIsInvite(true); 
  };

  const getRoleColor = (role) => {
      switch(role) {
          case 'admin': return 'primary';
          case 'member': return 'neutral';
          case 'viewer': return 'success';
          default: return 'neutral';
      }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
            Household Settings
          </Typography>
          <Typography level="body-md" color="neutral">
            Manage members and technical configuration for <b>{household?.name}</b>.
          </Typography>
        </Box>
        {isAdmin && (
          <Button 
            variant="soft" 
            color="primary" 
            startDecorator={<AddHome />}
            onClick={() => setIsCreateHhModalOpen(true)}
          >
            New Household
          </Button>
        )}
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
            <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'}>Appearance</Tab>
            <Tab variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'}>Developers</Tab>
            <Tab variant={activeTab === 3 ? 'solid' : 'plain'} color={activeTab === 3 ? 'primary' : 'neutral'}>About</Tab>
          </TabList>

          <Box sx={{ p: { xs: 2, md: 4 } }}>
            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Member Permissions</Typography>
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
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography level="title-sm" sx={{ fontWeight: 'lg' }}>{u.first_name} {u.last_name} {u.id === currentUser.id && '(You)'}</Typography>
                                        <Chip size="sm" variant="soft" color={getRoleColor(u.role)} sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '10px' }}>
                                            {u.role}
                                        </Chip>
                                    </Stack>
                                    <Typography level="body-xs" color="neutral">{u.email}</Typography>
                                </Box>
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                {isAdmin && currentUser.id !== u.id && (
                                    <IconButton size="sm" color={u.is_active ? "warning" : "success"} onClick={() => handleToggleActivation(u)}>
                                        {u.is_active ? <ToggleOn /> : <ToggleOff />}
                                    </IconButton>
                                )}
                                {isAdmin && (
                                    <IconButton size="sm" color="primary" onClick={() => openEditUser(u)}>
                                        <Edit fontSize="small" />
                                    </IconButton>
                                )}
                                {currentUser.id !== u.id ? (
                                    isAdmin && (
                                        <IconButton size="sm" color="danger" onClick={() => handleRemoveUser(u.id, u.first_name || u.email)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    )
                                ) : (
                                    <IconButton size="sm" color="warning" onClick={() => handleRemoveUser(u.id, 'yourself')}>
                                        <ExitToApp fontSize="small" />
                                    </IconButton>
                                )}
                            </Stack>
                        </Sheet>
                    ))}
                </Stack>
              </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Personalize Totem</Typography>
                        <Typography level="body-md" color="neutral">Choose from our comprehensive library of 31 vibrant themes to match your household's personality.</Typography>
                    </Box>

                    <Grid container spacing={2}>
                        {Object.entries(THEMES).map(([id, spec]) => (
                            <Grid key={id} xs={6} sm={4} md={3} lg={2.4}>
                                <Sheet
                                    variant={themeId === id ? 'solid' : 'outlined'}
                                    color={themeId === id ? 'primary' : 'neutral'}
                                    onClick={() => onThemeChange(id)}
                                    sx={{
                                        p: 2, borderRadius: 'md', cursor: 'pointer', height: '100%',
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 'sm' },
                                        position: 'relative',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                                    }}
                                >
                                    <Box sx={{ width: '100%', height: 40, borderRadius: 'sm', bgcolor: spec.primary, mb: 1.5, border: '1px solid rgba(0,0,0,0.1)' }} />
                                    <Typography level="title-sm" noWrap sx={{ color: themeId === id ? '#fff' : 'text.primary', width: '100%' }}>{spec.name}</Typography>
                                    <Typography level="body-xs" sx={{ color: themeId === id ? 'rgba(255,255,255,0.8)' : 'neutral.plainColor', textTransform: 'uppercase' }}>{spec.mode}</Typography>
                                    {themeId === id && (
                                        <Palette sx={{ position: 'absolute', top: 8, right: 8, fontSize: '0.8rem', color: '#fff' }} />
                                    )}
                                </Sheet>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {activeTab === 2 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Developer Tools</Typography>
                        <Typography level="body-md" color="neutral">Integration and technical documentation for the TOTEM platform.</Typography>
                    </Box>
                    
                    <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', maxWidth: 600 }}>
                        <Stack spacing={2}>
                            <Typography level="title-md" startDecorator={<Code />}>API Documentation</Typography>
                            <Typography level="body-sm">Access the full Swagger/OpenAPI specifications to build custom integrations or tools.</Typography>
                            <Button 
                                component="a" 
                                href="/api-docs/" 
                                target="_blank" 
                                variant="soft" 
                                endDecorator={<OpenInNew />}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Open API Reference
                            </Button>
                        </Stack>
                    </Sheet>
                </Box>
            )}

            {activeTab === 3 && (
                <Box sx={{ maxWidth: 800 }}>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>About TOTEM</Typography>
                        <Typography level="body-md" color="neutral">Platform credits, licensing and open source information.</Typography>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid xs={12} md={6}>
                            <Stack spacing={2}>
                                <Typography level="title-md" startDecorator={<Verified color="primary" />}>The Platform</Typography>
                                <Typography level="body-sm">
                                    TOTEM is a multi-tenant household management system designed for families who demand absolute data privacy and consistent utility tracking.
                                </Typography>
                                <Divider />
                                <Typography level="title-md" startDecorator={<Info />}>Credits</Typography>
                                <Typography level="body-sm">
                                    Built with MUI Joy UI, React, and Node.js. 
                                    Icons provided by Google Material Icons.
                                    Database powered by SQLite.
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <Stack spacing={2}>
                                <Typography level="title-md" startDecorator={<Policy />}>Licensing</Typography>
                                <Typography level="body-sm">
                                    Licensed under the <b>MIT Open Source License</b>. 
                                    You are free to use, modify, and distribute this software for personal or commercial use.
                                </Typography>
                                <Divider />
                                <Typography level="title-md">Open Source</Typography>
                                <Typography level="body-sm">
                                    This project values community contributions. All shared UI components and API patterns follow the Prime Directives of Tenancy and Atomic consistency.
                                </Typography>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            )}
          </Box>
        </Tabs>
      </Sheet>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)}>
          <ModalDialog>
              <DialogTitle>{isInvite ? 'Invite New Member' : `Edit ${editUser?.first_name || 'User'}`}</DialogTitle>
              <form onSubmit={handleSaveUser}>
                  <Stack spacing={2} mt={1}>
                      <FormControl required>
                          <FormLabel>Email Address</FormLabel>
                          <Input 
                            name="email" 
                            type="email" 
                            value={formData.email} 
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            disabled={!isInvite} 
                          />
                      </FormControl>
                      {!isInvite && (
                        <>
                          <FormControl>
                              <FormLabel>First Name</FormLabel>
                              <Input 
                                name="first_name" 
                                value={formData.first_name} 
                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                              />
                          </FormControl>
                          <FormControl>
                              <FormLabel>Last Name</FormLabel>
                              <Input 
                                name="last_name" 
                                value={formData.last_name} 
                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                              />
                          </FormControl>
                        </>
                      )}
                      <FormControl required>
                          <FormLabel>Role</FormLabel>
                          <Select 
                            name="role" 
                            value={formData.role}
                            onChange={(e, v) => setFormData({...formData, role: v})}
                          >
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

      {/* Create New Household Modal */}
      <Modal open={isCreateHhModalOpen} onClose={() => setIsCreateHhModalOpen(false)}>
        <ModalDialog>
          <DialogTitle>Create New Household</DialogTitle>
          <DialogContent>Register a new property tenant. You will be assigned as the Administrator.</DialogContent>
          <form onSubmit={handleCreateNewHousehold}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Household Name</FormLabel>
                <Input 
                  placeholder="e.g. Summer House" 
                  value={newHhName}
                  onChange={(e) => setNewHhName(e.target.value)}
                  autoFocus
                />
              </FormControl>
              <FormControl required>
                <FormLabel>Theme</FormLabel>
                <Select 
                  value={newHhTheme} 
                  onChange={(e, v) => setNewHhTheme(v)}
                  startDecorator={<Palette />}
                >
                  {Object.entries(THEMES).map(([id, spec]) => (
                    <Option key={id} value={id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 16, height: 16, borderRadius: '2px', bgcolor: spec.primary }} />
                        {spec.name}
                      </Box>
                    </Option>
                  ))}
                </Select>
              </FormControl>
              <DialogActions>
                <Button type="submit" loading={isCreatingHh}>Create Household</Button>
                <Button variant="plain" color="neutral" onClick={() => setIsCreateHhModalOpen(false)}>Cancel</Button>
              </DialogActions>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </Box>
  );
}