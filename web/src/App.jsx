import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import axios from 'axios';
import { 
  Box, CssVarsProvider, Button, 
  Snackbar, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions,
  GlobalStyles, useColorScheme, Typography, CircularProgress
} from '@mui/joy';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CssBaseline from '@mui/joy/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import pkg from '../package.json';

// Theme and Local Components
import { getMantelTheme, getThemeSpec, THEMES } from './theme';
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

// Lazy Loaded Features
const HomeView = lazy(() => import('./features/HomeView'));
const SettingsView = lazy(() => import('./features/SettingsView'));
const MealPlannerView = lazy(() => import('./features/MealPlannerView'));
const CalendarView = lazy(() => import('./features/CalendarView'));
const PeopleView = lazy(() => import('./features/PeopleView'));
const HouseView = lazy(() => import('./features/HouseView'));
const PetsView = lazy(() => import('./features/PetsView'));
const VehiclesView = lazy(() => import('./features/VehiclesView'));
const ProfileView = lazy(() => import('./features/ProfileView'));
const FinanceView = lazy(() => import('./features/FinanceView'));

const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api`;
console.log("[App] API_URL:", API_URL);

const IDLE_WARNING_MS = 60 * 60 * 1000; // 1 Hour
const IDLE_LOGOUT_MS = 120 * 60 * 1000;  // 2 Hours

// Standard Page Loader
const PageLoader = () => (
  <Box sx={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress size="lg" />
  </Box>
);

// Global Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function AppInner({ 
    themeId, setThemeId, user, setUser, token, setToken, household, setHousehold, 
    logout, login, mfaLogin, spec, isDark 
}) {
  const { setMode } = useColorScheme();
  
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

  const [households, setHouseholds] = useState([]);
  const [hhUsers, setHhUsers] = useState([]);     
  const [hhMembers, setHhMembers] = useState([]); 
  const [hhVehicles, setHhVehicles] = useState([]);
  const [hhDates, setHhDates] = useState([]);

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'neutral' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [installPrompt, setInstallPrompt] = useState(null);

  // Idle Timer State
  const lastActivity = useRef(0);
  
  useEffect(() => {
      lastActivity.current = Date.now();
  }, []);

  const [isIdleWarning, setIsIdleWarning] = useState(false);

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

  // --- Idle Timer Logic ---
  const resetActivity = useCallback(() => {
    if (!isIdleWarning) {
        lastActivity.current = Date.now();
    }
  }, [isIdleWarning]);

  useEffect(() => {
      const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
      const handler = () => resetActivity();
      
      events.forEach(e => window.addEventListener(e, handler));
      return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [resetActivity]);

  useEffect(() => {
      if (!token) return;

      const interval = setInterval(() => {
          // If "Remember Me" is active, skip idle checks
          if (localStorage.getItem('persistentSession') === 'true') {
              return;
          }

          const now = Date.now();
          const diff = now - lastActivity.current;

          if (diff > IDLE_WARNING_MS && !isIdleWarning) {
              setIsIdleWarning(true);
          }

          if (diff > IDLE_LOGOUT_MS) {
              logout();
              showNotification("Session expired due to inactivity.", "neutral");
          }
      }, 1000);

      return () => clearInterval(interval);
  }, [token, isIdleWarning, logout, showNotification]);

  const handleExtendSession = () => {
      lastActivity.current = Date.now();
      setIsIdleWarning(false);
  };
  // ------------------------

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

  const fetchHhVehicles = useCallback((hhId) => {
    if (!hhId) return;
    return authAxios.get(`/households/${hhId}/vehicles`).then(res => setHhVehicles(Array.isArray(res.data) ? res.data : []));
  }, [authAxios]);

  useEffect(() => {
    if (token) {
        Promise.resolve().then(() => fetchHouseholds());
    }
  }, [token, fetchHouseholds]);

  // Validate active household existence
  useEffect(() => {
    if (token && household && households.length > 0) {
      const exists = households.find(h => h.id === household.id);
      if (!exists) {
        Promise.resolve().then(() => {
          setHousehold(null);
          localStorage.removeItem('household');
          navigate('/select-household');
          showNotification("The selected household is no longer available.", "warning");
        });
      }
    }
  }, [households, household, token, navigate, setHousehold, showNotification]);

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
  }, [household, households, user, setUser]);

  useEffect(() => {
    if (token && household) {
        Promise.resolve().then(() => {
            setHhMembers([]);
            setHhUsers([]);
            setHhDates([]);
            setHhVehicles([]);
        });

        fetchHhMembers(household.id);
        fetchHhUsers(household.id);
        fetchHhDates(household.id);
        fetchHhVehicles(household.id);
    }
  }, [token, household, fetchHhMembers, fetchHhUsers, fetchHhDates, fetchHhVehicles]);

  // Automatic Logout on 401/403/Version Mismatch
  useEffect(() => {
    const interceptor = authAxios.interceptors.response.use(
      (response) => {
        const serverVersion = response.headers['x-api-version'];
        if (serverVersion && serverVersion !== pkg.version) {
           logout();
           window.location.reload();
        }
        return response;
      },
      (error) => {
        if (error.response) {
            const { status, data } = error.response;
            const serverVersion = error.response.headers['x-api-version'];
            if (serverVersion && serverVersion !== pkg.version) {
                logout();
                window.location.reload();
                return Promise.reject(error);
            }

            if (status === 401 || status === 403) {
                if (window.location.pathname !== '/login') {
                    logout();
                }
            } else if (status === 404 && data?.error && typeof data.error === 'string') {
                if (data.error.includes('Household') && data.error.includes('no longer exists')) {
                    setHousehold(null);
                    localStorage.removeItem('household');
                    navigate('/select-household');
                    showNotification("The selected household is no longer available.", "warning");
                }
            }
        }
        return Promise.reject(error);
      }
    );
    return () => authAxios.interceptors.response.eject(interceptor);
  }, [authAxios, logout, navigate, showNotification, setHousehold]);

  const handleSelectHousehold = useCallback(async (hh) => {
    try {
      await authAxios.post(`/households/${hh.id}/select`);
      const tokenRes = await authAxios.post('/auth/token', { householdId: hh.id });
      const newToken = tokenRes.data.token;
      const newRole = tokenRes.data.role;

      setToken(newToken);
      localStorage.setItem('token', newToken);

      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setHousehold(hh);
      localStorage.setItem('household', JSON.stringify(hh));
    } catch (err) {
      console.error("Failed to transition context", err);
      showNotification("Failed to switch household context.", "danger");
    }
  }, [authAxios, user, setUser, setToken, setHousehold, showNotification]);

  const handleUpdateHouseholdSettings = useCallback(async (updates) => {
    if (!household) return;
    try {
      await authAxios.put(`/households/${household.id}`, updates);
      const updatedHH = { ...household, ...updates };
      setHousehold(updatedHH);
      localStorage.setItem('household', JSON.stringify(updatedHH));
      setHouseholds(prev => prev.map(h => h.id === household.id ? { ...h, ...updates } : h));
      showNotification("Household updated.", "success");
    } catch { showNotification("Failed to update.", "danger"); }
  }, [authAxios, household, setHousehold, showNotification]);

  const handleUpdateProfile = useCallback(async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      await authAxios.put('/auth/profile', updates);
      
      if (updates.theme) setThemeId(updates.theme);
      
      if (!updates.sticky_note && !updates.theme && !updates.custom_theme) showNotification("Profile updated.", "success");
    } catch (err) { showNotification("Failed to update profile.", "danger"); throw err; }
  }, [authAxios, user, setUser, setThemeId, showNotification]);

  return (
    <>
      <GlobalStyles styles={{
          'html, body': { margin: 0, padding: 0, overflow: 'hidden', height: '100dvh', width: '100vw' },
          '#root': { height: '100dvh', width: '100vw', overflow: 'hidden' },
          '.rbc-calendar': { color: `${spec.text} !important`, fontFamily: 'var(--joy-fontFamily-body, sans-serif)' },
          '.rbc-off-range-bg': { backgroundColor: isDark ? 'rgba(0,0,0,0.2) !important' : 'rgba(0,0,0,0.05) !important' },
          '.rbc-today': { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05) !important' : 'rgba(0, 0, 0, 0.03) !important', border: `1px solid ${spec.primary} !important` },
          '.rbc-header': { borderBottom: `1px solid ${spec.selection} !important`, padding: '8px 0 !important', fontWeight: 'bold' },
          '.rbc-month-view, .rbc-time-view, .rbc-agenda-view': { border: `1px solid ${spec.selection} !important`, borderRadius: '8px', overflow: 'hidden' },
          '.rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row, .rbc-time-content > * + *': { borderLeft: `1px solid ${spec.selection} !important`, borderTop: `1px solid ${spec.selection} !important` },
          '.rbc-toolbar button': { color: `${spec.text} !important`, border: `1px solid ${spec.selection} !important` },
          '.rbc-toolbar button:hover, .rbc-toolbar button:active, .rbc-toolbar button.rbc-active': { backgroundColor: `${spec.selection} !important`, color: `${spec.text} !important` }
      }} />

      <Suspense fallback={<PageLoader />}>
        <Routes>
            <Route path="/login" element={!token ? <Login onLogin={login} onMfaLogin={mfaLogin} /> : <Navigate to="/" />} />
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
                households={households} onSelectHousehold={handleSelectHousehold} api={authAxios} onUpdateHousehold={handleUpdateHouseholdSettings}
                members={hhMembers} fetchHhMembers={fetchHhMembers} vehicles={hhVehicles} fetchVehicles={fetchHhVehicles}
                user={user} isDark={isDark} showNotification={showNotification} confirmAction={confirmAction}
                dates={hhDates} onDateAdded={() => household && fetchHhDates(household.id)}
                onUpdateProfile={handleUpdateProfile} onLogout={logout}
                themeId={themeId} onThemeChange={(newId) => handleUpdateProfile({ theme: newId })}
                installPrompt={installPrompt} onInstall={handleInstall} household={household}
                />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<HomeView household={household} members={hhMembers} currentUser={user} dates={hhDates} onUpdateProfile={handleUpdateProfile} api={authAxios} />} />
                    <Route path="calendar" element={<CalendarView showNotification={showNotification} confirmAction={confirmAction} />} />
                    <Route path="people/:personId" element={<PeopleView />} /><Route path="people" element={<PeopleView />} />
                    <Route path="pets/:petId" element={<PetsView />} /><Route path="pets" element={<PetsView />} />
                    <Route path="house/:houseId/assets/:assetId" element={<HouseView />} />
                    <Route path="house/:houseId/assets" element={<HouseView />} />
                    <Route path="house/:houseId" element={<HouseView />} />
                    <Route path="house" element={<HouseView />} />
                    <Route path="vehicles/:vehicleId" element={<VehiclesView />} /><Route path="vehicles" element={<VehiclesView />} />
                    <Route path="profile" element={<ProfileView />} />
                    <Route path="meals" element={<MealPlannerView />} />
                    <Route path="finance" element={<FinanceView />} />
                    <Route path="settings" element={<SettingsView 
                        household={household} users={hhUsers} currentUser={user} api={authAxios}
                        onUpdateHousehold={handleUpdateHouseholdSettings} themeId={themeId}
                        onThemeChange={(newId) => handleUpdateProfile({ theme: newId })}
                        showNotification={showNotification} confirmAction={confirmAction} fetchHhUsers={fetchHhUsers}
                        onUpdateProfile={handleUpdateProfile}
                    />} />
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
      </Suspense>

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

      <Modal open={isIdleWarning} onClose={() => {}}>
        <ModalDialog variant="outlined" role="alertdialog" color="warning">
            <DialogTitle>Session Expiring</DialogTitle>
            <DialogContent><Typography>Your session has been idle for 5 minutes. Logout in 1 minute.</Typography></DialogContent>
            <DialogActions>
                <Button variant="solid" color="primary" onClick={handleExtendSession}>Extend Session</Button>
                <Button variant="plain" color="neutral" onClick={logout}>Log Out Now</Button>
            </DialogActions>
        </ModalDialog>
      </Modal>
    </>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const [household, setHousehold] = useState(() => {
    try { return JSON.parse(localStorage.getItem('household')) || null; } catch { return null; }
  });

  const [themeId, setThemeId] = useState(user?.theme || 'totem');

  const customConfig = useMemo(() => {
    if (!user?.custom_theme) return null;
    try {
        return typeof user.custom_theme === 'string' ? JSON.parse(user.custom_theme) : user.custom_theme;
    } catch { return null; }
  }, [user?.custom_theme]);

  const { spec, isDark } = useMemo(() => getThemeSpec(themeId, customConfig), [themeId, customConfig]);
  const theme = useMemo(() => getMantelTheme(themeId, customConfig), [themeId, customConfig]);
  
  const login = useCallback(async (email, password, rememberMe) => {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password, rememberMe });
      
      if (res.data.mfa_required) {
          return { mfa_required: true, preAuthToken: res.data.preAuthToken };
      }

      const { token, role, context, household: hhData, user: userData, system_role } = res.data;
      const fullUser = { ...userData, role, system_role };
      setToken(token); setUser(fullUser);
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(fullUser));
      
      if (rememberMe) {
          localStorage.setItem('persistentSession', 'true');
      } else {
          localStorage.removeItem('persistentSession');
      }
      
      if (userData.theme) setThemeId(userData.theme);
      if (context === 'household') {
        setHousehold(hhData);
        localStorage.setItem('household', JSON.stringify(hhData));
        console.log("[App] Redirecting to household dashboard:", hhData.id);
        window.location.href = `/household/${hhData.id}/dashboard`;
      } else {
        setHousehold(null); localStorage.removeItem('household');
        console.log("[App] Redirecting to selector");
        window.location.href = '/select-household';
      }
  }, []);

  const mfaLogin = useCallback(async (preAuthToken, code) => {
      const res = await axios.post(`${API_URL}/auth/mfa/login`, { preAuthToken, code });
      const { token, role, context, household: hhData, user: userData, system_role } = res.data;
      const fullUser = { ...userData, role, system_role };
      setToken(token); setUser(fullUser);
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(fullUser));
      
      if (userData.theme) setThemeId(userData.theme);
      if (context === 'household') {
        setHousehold(hhData);
        localStorage.setItem('household', JSON.stringify(hhData));
        console.log("[App] Redirecting to household dashboard:", hhData.id);
        window.location.href = `/household/${hhData.id}/dashboard`;
      } else {
        setHousehold(null); localStorage.removeItem('household');
        console.log("[App] Redirecting to selector");
        window.location.href = '/select-household';
      }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('household');
    localStorage.removeItem('persistentSession');
    setToken(null); setUser(null); setHousehold(null);
    window.location.href = '/login';
  }, []);

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <CssVarsProvider theme={theme} defaultMode={spec.mode} disableNestedContext>
            <CssBaseline />
            <AppInner 
                themeId={themeId} setThemeId={setThemeId} 
                user={user} setUser={setUser} 
                token={token} setToken={setToken} 
                household={household} setHousehold={setHousehold}
                logout={logout} login={login} mfaLogin={mfaLogin}
                spec={spec} isDark={isDark}
            />
        </CssVarsProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
