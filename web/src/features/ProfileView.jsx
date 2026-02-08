import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Sheet, Divider, Stack, Avatar, Button, Input, 
  FormControl, FormLabel, Grid, IconButton, Tooltip,
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemContent, ListItemDecorator, ListDivider
} from '@mui/joy';
import { useOutletContext } from 'react-router-dom';
import { Edit, Save, PhotoCamera, Lock, Key, Fingerprint, Delete, VerifiedUser } from '@mui/icons-material';
import { startRegistration } from '@simplewebauthn/browser';
import { getEmojiColor } from '../theme';
import EmojiPicker from '../components/EmojiPicker';

export default function ProfileView() {
  const { user, onUpdateProfile, isDark, showNotification, api } = useOutletContext();
  const [isEditing, setIsEditing] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  // Passkeys State
  const [passkeys, setPasskeys] = useState([]);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    avatar: '👤'
  });

  const fetchPasskeys = useCallback(async () => {
    try {
      const res = await api.get('/auth/passkey/list');
      setPasskeys(res.data || []);
    } catch (err) {
      console.error("Failed to fetch passkeys", err);
    }
  }, [api]);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        avatar: user.avatar || '👤'
      });
      fetchPasskeys();
    }
  }, [user, fetchPasskeys]);

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      const optionsRes = await api.post('/auth/passkey/register/start');
      const attResp = await startRegistration(optionsRes.data);
      await api.post('/auth/passkey/register/finish', { attestationResponse: attResp });
      showNotification("Passkey registered successfully", "success");
      fetchPasskeys();
    } catch (err) {
      console.error("Passkey registration failed", err);
      if (err.name === 'NotAllowedError') {
        showNotification("Registration cancelled", "neutral");
      } else {
        showNotification(err.response?.data?.error || "Failed to register passkey", "danger");
      }
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (id) => {
    try {
      await api.delete(`/auth/passkey/${id}`);
      showNotification("Passkey removed", "success");
      fetchPasskeys();
    } catch {
      showNotification("Failed to remove passkey", "danger");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await onUpdateProfile(formData);
      setIsEditing(false);
      showNotification("Profile updated successfully", "success");
    } catch {
      showNotification("Failed to update profile", "danger");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        return showNotification("Passwords do not match", "danger");
    }

    setIsSavingPassword(true);
    try {
        await onUpdateProfile({ password: passwordData.newPassword });
        setIsPasswordModalOpen(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
        showNotification("Password changed successfully", "success");
    } catch (err) {
        const msg = err.response?.data?.error || "Failed to change password";
        showNotification(msg, "danger");
    } finally {
        setIsSavingPassword(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Your Profile</Typography>
        <Typography level="body-md" color="neutral">Manage your personal information and application preferences.</Typography>
      </Box>

      <Sheet variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 'md' }}>
        <form onSubmit={handleSave}>
          <Grid container spacing={4}>
            <Grid xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar 
                  size="lg" 
                  sx={{ 
                    '--Avatar-size': '120px', 
                    fontSize: '3rem', 
                    bgcolor: getEmojiColor(formData.avatar, isDark),
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.05)' }
                  }}
                  onClick={() => setEmojiPickerOpen(true)}
                >
                  {formData.avatar}
                </Avatar>
                <IconButton
                  size="sm"
                  variant="solid"
                  color="primary"
                  sx={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    right: 0, 
                    borderRadius: '50%',
                    boxShadow: 'sm' 
                  }}
                  onClick={() => setEmojiPickerOpen(true)}
                >
                  <PhotoCamera />
                </IconButton>
              </Box>
              <Typography level="title-md" sx={{ mt: 2 }}>{formData.first_name} {formData.last_name}</Typography>
              <Typography level="body-xs" color="neutral">{formData.email}</Typography>
            </Grid>

            <Grid xs={12} md={8}>
              <Stack spacing={3}>
                <Typography level="title-lg" startDecorator={<Edit />}>Personal Details</Typography>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <FormControl>
                      <FormLabel>First Name</FormLabel>
                      <Input 
                        disabled={!isEditing}
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl>
                      <FormLabel>Last Name</FormLabel>
                      <Input 
                        disabled={!isEditing}
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      />
                    </FormControl>
                  </Grid>
                </Grid>

                <FormControl>
                  <FormLabel>Email Address</FormLabel>
                  <Input 
                    disabled={true} 
                    value={formData.email}
                  />
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {!isEditing ? (
                    <Button 
                      variant="outlined" 
                      color="neutral" 
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button variant="plain" color="neutral" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit">Save Changes</Button>
                    </>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />
                
                <Typography level="title-lg" startDecorator={<Lock />}>Security</Typography>
                <Sheet variant="soft" color="neutral" sx={{ p: 2, borderRadius: 'md', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography level="title-sm">Account Password</Typography>
                        <Typography level="body-xs">Update your login credentials regularly to stay secure.</Typography>
                    </Box>
                    <Button 
                        variant="soft" 
                        color="primary" 
                        startDecorator={<Key />}
                        onClick={() => setIsPasswordModalOpen(true)}
                    >
                        Change Password
                    </Button>
                </Sheet>

                <Typography level="title-lg" startDecorator={<Fingerprint />} sx={{ mt: 2 }}>Passkeys</Typography>
                <Typography level="body-sm" color="neutral">Passkeys allow you to sign in securely using biometrics (like fingerprint or face scan) or a security key.</Typography>
                
                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
                    <List sx={{ '--ListItem-paddingY': '12px' }}>
                        {passkeys.length === 0 ? (
                            <ListItem>
                                <ListItemContent>
                                    <Typography level="body-sm" color="neutral" sx={{ textAlign: 'center', py: 1 }}>
                                        No passkeys registered yet.
                                    </Typography>
                                </ListItemContent>
                            </ListItem>
                        ) : (
                            passkeys.map((pk, idx) => (
                                <Box key={pk.id}>
                                    <ListItem
                                        endAction={
                                            <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDeletePasskey(pk.id)}>
                                                <Delete />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemDecorator>
                                            <VerifiedUser color="success" />
                                        </ListItemDecorator>
                                        <ListItemContent>
                                            <Typography level="title-sm">Passkey {idx + 1}</Typography>
                                            <Typography level="body-xs">
                                                Created: {new Date(pk.created_at).toLocaleDateString()} 
                                                {pk.last_used_at && ` • Last used: ${new Date(pk.last_used_at).toLocaleDateString()}`}
                                            </Typography>
                                        </ListItemContent>
                                    </ListItem>
                                    {idx < passkeys.length - 1 && <ListDivider />}
                                </Box>
                            ))
                        )}
                    </List>
                    <Box sx={{ p: 2, bgcolor: 'background.surface', borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button 
                            fullWidth 
                            variant="solid" 
                            color="primary" 
                            startDecorator={<Fingerprint />}
                            onClick={handleRegisterPasskey}
                            loading={isRegisteringPasskey}
                        >
                            Register New Passkey
                        </Button>
                    </Box>
                </Sheet>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Sheet>

      {/* Password Change Modal */}
      <Modal open={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)}>
        <ModalDialog>
            <DialogTitle>Change Password</DialogTitle>
            <DialogContent>Passwords must be at least 8 characters long and include a number and special character.</DialogContent>
            <form onSubmit={handleChangePassword}>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <FormControl required>
                        <FormLabel>New Password</FormLabel>
                        <Input 
                            type="password" 
                            placeholder="••••••••"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        />
                    </FormControl>
                    <FormControl required>
                        <FormLabel>Confirm New Password</FormLabel>
                        <Input 
                            type="password" 
                            placeholder="••••••••"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        />
                    </FormControl>
                    <DialogActions>
                        <Button type="submit" loading={isSavingPassword}>Update Password</Button>
                        <Button variant="plain" color="neutral" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                    </DialogActions>
                </Stack>
            </form>
        </ModalDialog>
      </Modal>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
          setFormData({...formData, avatar: emoji});
          setEmojiPickerOpen(false);
        }}
        title="Choose Avatar Emoji"
        isDark={isDark}
      />
    </Box>
  );
}
