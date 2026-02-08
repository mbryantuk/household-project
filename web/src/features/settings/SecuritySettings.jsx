import { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Button, Stack, Sheet, Grid, Divider, 
    List, ListItem, ListItemContent, ListItemDecorator, 
    Chip, IconButton, Tooltip, Modal, ModalDialog, DialogTitle, 
    DialogContent, DialogActions, Input, FormControl, FormLabel, Alert
} from '@mui/joy';
import Security from '@mui/icons-material/Security';
import Devices from '@mui/icons-material/Devices';
import Delete from '@mui/icons-material/Delete';
import CheckCircle from '@mui/icons-material/CheckCircle';
import QrCode from '@mui/icons-material/QrCode';
import Warning from '@mui/icons-material/Warning';
import Lock from '@mui/icons-material/Lock';

import { useHousehold } from '../../contexts/HouseholdContext';

export default function SecuritySettings() {
  const { user, api, showNotification, confirmAction, onUpdateProfile } = useHousehold();
  const [sessions, setSessions] = useState([]);

  // MFA State
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaStep, setMfaStep] = useState(1); // 1: QR, 2: Verify
  const [mfaData, setMfaData] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Disable MFA state
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [password, setPassword] = useState('');

  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/auth/sessions');
      setSessions(res.data);
    } catch {
      showNotification("Failed to load sessions.", "danger");
    }
  }, [api, showNotification]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = (sessionId) => {
    confirmAction(
        "Revoke Session",
        "This will immediately log out the device. Continue?",
        async () => {
            try {
                await api.delete(`/auth/sessions/${sessionId}`);
                showNotification("Session revoked.", "success");
                fetchSessions();
            } catch {
                showNotification("Failed to revoke session.", "danger");
            }
        }
    );
  };

  const handleRevokeOthers = () => {
    confirmAction(
        "Log Out Other Devices",
        "This will end all active sessions except your current one. Continue?",
        async () => {
            try {
                await api.delete('/auth/sessions');
                showNotification("Other sessions revoked.", "success");
                fetchSessions();
            } catch {
                showNotification("Failed to revoke sessions.", "danger");
            }
        }
    );
  };

  const handleMfaSetup = async () => {
    try {
        const res = await api.post('/auth/mfa/setup');
        setMfaData(res.data);
        setMfaStep(1);
        setMfaModalOpen(true);
    } catch {
        showNotification("MFA setup failed.", "danger");
    }
  };

  const handleMfaVerify = async () => {
    setVerifying(true);
    try {
        await api.post('/auth/mfa/verify', { code: mfaCode });
        showNotification("Multi-factor authentication enabled!", "success");
        setMfaModalOpen(false);
        onUpdateProfile({ mfa_enabled: true }); // Update local state
    } catch {
        showNotification("Invalid code. Please try again.", "danger");
    } finally {
        setVerifying(false);
    }
  };

  const handleMfaDisable = async () => {
    try {
        await api.post('/auth/mfa/disable', { password });
        showNotification("MFA disabled.", "neutral");
        setDisableModalOpen(false);
        setPassword('');
        onUpdateProfile({ mfa_enabled: false });
    } catch {
        showNotification("Invalid password.", "danger");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        return showNotification("Passwords do not match", "danger");
    }

    setChangingPassword(true);
    try {
        await onUpdateProfile({ password: passwordData.newPassword });
        setIsPasswordModalOpen(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
        showNotification("Password changed successfully", "success");
    } catch (err) {
        const msg = err.response?.data?.error || "Failed to change password";
        showNotification(msg, "danger");
    } finally {
        setChangingPassword(false);
    }
  };

  return (
    <Stack spacing={4} sx={{ maxWidth: 800 }}>
      <Box>
        <Typography level="h4">Security Center</Typography>
        <Typography level="body-sm">Manage your account security and active sessions.</Typography>
      </Box>

      {/* 1. Password Section */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                  <Typography level="title-md" startDecorator={<Lock color="primary" />}>Password</Typography>
                  <Typography level="body-xs" color="neutral" sx={{ mt: 0.5 }}>Update your login password regularly to stay secure.</Typography>
              </Box>
              <Button variant="solid" color="neutral" onClick={() => setIsPasswordModalOpen(true)}>Change Password</Button>
          </Stack>
      </Sheet>

      {/* 2. MFA Section */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Box>
                  <Typography level="title-md" startDecorator={<Security color="primary" />}>Multi-Factor Authentication (MFA)</Typography>
                  <Typography level="body-xs" color="neutral" sx={{ mt: 0.5 }}>Add an extra layer of security by requiring a code from your phone.</Typography>
              </Box>
              <Chip 
                variant="soft" 
                color={user?.mfa_enabled ? "success" : "neutral"}
                startDecorator={user?.mfa_enabled ? <CheckCircle /> : <Warning />}
              >
                  {user?.mfa_enabled ? "ENABLED" : "DISABLED"}
              </Chip>
          </Stack>
          
          {!user?.mfa_enabled ? (
              <Button variant="solid" color="primary" onClick={handleMfaSetup}>Set Up MFA</Button>
          ) : (
              <Button variant="outlined" color="danger" onClick={() => setDisableModalOpen(true)}>Disable MFA</Button>
          )}
      </Sheet>

      {/* 3. Sessions Section */}
      <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography level="title-md" startDecorator={<Devices color="primary" />}>Active Sessions</Typography>
              {sessions.length > 1 && (
                  <Button variant="plain" color="danger" size="sm" onClick={handleRevokeOthers}>Log out others</Button>
              )}
          </Stack>
          <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
              <List sx={{ '--ListItem-paddingY': '12px' }}>
                  {sessions.map((s, idx) => (
                      <ListItem key={s.id} sx={{ borderBottom: idx < sessions.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                          <ListItemDecorator>
                              <Devices sx={{ opacity: 0.5 }} />
                          </ListItemDecorator>
                          <ListItemContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography level="title-sm">{s.device_info}</Typography>
                                  {s.isCurrent && <Chip size="sm" variant="soft" color="primary">This Device</Chip>}
                              </Box>
                              <Typography level="body-xs" color="neutral">{s.ip_address} • {new Date(s.last_active).toLocaleString()}</Typography>
                          </ListItemContent>
                          {!s.isCurrent && (
                              <IconButton size="sm" color="danger" variant="plain" onClick={() => handleRevokeSession(s.id)}>
                                  <Delete />
                              </IconButton>
                          )}
                      </ListItem>
                  ))}
                  {sessions.length === 0 && (
                      <Typography level="body-sm" sx={{ p: 2, textAlign: 'center', opacity: 0.5 }}>No active sessions found.</Typography>
                  )}
              </List>
          </Sheet>
      </Box>

      {/* PASSWORD CHANGE MODAL */}
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
                          <Button type="submit" loading={changingPassword}>Update Password</Button>
                          <Button variant="plain" color="neutral" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                      </DialogActions>
                  </Stack>
              </form>
          </ModalDialog>
      </Modal>

      {/* MFA SETUP MODAL */}
      <Modal open={mfaModalOpen} onClose={() => setMfaModalOpen(false)}>
          <ModalDialog sx={{ maxWidth: 400 }}>
              <DialogTitle>Setup Multi-Factor Auth</DialogTitle>
              <DialogContent>
                  {mfaStep === 1 ? (
                      <Stack spacing={2} alignItems="center" sx={{ mt: 1 }}>
                          <Typography level="body-sm">Scan this QR code with an authenticator app (like Google Authenticator or Authy).</Typography>
                          <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 'md', border: '1px solid', borderColor: 'divider' }}>
                              <img src={mfaData?.qrCodeUrl} alt="MFA QR Code" style={{ width: 200, height: 200 }} />
                          </Box>
                          <Typography level="body-xs" color="neutral" sx={{ fontFamily: 'monospace', textAlign: 'center' }}>
                              Manual Key: {mfaData?.secret}
                          </Typography>
                          <Button fullWidth onClick={() => setMfaStep(2)}>I've scanned it</Button>
                      </Stack>
                  ) : (
                      <Stack spacing={2} sx={{ mt: 1 }}>
                          <Typography level="body-sm">Enter the 6-digit code from your app to verify setup.</Typography>
                          <FormControl required>
                              <FormLabel>Verification Code</FormLabel>
                              <Input 
                                autoFocus
                                value={mfaCode} 
                                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                placeholder="000000"
                                slotProps={{ input: { textAlign: 'center', letterSpacing: '0.5em', fontWeight: 'bold', fontSize: '1.2rem' } }}
                              />
                          </FormControl>
                          <Button fullWidth loading={verifying} onClick={handleMfaVerify}>Complete Setup</Button>
                          <Button variant="plain" color="neutral" onClick={() => setMfaStep(1)}>Back to QR Code</Button>
                      </Stack>
                  )}
              </DialogContent>
          </ModalDialog>
      </Modal>

      {/* DISABLE MFA MODAL */}
      <Modal open={disableModalOpen} onClose={() => setDisableModalOpen(false)}>
          <ModalDialog>
              <DialogTitle color="danger">Disable MFA?</DialogTitle>
              <DialogContent>
                  <Typography level="body-sm" sx={{ mb: 2 }}>Please enter your password to confirm disabling multi-factor authentication.</Typography>
                  <FormControl required>
                      <FormLabel>Account Password</FormLabel>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} startDecorator={<Lock />} autoFocus />
                  </FormControl>
              </DialogContent>
              <DialogActions>
                  <Button variant="solid" color="danger" onClick={handleMfaDisable}>Disable MFA</Button>
                  <Button variant="plain" color="neutral" onClick={() => setDisableModalOpen(false)}>Cancel</Button>
              </DialogActions>
          </ModalDialog>
      </Modal>
    </Stack>
  );
}
