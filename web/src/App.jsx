import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  Box, CssVarsProvider, Button, 
  Snackbar, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions,
  GlobalStyles, useColorScheme
} from '@mui/joy';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CssBaseline from '@mui/joy/CssBaseline';

// Theme and Local Components
import { getTotemTheme, getThemeSpec, THEMES } from './theme';
import FloatingCalculator from './components/FloatingCalculator';
import FloatingCalendar from './components/FloatingCalendar';
import FloatingSavings from './components/FloatingSavings';
import FloatingInvestments from './components/FloatingInvestments';
import FloatingPensions from './components/FloatingPensions';
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
import SettingsView from './features/SettingsView';
import MealPlannerView from './features/MealPlannerView';
import CalendarView from './features/CalendarView';
import PeopleView from './features/PeopleView';
import HouseView from './features/HouseView';
import PetsView from './features/PetsView';
import VehiclesView from './features/VehiclesView';
import ProfileView from './features/ProfileView';
import FinanceView from './features/FinanceView';

const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api`;

// Inner App handles logic that requires useColorScheme context
function AppInner({ themeId, setThemeId }) {
  const { setMode } = useColorScheme();
  
  const { spec, isDark } = useMemo(() => getThemeSpec(themeId), [themeId]);

  // Synchronize MUI mode with theme spec mode
  useEffect(() => {
    setMode(spec.mode);
  }, [spec.mode, setMode]);

  // Synchronize browser tab theme color with theme primary color
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor && spec.primary) {
      metaThemeColor.setAttribute('content', spec.primary);
    }
  }, [spec.primary]);

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
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

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
  const fetchHouseholds = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authAxios.get('/auth/my-households');
      setHouseholds(res.data || []);
    } catch (err) {
      console.error("Failed to fetch households", err);
    }
  }, [authAxios, token]);

  const fetchHhMembers = useCallback((hhId) => {
    if (!hhId) return;
    return authAxios.get(`/households/${hhId}/members`).then(res => setHhMembers(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  const fetchHhUsers = useCallback((hhId) => {
    if (!hhId) return;
    return authAxios.get(`/households/${hhId}/users`).then(res => setHhUsers(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  const fetchHhDates = useCallback((hhId) => {
    if (!hhId) return;
    return authAxios.get(`/households/${hhId}/dates`).then(res => setHhDates(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  useEffect(() => {
    if (token) {
        Promise.resolve().then(() => fetchHouseholds());
    }
  }, [token, fetchHouseholds]);

  // Synchronize user role with active household
  useEffect(() => {
    if (household && households.length > 0) {
        const activeLink = households.find(h => h.id === household.id);
        if (activeLink && activeLink.role !== user?.role) {
            const updatedUser = { ...user, role: activeLink.role };
            Promise.resolve().then(() => {
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
            });
        }
    }
  }, [household, households, user]);

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

  // Automatic Logout on 401/403
  useEffect(() => {
    const interceptor = authAxios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Prevent loop if already on login
          if (window.location.pathname !== '/login') {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => authAxios.interceptors.response.eject(interceptor);
  }, [authAxios, logout]);

  const login = useCallback(async (email, password) => {
      // Login uses API_URL which now includes /api
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, role, context, household: hhData, user: userData, system_role } = res.data;
      const fullUser = { ...userData, role, system_role };
      setToken(token); setUser(fullUser);
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(fullUser));
      
      // Update theme from user object
      if (userData.theme) setThemeId(userData.theme);

      if (context === 'household') {
        setHousehold(hhData);
        localStorage.setItem('household', JSON.stringify(hhData));
        navigate(`/household/${hhData.id}/dashboard`);
      } else {
        setHousehold(null); localStorage.removeItem('household');
        navigate('/select-household');
      }
  }, [navigate, setThemeId]);

  const handleSelectHousehold = useCallback(async (hh) => {
    try {
      // 1. Persist preference
      await authAxios.post(`/households/${hh.id}/select`);
      
      // 2. Get new token for the new context
      const tokenRes = await authAxios.post('/auth/token', { householdId: hh.id });
      const newToken = tokenRes.data.token;
      const newRole = tokenRes.data.role;

      // 3. Update Auth State
      setToken(newToken);
      localStorage.setItem('token', newToken);

      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 4. Update Household State
      setHousehold(hh);
      localStorage.setItem('household', JSON.stringify(hh));
    } catch (err) {
      console.error("Failed to transition to new household context", err);
      showNotification("Failed to switch household context.", "danger");
    }
  }, [authAxios, user, showNotification]);

  const handleUpdateHouseholdSettings = useCallback(async (updates) => {
    if (!household) return;
    try {
      await authAxios.put(`/households/${household.id}`, updates);
      
      const updatedHH = { ...household, ...updates };
      
      // Update Single State
      setHousehold(updatedHH);
      localStorage.setItem('household', JSON.stringify(updatedHH));

      // Update List State to ensure Layouts depending on list are updated
      setHouseholds(prev => prev.map(h => h.id === household.id ? { ...h, ...updates } : h));

      showNotification("Household updated.", "success");
    } catch { showNotification("Failed to update.", "danger"); }
  }, [authAxios, household, showNotification]);

  const handleUpdateProfile = useCallback(async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      await authAxios.put('/auth/profile', updates);
      
      if (updates.theme) setThemeId(updates.theme);
      
      if (!updates.sticky_note && !updates.theme) showNotification("Profile updated.", "success");
    } catch (err) { showNotification("Failed to update profile.", "danger"); throw err; }
  }, [authAxios, user, showNotification, setThemeId]);

  // Synchronize themeId with user theme preference
  useEffect(() => {
    if (user?.theme && user.theme !== themeId) {
      setThemeId(user.theme);
    }
  }, [user, themeId, setThemeId]);

  return (
    <>
      <GlobalStyles styles={{
          '.rbc-calendar': { color: `${spec.text} !important`, fontFamily: 'var(--joy-fontFamily-body, sans-serif)' },
          '.rbc-off-range-bg': { backgroundColor: isDark ? 'rgba(0,0,0,0.2) !important' : 'rgba(0,0,0,0.05) !important' },
          '.rbc-today': { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05) !important' : 'rgba(0, 0, 0, 0.03) !important', border: `1px solid ${spec.primary} !important` },
          '.rbc-header': { borderBottom: `1px solid ${spec.selection} !important`, padding: '8px 0 !important', fontWeight: 'bold' },
          '.rbc-month-view, .rbc-time-view, .rbc-agenda-view': { border: `1px solid ${spec.selection} !important`, borderRadius: '8px', overflow: 'hidden' },
          '.rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row, .rbc-time-content > * + *': { borderLeft: `1px solid ${spec.selection} !important`, borderTop: `1px solid ${spec.selection} !important` },
          '.rbc-toolbar button': { color: `${spec.text} !important`, border: `1px solid ${spec.selection} !important` },
          '.rbc-toolbar button:hover, .rbc-toolbar button:active, .rbc-toolbar button.rbc-active': { backgroundColor: `${spec.selection} !important`, color: `${spec.text} !important` }
      }} />

      <Routes>
        <Route path="/login" element={!token ? <Login onLogin={login} /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
        <Route path="/calculator" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FloatingCalculator isPopout={true} onClose={() => window.close()} /></Box>} />
        <Route path="/fin-calculator-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FinancialCalculator isPopout={true} onClose={() => window.close()} /></Box>} />
        <Route path="/tax-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><TaxCalculator isPopout={true} onClose={() => window.close()} /></Box>} />
        <Route path="/calendar-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FloatingCalendar isPopout={true} onClose={() => window.close()} dates={hhDates} api={authAxios} householdId={household?.id} currentUser={user} onDateAdded={() => household && fetchHhDates(household.id)} /></Box>} />
        <Route path="/savings-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FloatingSavings isPopout={true} onClose={() => window.close()} api={authAxios} householdId={household?.id} isDark={isDark} /></Box>} />
        <Route path="/investments-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FloatingInvestments isPopout={true} onClose={() => window.close()} api={authAxios} householdId={household?.id} isDark={isDark} /></Box>} />
        <Route path="/pensions-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><FloatingPensions isPopout={true} onClose={() => window.close()} api={authAxios} householdId={household?.id} isDark={isDark} /></Box>} />
        <Route path="/note-window" element={<Box sx={{ height: '100vh', bgcolor: 'background.body' }}><PostItNote isPopout={true} onClose={() => window.close()} user={user} onUpdateProfile={handleUpdateProfile} /></Box>} />
        
        <Route element={token ? <RootLayout context={{ api: authAxios, user, showNotification, confirmAction }} /> : <Navigate to="/login" />}>
          <Route index element={household ? <Navigate to={`/household/${household.id}/dashboard`} /> : <Navigate to="/select-household" />} />
          <Route path="select-household" element={<HouseholdSelector api={authAxios} currentUser={user} onLogout={logout} showNotification={showNotification} onSelectHousehold={handleSelectHousehold} />} />

          <Route path="household/:id" element={<HouseholdLayout 
              households={households}
              onSelectHousehold={handleSelectHousehold}
              api={authAxios} onUpdateHousehold={handleUpdateHouseholdSettings}
              members={hhMembers} fetchHhMembers={fetchHhMembers} user={user} isDark={isDark}
              showNotification={showNotification} confirmAction={confirmAction}
              dates={hhDates} onDateAdded={() => household && fetchHhDates(household.id)}
              onUpdateProfile={handleUpdateProfile} onLogout={logout}
              themeId={themeId} onThemeChange={(newId) => handleUpdateProfile({ theme: newId })}
              installPrompt={installPrompt} onInstall={handleInstall}
            />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<HomeView household={household} members={hhMembers} currentUser={user} dates={hhDates} onUpdateProfile={handleUpdateProfile} api={authAxios} />} />
                <Route path="calendar" element={<CalendarView showNotification={showNotification} confirmAction={confirmAction} />} />
                <Route path="people/:personId" element={<PeopleView />} /><Route path="people" element={<PeopleView />} />
                <Route path="pets/:petId" element={<PetsView />} /><Route path="pets" element={<PetsView />} />
                <Route path="house/:houseId" element={<HouseView />} /><Route path="house" element={<Navigate to={household ? `${household.id}` : '1'} replace />} />
                <Route path="vehicles/:vehicleId" element={<VehiclesView />} /><Route path="vehicles" element={<VehiclesView />} />
                <Route path="profile" element={<ProfileView />} />
                <Route path="meals" element={<MealPlannerView />} />
                <Route path="finance" element={<FinanceView />} />
                <Route path="settings" element={<SettingsView 
                    household={household} users={hhUsers} currentUser={user} api={authAxios}
                    onUpdateHousehold={handleUpdateHouseholdSettings}
                    themeId={themeId} onThemeChange={(newId) => handleUpdateProfile({ theme: newId })}
                    showNotification={showNotification} confirmAction={confirmAction}
                    fetchHhUsers={fetchHhUsers}
                />} />
                {/* Mobile Tools Routes */}
                <Route path="tools/notes" element={<Box sx={{ height: '100%' }}><PostItNote isPopout={true} onClose={() => navigate(-1)} user={user} onUpdateProfile={handleUpdateProfile} /></Box>} />
                <Route path="tools/calculator" element={<Box sx={{ height: '100%' }}><FloatingCalculator isPopout={true} onClose={() => navigate(-1)} isDark={isDark} /></Box>} />
                <Route path="tools/finance" element={<Box sx={{ height: '100%' }}><FinancialCalculator isPopout={true} onClose={() => navigate(-1)} isDark={isDark} /></Box>} />
                <Route path="tools/tax" element={<Box sx={{ height: '100%' }}><TaxCalculator isPopout={true} onClose={() => navigate(-1)} isDark={isDark} /></Box>} />
                <Route path="tools/savings" element={<Box sx={{ height: '100%' }}><FloatingSavings isPopout={true} onClose={() => navigate(-1)} api={authAxios} householdId={household?.id} isDark={isDark} /></Box>} />
                <Route path="tools/investments" element={<Box sx={{ height: '100%' }}><FloatingInvestments isPopout={true} onClose={() => navigate(-1)} api={authAxios} householdId={household?.id} isDark={isDark} /></Box>} />
                <Route path="tools/pensions" element={<Box sx={{ height: '100%' }}><FloatingPensions isPopout={true} onClose={() => navigate(-1)} api={authAxios} householdId={household?.id} isDark={isDark} /></Box>} />
                <Route path="tools/calendar" element={<Box sx={{ height: '100%' }}><FloatingCalendar isPopout={true} onClose={() => navigate(-1)} dates={hhDates} api={authAxios} householdId={household?.id} currentUser={user} onDateAdded={() => household && fetchHhDates(household.id)} isDark={isDark} /></Box>} />
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
  const [themeId, setThemeId] = useState(() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.theme || 'totem';
  });
  const theme = useMemo(() => getTotemTheme(themeId), [themeId]);
  
  const handleThemeChange = (newThemeId) => {
    setThemeId(newThemeId);
  };

  return (
    <BrowserRouter>
      <CssVarsProvider theme={theme} defaultMode={THEMES[themeId]?.mode || 'light'} disableNestedContext>
        <CssBaseline />
        <AppInner themeId={themeId} setThemeId={handleThemeChange} />
      </CssVarsProvider>
    </BrowserRouter>
  );
}