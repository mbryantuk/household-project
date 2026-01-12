import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  Box, CssVarsProvider, Button, 
  CircularProgress, Snackbar, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions,
  GlobalStyles, useColorScheme
} from '@mui/joy';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CssBaseline from '@mui/joy/CssBaseline';

// Theme and Local Components
import { getTotemTheme, getThemeSpec } from './theme';
import FloatingCalculator from './components/FloatingCalculator';
import FloatingCalendar from './components/FloatingCalendar';
import FinancialCalculator from './components/FinancialCalculator';
import PostItNote from './components/PostItNote';

// Layouts & Pages
import RootLayout from './layouts/RootLayout';
import HouseholdLayout from './layouts/HouseholdLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import AccessControl from './pages/AccessControl';

// Features
import HomeView from './features/HomeView';
import MembersView from './features/MembersView';
import SettingsView from './features/SettingsView';
import CalendarView from './features/CalendarView';
import PeopleView from './features/PeopleView';
import HouseView from './features/HouseView';
import PetsView from './features/PetsView';
import VehiclesView from './features/VehiclesView';
import ProfileView from './features/ProfileView';

const API_URL = window.location.origin;

// Inner App handles logic that requires useColorScheme context
function AppInner({ useDracula, setUseDracula }) {
  const { mode, setMode, systemMode } = useColorScheme();
  
  // Resolve effective mode for JS-side calculations
  const effectiveMode = mode === 'system' ? systemMode : mode;
  const isDark = (effectiveMode || 'light') === 'dark';

  const { spec } = useMemo(() => getThemeSpec(effectiveMode || 'light', useDracula), [effectiveMode, useDracula]);

  // Auth & Data State
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const [household, setHousehold] = useState(() => {
    try { return JSON.parse(localStorage.getItem('household')) || null; } catch { return null; }
  });

  const [households, setHouseholds] = useState([]);
  const [sysUsers, setSysUsers] = useState([]);
  const [hhUsers, setHhUsers] = useState([]);     
  const [hhMembers, setHhMembers] = useState([]); 
  const [hhDates, setHhDates] = useState([]);

  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);
  
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'neutral' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  const navigate = useNavigate();
  const authAxios = useMemo(() => axios.create({ 
    baseURL: API_URL, 
    headers: { Authorization: `Bearer ${token}` } 
  }), [token]);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    const swHandler = (e) => { setShowUpdate(true); };
    window.addEventListener('swUpdated', swHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('swUpdated', swHandler);
    };
  }, []);

  const handleUpdate = () => window.location.reload();
  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    }
  };

  const showNotification = useCallback((message, severity = 'neutral') => {
    const joySeverity = severity === 'error' ? 'danger' : (severity === 'info' ? 'neutral' : severity);
    setNotification({ open: true, message, severity: joySeverity });
  }, []);
  const hideNotification = () => setNotification(prev => ({ ...prev, open: false }));

  const confirmAction = useCallback((title, message, onConfirm) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }, []);
  const handleConfirmClose = () => setConfirmDialog(prev => ({ ...prev, open: false }));
  const handleConfirmProceed = () => {
    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
    handleConfirmClose();
  };

  // Data Fetching
  const fetchHhMembers = useCallback((hhId) => {
    if (!hhId) return;
    authAxios.get(`/households/${hhId}/members`).then(res => setHhMembers(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  const fetchHhUsers = useCallback((hhId) => {
    if (!hhId) return;
    authAxios.get(`/households/${hhId}/users`).then(res => setHhUsers(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  const fetchHhDates = useCallback((hhId) => {
    if (!hhId) return;
    authAxios.get(`/households/${hhId}/dates`).then(res => setHhDates(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

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

  useEffect(() => {
    if (token) {
      if (household) {
        fetchHhMembers(household.id);
        fetchHhUsers(household.id);
        fetchHhDates(household.id);
      } else if (user?.role === 'sysadmin') {
        fetchHouseholds();
        fetchSysUsers();
      }
    }
  }, [token, household, user, fetchHhMembers, fetchHhUsers, fetchHhDates, fetchHouseholds, fetchSysUsers]);

  // Actions
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('household');
    setToken(null); setUser(null); setHousehold(null);
    navigate('/login');
  }, [navigate]);

  const login = useCallback(async (email, password) => {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, role, context, household: hhData, user: userData, system_role } = res.data;
      const fullUser = { ...userData, role, system_role };
      setToken(token); setUser(fullUser);
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(fullUser));
      if (context === 'household') {
        setHousehold(hhData);
        localStorage.setItem('household', JSON.stringify(hhData));
        navigate(`/household/${hhData.id}/dashboard`);
      } else {
        setHousehold(null); localStorage.removeItem('household');
        navigate('/access');
      }
  }, [navigate]);

  const handleUpdateHouseholdSettings = useCallback(async (updates) => {
    if (!household) return;
    try {
      await authAxios.put(`/households/${household.id}`, updates);
      setHousehold(prev => {
        const updated = { ...prev, ...updates };
        localStorage.setItem('household', JSON.stringify(updated));
        return updated;
      });
      showNotification("Household updated.", "success");
    } catch (err) { showNotification("Failed to update.", "danger"); }
  }, [authAxios, household, showNotification]);

  const handleCreateUser = useCallback(async (userData) => {
    try {
      await authAxios.post(`/households/${household.id}/users`, userData);
      showNotification("User invited.", "success");
      fetchHhUsers(household.id);
    } catch (err) { showNotification("Error: " + err.message, "danger"); }
  }, [authAxios, household, fetchHhUsers, showNotification]);

  const handleUpdateUser = useCallback(async (userId, updates) => {
    try {
      await authAxios.put(`/admin/users/${userId}`, updates);
      showNotification("User updated.", "success");
      fetchHhUsers(household.id);
    } catch (err) { showNotification("Error: " + err.message, "danger"); }
  }, [authAxios, household, fetchHhUsers, showNotification]);

  const handleUpdateProfile = useCallback(async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      await authAxios.put('/auth/profile', updates);
      if (!updates.sticky_note) showNotification("Profile updated.", "success");
    } catch (err) { showNotification("Failed to update profile.", "danger"); throw err; }
  }, [authAxios, user, showNotification]);

  // Admin Actions for AccessControl
  const handleCreateHousehold = useCallback(async (houseData) => {
    try {
        await authAxios.post('/admin/households', houseData);
        showNotification("Household created successfully.", "success");
        fetchHouseholds();
    } catch (err) { showNotification("Error: " + err.message, "danger"); }
  }, [authAxios, fetchHouseholds, showNotification]);

  const handleUpdateHousehold = useCallback(async (hhId, updates) => {
    try {
        await authAxios.put(`/admin/households/${hhId}`, updates);
        showNotification("Household updated.", "success");
        fetchHouseholds();
    } catch (err) { showNotification("Error: " + err.message, "danger"); }
  }, [authAxios, fetchHouseholds, showNotification]);

  const handleDeleteHousehold = useCallback(async (hhId) => {
    try {
        await authAxios.delete(`/admin/households/${hhId}`);
        showNotification("Household deleted.", "success");
        fetchHouseholds();
    } catch (err) { showNotification("Error: " + err.message, "danger"); }
  }, [authAxios, fetchHouseholds, showNotification]);

  const handleRemoveSysUser = useCallback(async (userId) => {
    try {
        await authAxios.delete(`/admin/users/${userId}`);
        showNotification("User deleted.", "success");
        fetchSysUsers();
    } catch (err) { showNotification("Error: " + err.message, "danger"); }
  }, [authAxios, fetchSysUsers, showNotification]);


  if (loading) return <Box sx={{display:'flex', justifyContent:'center', mt:10}}><CircularProgress /></Box>;

  return (
    <>
      <GlobalStyles styles={{
          '.rbc-calendar': { color: `${spec.foreground} !important`, fontFamily: 'var(--joy-fontFamily-body, sans-serif)' },
          '.rbc-off-range-bg': { backgroundColor: isDark ? 'rgba(0,0,0,0.2) !important' : 'rgba(0,0,0,0.05) !important' },
          '.rbc-today': { backgroundColor: isDark ? 'rgba(189, 147, 249, 0.1) !important' : 'rgba(100, 74, 201, 0.08) !important', border: `1px solid ${spec.purple} !important` },
          '.rbc-header': { borderBottom: `1px solid ${spec.selection || spec.divider} !important`, padding: '8px 0 !important', fontWeight: 'bold' },
          '.rbc-month-view, .rbc-time-view, .rbc-agenda-view': { border: `1px solid ${spec.selection || spec.divider} !important`, borderRadius: '8px', overflow: 'hidden' },
          '.rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row, .rbc-time-content > * + *': { borderLeft: `1px solid ${spec.selection || spec.divider} !important`, borderTop: `1px solid ${spec.selection || spec.divider} !important` },
          '.rbc-toolbar button': { color: `${spec.foreground} !important`, border: `1px solid ${spec.selection || spec.divider} !important` },
          '.rbc-toolbar button:hover, .rbc-toolbar button:active, .rbc-toolbar button.rbc-active': { backgroundColor: `${spec.selection || spec.divider} !important`, color: `${spec.foreground} !important` }
      }} />

      <Routes>
        <Route path="/login" element={!token ? <Login onLogin={login} /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
        <Route path="/calculator" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FloatingCalculator isPopout={true} onClose={() => window.close()} /></Box>} />
        <Route path="/fin-calculator-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FinancialCalculator isPopout={true} onClose={() => window.close()} /></Box>} />
        <Route path="/calendar-window" element={
          <Box sx={{ height: '100vh', bgcolor: 'background.body' }}>
            <FloatingCalendar 
                isPopout={true} 
                onClose={() => window.close()} 
                dates={hhDates}
                api={authAxios}
                householdId={household?.id}
                currentUser={user}
                onDateAdded={() => household && fetchHhDates(household.id)}
            />
          </Box>
        } />
        <Route path="/note-window" element={
          <Box sx={{ height: '100vh', bgcolor: 'background.body' }}>
             <PostItNote 
                isPopout={true} 
                onClose={() => window.close()} 
                user={user}
                onUpdateProfile={handleUpdateProfile}
             />
          </Box>
        } />
        
        <Route element={token ? <RootLayout context={{ api: authAxios, user, showNotification, confirmAction }} /> : <Navigate to="/login" />}>

          <Route index element={household ? <Navigate to={`/household/${household.id}/dashboard`} /> : <Navigate to="/access" />} />

          <Route path="access" element={<AccessControl 
            api={authAxios}
            users={sysUsers}
            currentUser={user}
            households={households}
            onCreateUser={() => {}}
            onCreateHousehold={handleCreateHousehold}
            onUpdateHousehold={handleUpdateHousehold}
            onDeleteHousehold={handleDeleteHousehold}
            onRemoveUser={handleRemoveSysUser}
            onAssignUser={() => {}}
            showNotification={showNotification}
            confirmAction={confirmAction}
          />} />

          <Route path="household/:id" element={<HouseholdLayout 
              households={user?.role === 'sysadmin' ? households : [household]}
              onSelectHousehold={() => {}}
              api={authAxios}
              onUpdateHousehold={handleUpdateHouseholdSettings}
              members={hhMembers}
              fetchHhMembers={fetchHhMembers}
              user={user}
              isDark={isDark}
              showNotification={showNotification}
              confirmAction={confirmAction}
              
              dates={hhDates}
              onDateAdded={() => household && fetchHhDates(household.id)}
              onUpdateProfile={handleUpdateProfile}
              onLogout={logout}
              onSwitchHousehold={() => {}} 
              currentMode={mode}
              onModeChange={setMode} 
              installPrompt={installPrompt}
              onInstall={handleInstallClick}
              
              // Pass down theme controls
              useDracula={useDracula}
              onDraculaChange={(v) => { setUseDracula(v); localStorage.setItem('useDracula', v); }}
            />}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<HomeView household={household} members={hhMembers} currentUser={user} dates={hhDates} onUpdateProfile={handleUpdateProfile} />} />
                            <Route path="calendar" element={<CalendarView showNotification={showNotification} confirmAction={confirmAction} />} />
                            <Route path="people/:personId" element={<PeopleView />} /><Route path="people" element={<Navigate to="new" replace />} />
                            <Route path="pets/:petId" element={<PetsView />} /><Route path="pets" element={<Navigate to="new" replace />} />
                            <Route path="house/:houseId" element={<HouseView />} /><Route path="house" element={<Navigate to={household ? `${household.id}` : '1'} replace />} />
                            <Route path="vehicles/:vehicleId" element={<VehiclesView />} /><Route path="vehicles" element={<Navigate to="new" replace />} />
                            <Route path="profile" element={<ProfileView />} />
                            <Route path="settings/users/:userId" element={<ProfileView />} />

              <Route path="settings" element={<SettingsView 
                household={household} users={hhUsers} currentUser={user} api={authAxios}
                onUpdateHousehold={handleUpdateHouseholdSettings} onDeleteHousehold={() => {}}
                onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser}
                onRemoveUser={(userId) => authAxios.delete(`/households/${household.id}/users/${userId}`).then(() => fetchHhUsers(household.id))}
                onManageAccess={() => {}}
                currentMode={mode} 
                onModeChange={setMode}
                useDracula={useDracula} onDraculaChange={(v) => { setUseDracula(v); localStorage.setItem('useDracula', v); }}
                members={hhMembers}
                onAddMember={(e) => {
                  e.preventDefault(); 
                  const data = Object.fromEntries(new FormData(e.currentTarget));
                  authAxios.post(`/households/${household.id}/members`, data).then(() => { 
                    fetchHhMembers(household.id); e.target.reset(); showNotification("Member added.", "success");
                  });
                }}
                onRemoveMember={(id) => authAxios.delete(`/households/${household.id}/members/${id}`).then(() => { fetchHhMembers(household.id); showNotification("Member removed.", "neutral"); })}
                onUpdateMember={(mid, data) => authAxios.put(`/households/${household.id}/members/${mid}`, data).then(() => { fetchHhMembers(household.id); showNotification("Member updated.", "success"); })}
                showNotification={showNotification} confirmAction={confirmAction}
              />} />
          </Route>
        </Route>
      </Routes>

      <Snackbar 
        open={notification.open} autoHideDuration={4000} onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        variant="soft" color={notification.severity}
      >
        {notification.message}
      </Snackbar>

      <Modal open={confirmDialog.open} onClose={handleConfirmClose}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle>{confirmDialog.title}</DialogTitle>
          <DialogContent>{confirmDialog.message}</DialogContent>
          <DialogActions>
            <Button variant="plain" color="neutral" onClick={handleConfirmClose}>Cancel</Button>
            <Button variant="solid" color="danger" onClick={handleConfirmProceed}>Proceed</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      <Snackbar 
        open={showUpdate} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        color="primary" variant="solid"
        endDecorator={<Button onClick={handleUpdate} size="sm" variant="solid" color="warning">Refresh</Button>}
      >
        A new version of Totem is available!
      </Snackbar>
    </>
  );
}

export default function App() {
  // Lift useDracula state to App level so we can pass dynamic theme to Provider
  // Default to false (Standard Theme) as per user request ("can we have Dark and Light with the option...")
  const [useDracula, setUseDracula] = useState(() => localStorage.getItem('useDracula') === 'true');
  
  const theme = useMemo(() => getTotemTheme(useDracula), [useDracula]);

  return (
    <BrowserRouter>
      <CssVarsProvider 
        theme={theme} 
        defaultMode="system"
        disableNestedContext
      >
        <CssBaseline />
        <AppInner useDracula={useDracula} setUseDracula={setUseDracula} />
      </CssVarsProvider>
    </BrowserRouter>
  );
}