import { useState, useEffect } from 'react';
import { 
    Box, Typography, FormControl, FormLabel, Input, Button, Stack, Avatar, IconButton, 
    Tooltip, Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, Chip,
    Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Select, Option, Grid
} from '@mui/joy';
import Edit from '@mui/icons-material/Edit';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Delete from '@mui/icons-material/Delete';
import ExitToApp from '@mui/icons-material/ExitToApp';
import ContentCopy from '@mui/icons-material/ContentCopy';

import { useHousehold } from '../../contexts/HouseholdContext';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

export default function ProfileSettings() {
  const { 
    user, onUpdateProfile, showNotification, isDark, api, household, 
    confirmAction, households, onSelectHousehold, onLogout 
  } = useHousehold();

  // Profile State
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '👤');
  const [saving, setSaving] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  // Invite State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', first_name: '', last_name: '', role: 'member' });
  const [inviting, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await onUpdateProfile({ first_name: firstName, last_name: lastName, email, avatar });
      showNotification('Profile updated successfully!', 'success');
    } catch (err) {
      showNotification('Failed to update profile', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
        const res = await api.post(`/households/${household.id}/users`, inviteData);
        showNotification("Invitation sent!", "success");
        if (res.data.generatedPassword) {
            setInviteSuccess({ email: inviteData.email, password: res.data.generatedPassword });
        }
        setIsInviteModalOpen(false);
        setInviteData({ email: '', first_name: '', last_name: '', role: 'member' });
    } catch (err) {
        showNotification("Failed to send invitation.", "danger");
    } finally {
        setInviteLoading(false);
    }
  };

  return (
    <Stack spacing={4} sx={{ maxWidth: 800 }}>
      {/* 1. Public Profile */}
      <Box>
        <Typography level="h4" sx={{ mb: 1 }}>Public Profile</Typography>
        <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
            <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
                <Avatar 
                    size="xl" 
                    sx={{ 
                        '--Avatar-size': '80px', 
                        fontSize: '2.5rem', 
                        bgcolor: getEmojiColor(avatar, isDark),
                        cursor: 'pointer'
                    }}
                    onClick={() => setEmojiPickerOpen(true)}
                >
                    {avatar}
                </Avatar>
                <Box>
                    <Button variant="outlined" size="sm" startDecorator={<Edit />} onClick={() => setEmojiPickerOpen(true)}>Change Emoji</Button>
                    <Typography level="body-xs" sx={{ mt: 1 }}>Click avatar to choose a custom emoji.</Typography>
                </Box>
            </Stack>

            <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                    <FormControl>
                        <FormLabel>First Name</FormLabel>
                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={6}>
                    <FormControl>
                        <FormLabel>Last Name</FormLabel>
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </FormControl>
                </Grid>
                <Grid xs={12}>
                    <FormControl>
                        <FormLabel>Email Address</FormLabel>
                        <Input value={email} disabled />
                    </FormControl>
                </Grid>
            </Grid>
            <Button sx={{ mt: 3 }} loading={saving} onClick={handleSaveProfile}>Update Profile</Button>
        </Sheet>
      </Box>

      {/* 2. Household Access */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography level="h4">Household Access</Typography>
            {user?.role === 'admin' && (
                <Button variant="solid" color="primary" startDecorator={<PersonAdd />} onClick={() => setIsInviteModalOpen(true)}>Invite User</Button>
            )}
        </Stack>
        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
            <List sx={{ '--ListItem-paddingY': '12px' }}>
                <ListItem sx={{ bgcolor: 'background.level1', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography level="title-sm">Current Workspace: {household?.name}</Typography>
                </ListItem>
                <ListItem>
                    <ListItemContent>
                        <Typography level="title-sm">{user?.first_name} {user?.last_name} (You)</Typography>
                        <Typography level="body-xs">{user?.email}</Typography>
                    </ListItemContent>
                    <Chip variant="soft" color="primary" size="sm" sx={{ textTransform: 'uppercase' }}>{user?.role}</Chip>
                </ListItem>
            </List>
        </Sheet>
      </Box>

      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setAvatar(e); setEmojiPickerOpen(false); }} />

      {/* Invite Modal */}
      <Modal open={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
          <ModalDialog>
              <DialogTitle>Invite New Member</DialogTitle>
              <form onSubmit={handleInviteUser}>
                  <Stack spacing={2} sx={{ mt: 1 }}>
                      <FormControl required>
                          <FormLabel>Email Address</FormLabel>
                          <Input name="email" type="email" value={inviteData.email} onChange={(e) => setInviteData({...inviteData, email: e.target.value})} />
                      </FormControl>
                      <Stack direction="row" spacing={2}>
                          <FormControl sx={{ flex: 1 }}>
                              <FormLabel>First Name</FormLabel>
                              <Input name="first_name" value={inviteData.first_name} onChange={(e) => setInviteData({...inviteData, first_name: e.target.value})} />
                          </FormControl>
                          <FormControl sx={{ flex: 1 }}>
                              <FormLabel>Last Name</FormLabel>
                              <Input name="last_name" value={inviteData.last_name} onChange={(e) => setInviteData({...inviteData, last_name: e.target.value})} />
                          </FormControl>
                      </Stack>
                      <FormControl required>
                          <FormLabel>Role</FormLabel>
                          <Select value={inviteData.role} onChange={(_e, v) => setInviteData({...inviteData, role: v})}>
                              <Option value="admin">Administrator</Option>
                              <Option value="member">Standard Member</Option>
                              <Option value="viewer">Viewer (Read-only)</Option>
                          </Select>
                      </FormControl>
                      <DialogActions>
                          <Button type="submit" loading={inviting}>Send Invitation</Button>
                          <Button variant="plain" color="neutral" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                      </DialogActions>
                  </Stack>
              </form>
          </ModalDialog>
      </Modal>

      {/* Invite Success */}
      <Modal open={!!inviteSuccess} onClose={() => setInviteSuccess(null)}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle color="success">Invitation Sent</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Typography>User <b>{inviteSuccess?.email}</b> has been added.</Typography>
              <Sheet variant="soft" color="warning" sx={{ p: 2, borderRadius: 'sm' }}>
                <Typography level="body-sm" fontWeight="bold">Temporary Password:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography level="h3" sx={{ fontFamily: 'monospace' }}>{inviteSuccess?.password}</Typography>
                  <IconButton size="sm" onClick={() => navigator.clipboard.writeText(inviteSuccess?.password)}><ContentCopy /></IconButton>
                </Box>
              </Sheet>
            </Stack>
          </DialogContent>
          <DialogActions><Button variant="solid" color="primary" onClick={() => setInviteSuccess(null)}>Done</Button></DialogActions>
        </ModalDialog>
      </Modal>
    </Stack>
  );
}