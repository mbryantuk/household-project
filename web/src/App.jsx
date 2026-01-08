import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  Box, CssBaseline, ThemeProvider, useMediaQuery, TextField, Button, 
  Card, Typography, CircularProgress, Alert, Checkbox, FormControlLabel,
  Snackbar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Theme and Local Components
import { getTotemTheme } from './theme';
import TotemIcon from './components/TotemIcon';

// Layouts & Pages
import RootLayout from './layouts/RootLayout';
import HouseholdLayout from './layouts/HouseholdLayout';
import Dashboard from './pages/Dashboard';
import AccessControl from './pages/AccessControl';
import SetupWizard from './pages/SetupWizard';

// Features
import HomeView from './features/HomeView';
import MembersView from './features/MembersView';
import SettingsView from './features/SettingsView';
import CalendarView from './features/CalendarView';

const API_URL = window.location.origin;

function AppContent() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [modeOverride, setModeOverride] = useState(localStorage.getItem('themeMode') || 'system');
  const [useDracula, setUseDracula] = useState(() => localStorage.getItem('useDracula') !== 'false');
  const [installPrompt, setInstallPrompt] = useState(null);
  
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // --- AUTH STATE ---
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  
  // New State for Household context (returned on login)
  const [household, setHousehold] = useState(() => {
    try { return JSON.parse(localStorage.getItem('household')) || null; } catch { return null; }
  });

  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- NOTIFICATION STATE ---
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);
  const hideNotification = () => setNotification(prev => ({ ...prev, open: false }));

  // --- CONFIRMATION STATE ---
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const confirmAction = useCallback((title, message, onConfirm) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }, []);
  const handleConfirmClose = () => setConfirmDialog(prev => ({ ...prev, open: false }));
  const handleConfirmProceed = () => {
    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
    handleConfirmClose();
  };

  // --- DATA STATE ---
  // households list is only for SysAdmin now
  const [households, setHouseholds] = useState([]);
  const [sysUsers, setSysUsers] = useState([]);
  const [hhUsers, setHhUsers] = useState([]);     
  const [hhMembers, setHhMembers] = useState([]); 
  const [hhDates, setHhDates] = useState([]);

  const navigate = useNavigate();

  const authAxios = useMemo(() => axios.create({ 
    baseURL: API_URL, 
    headers: { Authorization: `Bearer ${token}` } 
  }), [token]);

  const theme = useMemo(() => {
    const currentMode = modeOverride === 'system' ? (prefersDarkMode ? 'dark' : 'light') : modeOverride;
    return getTotemTheme(currentMode, useDracula);
  }, [modeOverride, prefersDarkMode, useDracula]);

  // --- ACTIONS ---
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('household');
    setToken(null); setUser(null); setHousehold(null);
    navigate('/login');
  }, [navigate]);

  const fetchHhMembers = useCallback((hhId) => {
    if (!hhId) return;
    authAxios.get(`/households/${hhId}/members`)
      .then(res => setHhMembers(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  const fetchHhUsers = useCallback((hhId) => {
    if (!hhId) return;
    // For local households, this returns local users
    authAxios.get(`/households/${hhId}/users`)
      .then(res => setHhUsers(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  const fetchHhDates = useCallback((hhId) => {
    if (!hhId) return;
    authAxios.get(`/households/${hhId}/dates`)
      .then(res => setHhDates(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  // SysAdmin Fetch
  const fetchHouseholds = useCallback(async () => {
    if (user?.role === 'sysadmin') {
      try {
        const res = await authAxios.get('/admin/households');
        if (Array.isArray(res.data)) setHouseholds(res.data);
      } catch (err) { console.error(err); }
    }
  }, [authAxios, user]);

  const fetchSysUsers = useCallback(async () => {
    if (user?.role === 'sysadmin') {
      try {
        const res = await authAxios.get('/admin/users');
        if (Array.isArray(res.data)) setSysUsers(res.data);
      } catch (err) { console.error(err); }
    }
  }, [authAxios, user]);

  const handleUpdateHousehold = useCallback(async (hhId, updates) => {
    if (user?.role === 'sysadmin') {
        try {
            await authAxios.put(`/admin/households/${hhId}`, updates);
            showNotification("Household updated.", "success");
            fetchHouseholds();
        } catch (err) { showNotification("Error: " + err.message, "error"); }
    }
  }, [authAxios, user, fetchHouseholds, showNotification]);

  // --- APP INITIALIZATION ---
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setInstallPrompt(e); });
    
    if (token) {
      if (household) {
        // We are logged into a house
        fetchHhMembers(household.id);
        fetchHhUsers(household.id);
        fetchHhDates(household.id);
      } else if (user?.role === 'sysadmin') {
        // We are sysadmin
        fetchHouseholds();
        fetchSysUsers();
      }
    }
  }, [token, household, user, fetchHhMembers, fetchHhUsers, fetchHhDates, fetchHouseholds, fetchSysUsers]);

  // --- APP BADGING ---
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      const count = hhDates.length + (hhMembers?.filter(m => m.dob).length || 0);
      if (count > 0) {
        navigator.setAppBadge(count).catch(console.error);
      } else {
        navigator.clearAppBadge().catch(console.error);
      }
    }
  }, [hhDates, hhMembers]);

  const login = useCallback(async (key, u, p) => {
      const res = await axios.post(`${API_URL}/auth/login`, { accessKey: key, username: u, password: p });
      const { token, role, context, household: hhData } = res.data;
      
      const userData = { username: u, role: role }; // role is now from local DB or sysadmin
      
      setToken(token); 
      setUser(userData);
      
      localStorage.setItem('token', token); 
      localStorage.setItem('user', JSON.stringify(userData));

      if (context === 'household') {
        setHousehold(hhData);
        localStorage.setItem('household', JSON.stringify(hhData));
        navigate(`/household/${hhData.id}/dashboard`);
      } else {
        // SysAdmin
        setHousehold(null);
        localStorage.removeItem('household');
        navigate('/access'); // Go to admin dashboard
      }
  }, [navigate]);

  const handleCreateHousehold = useCallback(async (houseData) => {
    if (user?.role === 'sysadmin') {
      try {
        await authAxios.post('/admin/households', houseData);
        alert("Household created successfully.");
        fetchHouseholds();
      } catch (err) { alert("Error: " + err.message); }
    }
  }, [authAxios, user, fetchHouseholds]);

  const handleCreateUser = useCallback(async (userData) => {
    try {
      // Local User Creation
      await authAxios.post('/admin/create-user', userData);
      alert("User created.");
      if (household) fetchHhUsers(household.id);
    } catch (err) { alert("Error: " + err.message); }
  }, [authAxios, household, fetchHhUsers]);

  const handleUpdateUser = useCallback(async (userId, updates) => {
    try {
      await authAxios.put(`/admin/users/${userId}`, updates);
      alert("User updated.");
      if (household) fetchHhUsers(household.id);
      if (user?.role === 'sysadmin') fetchSysUsers();
    } catch (err) { alert("Error: " + err.message); }
  }, [authAxios, household, fetchHhUsers, fetchSysUsers, user]);

  const handleUpdateProfile = useCallback(async (updates) => {
    try {
      await authAxios.put('/auth/profile', updates);
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (household) fetchHhUsers(household.id);
      if (user?.role === 'sysadmin') fetchSysUsers();
    } catch (err) {
      console.error("Failed to update profile:", err);
      throw err;
    }
  }, [authAxios, user, household, fetchHhUsers, fetchSysUsers]);

  const handleUpdateUserWrapper = useCallback((userId, updates) => {
    handleUpdateUser(userId, updates);
  }, [handleUpdateUser]);

  if (loading) return <Box sx={{display:'flex', justifyContent:'center', mt:10}}><CircularProgress /></Box>;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={!token ? <LoginScreen onLogin={login} /> : <Navigate to="/" />} />
        
        {/* PROTECTED ROUTES */}
        <Route element={token ? <RootLayout 
            user={user} 
            currentHousehold={household} 
            households={households} // Only for SysAdmin view
            onSwitchHousehold={() => {}} // Disabled
            onLogout={logout} 
            toggleSidebar={() => setDrawerOpen(!drawerOpen)}
            currentMode={modeOverride} 
            onModeChange={(m) => { setModeOverride(m); localStorage.setItem('themeMode', m); }}
            installPrompt={installPrompt} 
            onInstall={handleInstallClick}
            dates={hhDates}
            api={authAxios}
            onDateAdded={() => household && fetchHhDates(household.id)}
            onUpdateProfile={handleUpdateProfile}
            showNotification={showNotification}
            confirmAction={confirmAction}
          /> : <Navigate to="/login" />}>

          {/* Root redirects based on role */}
          <Route index element={household ? <Navigate to={`/household/${household.id}/dashboard`} /> : <Navigate to="/access" />} />

          {/* SYSADMIN DASHBOARD */}
          <Route path="access" element={<AccessControl 
            users={sysUsers}
            currentUser={user}
            households={households} // Pass households here for SysAdmin to manage
            onCreateUser={() => {}} // TODO: Create SysAdmin
            onCreateHousehold={handleCreateHousehold}
            onUpdateHousehold={handleUpdateHousehold}
            onRemoveUser={(userId) => authAxios.delete(`/admin/users/${userId}`).then(() => fetchSysUsers())}
            onAssignUser={() => {}}
          />} />

          <Route path="household/:id" element={<HouseholdLayout 
              drawerOpen={drawerOpen} 
              toggleDrawer={() => setDrawerOpen(!drawerOpen)} 
              households={[household]} // Pass single household to Sidebar if needed
              onSelectHousehold={() => {}}
              api={authAxios}
            />}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<HomeView household={household} members={hhMembers} currentUser={user} dates={hhDates} />} />
                            <Route path="dates" element={<CalendarView showNotification={showNotification} confirmAction={confirmAction} />} />

              <Route path="settings" element={<SettingsView 
                household={household}
                users={hhUsers}
                currentUser={user}
                onUpdateHousehold={(updates) => {
                  authAxios.put(`/households/${household.id}`, updates).then(() => {
                      setHousehold(prev => {
                        const updated = { ...prev, ...updates };
                        localStorage.setItem('household', JSON.stringify(updated));
                        return updated;
                      });
                  });
                }}
                onDeleteHousehold={() => {}}
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser}
                onRemoveUser={(userId) => authAxios.delete(`/admin/users/${userId}`).then(() => fetchHhUsers(household.id))}
                onManageAccess={() => {}}
                currentMode={modeOverride}
                onModeChange={(m) => { setModeOverride(m); localStorage.setItem('themeMode', m); }}
                useDracula={useDracula}
                onDraculaChange={(v) => { setUseDracula(v); localStorage.setItem('useDracula', v); }}
                members={hhMembers}
                onAddMember={(e) => {
                  e.preventDefault(); 
                  const data = Object.fromEntries(new FormData(e.currentTarget));
                  authAxios.post(`/households/${household.id}/members`, data).then(() => { 
                    fetchHhMembers(household.id); 
                    e.target.reset(); 
                  });
                }}
                onRemoveMember={(id) => authAxios.delete(`/households/${household.id}/members/${id}`).then(() => fetchHhMembers(household.id))}
                onUpdateMember={(mid, data) => authAxios.put(`/households/${household.id}/members/${mid}`, data).then(() => fetchHhMembers(household.id))}
                showNotification={showNotification}
                confirmAction={confirmAction}
              />} />
          </Route>

        </Route>
      </Routes>

      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={hideNotification} severity={notification.severity} sx={{ width: '100%' }} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>

      <Dialog open={confirmDialog.open} onClose={handleConfirmClose}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose}>Cancel</Button>
          <Button onClick={handleConfirmProceed} color="error" variant="contained">Proceed</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

function LoginScreen({ onLogin }) {
  const [key, setKey] = useState(localStorage.getItem('rememberedKey') || ''); 
  const [u, setU] = useState(localStorage.getItem('rememberedUser') || ''); 
  const [p, setP] = useState('');
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await onLogin(key, u, p);
      
      // Save credentials if requested
      if (rememberMe) {
        localStorage.setItem('rememberedKey', key);
        localStorage.setItem('rememberedUser', u);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedKey');
        localStorage.removeItem('rememberedUser');
        localStorage.setItem('rememberMe', 'false');
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError("User or Household not found.");
      } else if (err.response && err.response.status === 401) {
        setError("Incorrect password.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ p: 4, width: 350, textAlign: 'center', borderRadius: 4 }}>
        <Box sx={{ mb: 2 }}><TotemIcon colorway="default" sx={{ fontSize: 60 }} /></Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>TOTEM</Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField 
            fullWidth label="Household Key" margin="dense" 
            value={key} onChange={ev=>setKey(ev.target.value)} 
            placeholder="Leave empty for Admin" disabled={isLoggingIn} 
          />
          <TextField 
            fullWidth label="Username" margin="dense" 
            value={u} onChange={ev=>setU(ev.target.value)} disabled={isLoggingIn} 
          />
          <TextField 
            fullWidth type="password" label="Password" margin="dense" 
            value={p} onChange={ev=>setP(ev.target.value)} disabled={isLoggingIn} 
          />
          
          <Box sx={{ textAlign: 'left', mt: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Remember my household</Typography>}
            />
          </Box>

          <Button fullWidth type="submit" variant="contained" size="large" sx={{ mt: 2 }} disabled={isLoggingIn}>
            {isLoggingIn ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>
        </form>
      </Card>
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

