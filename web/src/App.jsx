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
import TaxCalculator from './components/TaxCalculator';
import PostItNote from './components/PostItNote';

// Layouts & Pages
import RootLayout from './layouts/RootLayout';
import HouseholdLayout from './layouts/HouseholdLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import HouseholdSelector from './pages/HouseholdSelector';

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
  const [hhUsers, setHhUsers] = useState([]);     
  const [hhMembers, setHhMembers] = useState([]); 
  const [hhDates, setHhDates] = useState([]);

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'neutral' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  const navigate = useNavigate();
  const authAxios = useMemo(() => axios.create({ 
    baseURL: API_URL, 
    headers: { Authorization: `Bearer ${token}` } 
  }), [token]);

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

  useEffect(() => {
    if (token && household) {
        fetchHhMembers(household.id);
        fetchHhUsers(household.id);
        fetchHhDates(household.id);
    }
  }, [token, household, fetchHhMembers, fetchHhUsers, fetchHhDates]);

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
        navigate('/select-household');
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

  const handleUpdateProfile = useCallback(async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      await authAxios.put('/auth/profile', updates);
      if (!updates.sticky_note) showNotification("Profile updated.", "success");
    } catch (err) { showNotification("Failed to update profile.", "danger"); throw err; }
  }, [authAxios, user, showNotification]);

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
        <Route path="/tax-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><TaxCalculator isPopout={true} onClose={() => window.close()} /></Box>} />
        <Route path="/calendar-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FloatingCalendar isPopout={true} onClose={() => window.close()} dates={hhDates} api={authAxios} householdId={household?.id} currentUser={user} onDateAdded={() => household && fetchHhDates(household.id)} /></Box>} />
        <Route path="/note-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><PostItNote isPopout={true} onClose={() => window.close()} user={user} onUpdateProfile={handleUpdateProfile} /></Box>} />
        
        <Route element={token ? <RootLayout context={{ api: authAxios, user, showNotification, confirmAction }} /> : <Navigate to="/login" />}>
          <Route index element={household ? <Navigate to={`/household/${household.id}/dashboard`} /> : <Navigate to="/select-household" />} />
          <Route path="select-household" element={<HouseholdSelector api={authAxios} currentUser={user} onLogout={logout} showNotification={showNotification} />} />

          <Route path="household/:id" element={<HouseholdLayout 
              households={[]}
              api={authAxios} onUpdateHousehold={handleUpdateHouseholdSettings}
              members={hhMembers} fetchHhMembers={fetchHhMembers} user={user} isDark={isDark}
              showNotification={showNotification} confirmAction={confirmAction}
              dates={hhDates} onDateAdded={() => household && fetchHhDates(household.id)}
              onUpdateProfile={handleUpdateProfile} onLogout={logout}
              currentMode={mode} onModeChange={setMode} 
              useDracula={useDracula} onDraculaChange={(v) => { setUseDracula(v); localStorage.setItem('useDracula', v); }}
            />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<HomeView household={household} members={hhMembers} currentUser={user} dates={hhDates} onUpdateProfile={handleUpdateProfile} />} />
                <Route path="calendar" element={<CalendarView showNotification={showNotification} confirmAction={confirmAction} />} />
                <Route path="people/:personId" element={<PeopleView />} /><Route path="people" element={<Navigate to="new" replace />} />
                <Route path="pets/:petId" element={<PetsView />} /><Route path="pets" element={<Navigate to="new" replace />} />
                <Route path="house/:houseId" element={<HouseView />} /><Route path="house" element={<Navigate to={household ? `${household.id}` : '1'} replace />} />
                <Route path="vehicles/:vehicleId" element={<VehiclesView />} /><Route path="vehicles" element={<Navigate to="new" replace />} />
                <Route path="profile" element={<ProfileView />} />
                <Route path="settings" element={<SettingsView 
                    household={household} users={hhUsers} currentUser={user} api={authAxios}
                    onUpdateHousehold={handleUpdateHouseholdSettings}
                    currentMode={mode} onModeChange={setMode}
                    useDracula={useDracula} onDraculaChange={(v) => { setUseDracula(v); localStorage.setItem('useDracula', v); }}
                    showNotification={showNotification} confirmAction={confirmAction}
                />} />
          </Route>
        </Route>
      </Routes>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={hideNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} variant="soft" color={notification.severity} sx={{ zIndex: 3000, bottom: '50px !important' }}>
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
    </>
  );
}

export default function App() {
  const [useDracula, setUseDracula] = useState(() => localStorage.getItem('useDracula') === 'true');
  const theme = useMemo(() => getTotemTheme(useDracula), [useDracula]);
  return (
    <BrowserRouter>
      <CssVarsProvider theme={theme} defaultMode="system" disableNestedContext>
        <CssBaseline />
        <AppInner useDracula={useDracula} setUseDracula={setUseDracula} />
      </CssVarsProvider>
    </BrowserRouter>
  );
}
