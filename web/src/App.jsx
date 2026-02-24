import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import axios from 'axios';
import {
  Box,
  CssVarsProvider,
  Button,
  Snackbar,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  GlobalStyles,
  useColorScheme,
  Typography,
  CircularProgress,
} from '@mui/joy';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CssBaseline from '@mui/joy/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ClerkProvider,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from '@clerk/clerk-react';
import pkg from '../package.json';

// Theme and Local Components
import { getAppTheme, getThemeSpec } from './theme';
import { APP_NAME } from './constants';
import CommandBar from './components/CommandBar';

// Layouts & Pages
import RootLayout from './layouts/RootLayout';
import HouseholdLayout from './layouts/HouseholdLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import HouseholdSelector from './pages/HouseholdSelector';

import {
  useHouseholdMembers,
  useHouseholdUsers,
  useHouseholdDates,
  useHouseholdVehicles,
  useMyHouseholds,
} from './hooks/useHouseholdData';

// Lazy Loaded Features
const HomeView = lazy(() => import('./features/HomeView'));
const SettingsView = lazy(() => import('./features/SettingsView'));
const MealPlannerView = lazy(() => import('./features/MealPlannerView'));
const ShoppingListView = lazy(() => import('./features/ShoppingListView'));
const CalendarView = lazy(() => import('./features/CalendarView'));
const PeopleView = lazy(() => import('./features/PeopleView'));
const HouseView = lazy(() => import('./features/HouseView'));
const PetsView = lazy(() => import('./features/PetsView'));
const VehiclesView = lazy(() => import('./features/VehiclesView'));
const ProfileView = lazy(() => import('./features/ProfileView'));
const FinanceView = lazy(() => import('./features/FinanceView'));
const ChoresView = lazy(() => import('./features/ChoresView'));
const AssetsView = lazy(() => import('./features/AssetsView'));
const HouseholdDetailsView = lazy(() => import('./features/HouseholdDetailsView'));
const SecurityAuditView = lazy(() => import('./features/SecurityAuditView'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));

const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api`;

const IDLE_WARNING_MS = 60 * 60 * 1000; // 1 Hour
const IDLE_LOGOUT_MS = 120 * 60 * 1000; // 2 Hours

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * SAFE AUTH HOOKS (Resilient to missing ClerkProvider)
 */
const useAuth = () => {
  const hasKey = !!CLERK_PUBLISHABLE_KEY;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = hasKey ? useClerkAuth() : null;
    return auth || { getToken: () => Promise.resolve(null), isLoaded: true, isSignedIn: false };
  } catch {
    return { getToken: () => Promise.resolve(null), isLoaded: true, isSignedIn: false };
  }
};

const useUser = () => {
  const hasKey = !!CLERK_PUBLISHABLE_KEY;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const user = hasKey ? useClerkUser() : null;
    return user || { isLoaded: true, isSignedIn: false, user: null };
  } catch {
    return { isLoaded: true, isSignedIn: false, user: null };
  }
};

const PageLoader = () => (
  <Box
    data-testid="page-loader"
    sx={{
      display: 'flex',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <CircularProgress size="lg" />
  </Box>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

function AppInner({
  themeId,
  setThemeId,
  user,
  setUser,
  token,
  setToken,
  household,
  setHousehold,
  logout,
  login,
  mfaLogin,
  handleLoginSuccess,
  spec,
  onPreviewTheme,
  mode,
  onModeChange,
}) {
  const { getToken, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { setMode, mode: currentMode, systemMode } = useColorScheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (CLERK_PUBLISHABLE_KEY && authLoaded && isSignedIn && clerkUser) {
      getToken().then((clerkToken) => {
        if (clerkToken && clerkToken !== token) {
          axios
            .get(`${API_URL}/auth/profile`, { headers: { Authorization: `Bearer ${clerkToken}` } })
            .then((res) => {
              const userData = res.data;
              setToken(clerkToken);
              setUser(userData);
              localStorage.setItem('token', clerkToken);
              localStorage.setItem('user', JSON.stringify(userData));
              if (userData.lastHouseholdId) {
                axios
                  .get(`${API_URL}/households/${userData.lastHouseholdId}/details`, {
                    headers: { Authorization: `Bearer ${clerkToken}` },
                  })
                  .then((hRes) => {
                    setHousehold(hRes.data);
                    localStorage.setItem('household', JSON.stringify(hRes.data));
                  });
              }
            });
        }
      });
    }
  }, [authLoaded, isSignedIn, clerkUser, token, getToken, setHousehold, setToken, setUser]);

  const isDark = useMemo(() => {
    if (currentMode === 'system') return systemMode === 'dark';
    return currentMode === 'dark';
  }, [currentMode, systemMode]);

  useEffect(() => {
    if (mode === 'system') setMode('system');
    else setMode(mode);
  }, [mode, setMode]);

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor && spec.primary) metaThemeColor.setAttribute('content', spec.primary);
  }, [spec.primary]);

  const authAxios = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` },
    });
    instance.interceptors.request.use((req) => {
      if (household?.debugMode === 1)
        console.groupCollapsed(
          `🐛 [DEBUG-CLIENT] Request: ${req.method?.toUpperCase()} ${req.url}`
        );
      return req;
    });
    return instance;
  }, [token, household?.debugMode]);

  const { data: households = [] } = useMyHouseholds(authAxios, token);
  const { data: hhMembers = [], refetch: fetchHhMembers } = useHouseholdMembers(
    authAxios,
    household?.id
  );
  const { data: hhUsers = [], refetch: fetchHhUsers } = useHouseholdUsers(authAxios, household?.id);
  const { data: hhDates = [], refetch: fetchHhDates } = useHouseholdDates(authAxios, household?.id);
  const { data: hhVehicles = [], refetch: fetchHhVehicles } = useHouseholdVehicles(
    authAxios,
    household?.id
  );

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'neutral',
  });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  });
  const [installPrompt, setInstallPrompt] = useState(null);
  const lastActivity = useRef(null);
  const [isIdleWarning, setIsIdleWarning] = useState(false);

  useEffect(() => {
    lastActivity.current = Date.now();
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
      if (choiceResult.outcome === 'accepted') setInstallPrompt(null);
    });
  };

  const showNotification = useCallback((message, severity = 'neutral') => {
    const joySeverity =
      severity === 'error' ? 'danger' : severity === 'info' ? 'neutral' : severity;
    setNotification({ open: true, message, severity: joySeverity });
  }, []);
  const hideNotification = () => setNotification((prev) => ({ ...prev, open: false }));

  const confirmAction = useCallback((title, message, onConfirm) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  }, []);
  const handleConfirmClose = () => setConfirmDialog((prev) => ({ ...prev, open: false }));
  const handleConfirmProceed = () => {
    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
    handleConfirmClose();
  };

  const resetActivity = useCallback(() => {
    if (!isIdleWarning) lastActivity.current = Date.now();
  }, [isIdleWarning]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handler = () => resetActivity();
    events.forEach((e) => window.addEventListener(e, handler));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [resetActivity]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (localStorage.getItem('persistentSession') === 'true') return;
      if (!lastActivity.current) return;
      const diff = Date.now() - lastActivity.current;
      if (diff > IDLE_WARNING_MS && !isIdleWarning) setIsIdleWarning(true);
      if (diff > IDLE_LOGOUT_MS) {
        logout();
        showNotification('Session expired.', 'neutral');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [token, isIdleWarning, logout, showNotification]);

  const handleExtendSession = () => {
    lastActivity.current = Date.now();
    setIsIdleWarning(false);
  };

  useEffect(() => {
    if (token && household && households.length > 0) {
      if (!households.find((h) => h.id === household.id)) {
        setHousehold(null);
        localStorage.removeItem('household');
        navigate('/select-household');
      }
    }
  }, [households, household, token, navigate, setHousehold]);

  useEffect(() => {
    const interceptor = authAxios.interceptors.response.use(
      (res) => {
        const serverVersion = res.headers['x-api-version'];
        if (serverVersion && serverVersion !== pkg.version) window.location.reload();
        return res;
      },
      (err) => {
        if (err.response) {
          const { status } = err.response;
          if (status === 401 || status === 403) {
            if (window.location.pathname !== '/login') logout();
          }
        }
        return Promise.reject(err);
      }
    );
    return () => authAxios.interceptors.response.eject(interceptor);
  }, [authAxios, logout]);

  const handleSelectHousehold = useCallback(
    async (hh) => {
      try {
        await authAxios.post(`/households/${hh.id}/select`);
        const tokenRes = await authAxios.post('/auth/token', { householdId: hh.id });
        setToken(tokenRes.data.token);
        localStorage.setItem('token', tokenRes.data.token);
        setHousehold(hh);
        localStorage.setItem('household', JSON.stringify(hh));
      } catch {
        showNotification('Failed to switch household.', 'danger');
      }
    },
    [authAxios, setToken, setHousehold, showNotification]
  );

  const handleUpdateHouseholdSettings = useCallback(
    async (updates) => {
      if (!household) return;
      try {
        await authAxios.put(`/households/${household.id}/house-details`, updates);
        const updatedHH = { ...household, ...updates };
        setHousehold(updatedHH);
        localStorage.setItem('household', JSON.stringify(updatedHH));
        queryClient.invalidateQueries({ queryKey: ['my-households'] });
        showNotification('Household updated.', 'success');
      } catch {
        showNotification('Failed to update.', 'danger');
      }
    },
    [authAxios, household, setHousehold, showNotification]
  );

  const handleUpdateProfile = useCallback(
    async (updates) => {
      try {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        await authAxios.put('/auth/profile', updates);
        if (updates.theme) setThemeId(updates.theme);
        if (updates.mode) onModeChange(updates.mode);
      } catch (err) {
        showNotification('Update failed.', 'danger');
        throw err;
      }
    },
    [authAxios, user, setUser, setThemeId, onModeChange, showNotification]
  );

  return (
    <>
      <GlobalStyles
        styles={{
          'html, body': {
            margin: 0,
            padding: 0,
            overflow: 'hidden',
            height: '100dvh',
            width: '100vw',
          },
          '#root': { height: '100dvh', width: '100vw', overflow: 'hidden' },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              !token ? (
                <Login
                  onLogin={login}
                  onMfaLogin={mfaLogin}
                  handleLoginSuccess={handleLoginSuccess}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
          <Route
            element={
              token ? (
                <RootLayout context={{ api: authAxios, user, showNotification, confirmAction }} />
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route
              index
              element={
                household ? (
                  <Navigate to={`/household/${household.id}/dashboard`} />
                ) : (
                  <Navigate to="/select-household" />
                )
              }
            />
            <Route
              path="select-household"
              element={
                <HouseholdSelector
                  api={authAxios}
                  currentUser={user}
                  onLogout={logout}
                  showNotification={showNotification}
                  onSelectHousehold={handleSelectHousehold}
                  confirmAction={confirmAction}
                />
              }
            />
            <Route
              path="household/:id"
              element={
                <HouseholdLayout
                  households={households}
                  onSelectHousehold={handleSelectHousehold}
                  api={authAxios}
                  onUpdateHousehold={handleUpdateHouseholdSettings}
                  members={hhMembers}
                  fetchHhMembers={() => fetchHhMembers()}
                  vehicles={hhVehicles}
                  fetchVehicles={() => fetchHhVehicles()}
                  user={user}
                  isDark={isDark}
                  showNotification={showNotification}
                  confirmAction={confirmAction}
                  dates={hhDates}
                  onDateAdded={() => fetchHhDates()}
                  onUpdateProfile={handleUpdateProfile}
                  onLogout={logout}
                  themeId={themeId}
                  onThemeChange={(newId) => handleUpdateProfile({ theme: newId })}
                  mode={mode}
                  onModeChange={(newMode) => handleUpdateProfile({ mode: newMode })}
                  installPrompt={installPrompt}
                  onInstall={handleInstall}
                  household={household}
                  onPreviewTheme={onPreviewTheme}
                />
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route
                path="dashboard"
                element={
                  <HomeView
                    household={household}
                    members={hhMembers}
                    currentUser={user}
                    dates={hhDates}
                    onUpdateProfile={handleUpdateProfile}
                    api={authAxios}
                  />
                }
              />
              <Route
                path="calendar"
                element={
                  <CalendarView showNotification={showNotification} confirmAction={confirmAction} />
                }
              />
              <Route path="people" element={<PeopleView />} />
              <Route path="people/:personId" element={<PeopleView />} />
              <Route path="pets" element={<PetsView />} />
              <Route path="pets/:petId" element={<PetsView />} />
              <Route path="house/assets" element={<AssetsView />} />
              <Route path="house/details" element={<HouseholdDetailsView />} />
              <Route
                path="house/security"
                element={<SecurityAuditView api={authAxios} householdId={household?.id} />}
              />
              <Route path="house" element={<HouseView />} />
              <Route path="vehicles" element={<VehiclesView />} />
              <Route path="profile" element={<ProfileView />} />
              <Route path="meals" element={<MealPlannerView />} />
              <Route path="shopping" element={<ShoppingListView />} />
              <Route path="chores" element={<ChoresView />} />
              <Route path="finance" element={<FinanceView />} />
              <Route path="onboarding" element={<OnboardingWizard />} />
              <Route
                path="settings"
                element={
                  <SettingsView
                    household={household}
                    users={hhUsers}
                    currentUser={user}
                    api={authAxios}
                    onUpdateHousehold={handleUpdateHouseholdSettings}
                    themeId={themeId}
                    onThemeChange={(newId) => handleUpdateProfile({ theme: newId })}
                    mode={mode}
                    onModeChange={(newMode) => handleUpdateProfile({ mode: newMode })}
                    showNotification={showNotification}
                    confirmAction={confirmAction}
                    fetchHhUsers={fetchHhUsers}
                    onUpdateProfile={handleUpdateProfile}
                  />
                }
              />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        variant="soft"
        color={notification.severity}
        sx={{ zIndex: 3000, bottom: '50px !important' }}
      >
        {notification.message}
      </Snackbar>
      <Modal open={confirmDialog.open} onClose={handleConfirmClose}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle>{confirmDialog.title}</DialogTitle>
          <DialogContent>{confirmDialog.message}</DialogContent>
          <DialogActions>
            <Button variant="plain" color="neutral" onClick={handleConfirmClose}>
              Cancel
            </Button>
            <Button variant="solid" color="danger" onClick={handleConfirmProceed}>
              Proceed
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
      <Modal open={isIdleWarning} onClose={() => {}}>
        <ModalDialog variant="outlined" role="alertdialog" color="warning">
          <DialogTitle>Session Expiring</DialogTitle>
          <DialogContent>
            <Typography>Your session has been idle for 5 minutes. Logout in 1 minute.</Typography>
          </DialogContent>
          <DialogActions>
            <Button variant="solid" color="primary" onClick={handleExtendSession}>
              Extend Session
            </Button>
            <Button variant="plain" color="neutral" onClick={logout}>
              Log Out Now
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [household, setHousehold] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('household')) || null;
    } catch {
      return null;
    }
  });
  const [themeId, setThemeId] = useState(user?.theme || 'hearth');
  const [modePref, setModePref] = useState(user?.mode || 'system');
  const [previewThemeId, setPreviewThemeId] = useState(null);

  const customConfig = useMemo(() => {
    if (!user?.customTheme) return null;
    try {
      return typeof user.customTheme === 'string' ? JSON.parse(user.customTheme) : user.customTheme;
    } catch {
      return null;
    }
  }, [user?.customTheme]);

  const theme = useMemo(
    () => getAppTheme(previewThemeId || themeId, customConfig),
    [previewThemeId, themeId, customConfig]
  );
  const { spec } = useMemo(
    () => getThemeSpec(previewThemeId || themeId, customConfig, modePref),
    [previewThemeId, themeId, customConfig, modePref]
  );

  const handleLoginSuccess = useCallback((data, rememberMe) => {
    const { token, role, context, household: hhData, user: userData, system_role } = data;
    const fullUser = { ...userData, role, system_role };
    setToken(token);
    setUser(fullUser);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(fullUser));
    if (rememberMe) localStorage.setItem('persistentSession', 'true');
    else localStorage.removeItem('persistentSession');
    if (userData.theme) setThemeId(userData.theme);
    if (userData.mode) setModePref(userData.mode);
    if (context === 'household') {
      setHousehold(hhData);
      localStorage.setItem('household', JSON.stringify(hhData));
      window.location.href = `/household/${hhData.id}/dashboard`;
    } else {
      setHousehold(null);
      localStorage.removeItem('household');
      window.location.href = '/select-household';
    }
  }, []);

  const login = useCallback(
    async (email, password, rememberMe) => {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password, rememberMe });
      if (res.data.mfa_required) return { mfa_required: true, preAuthToken: res.data.preAuthToken };
      handleLoginSuccess(res.data, rememberMe);
    },
    [handleLoginSuccess]
  );

  const mfaLogin = useCallback(
    async (preAuthToken, code) => {
      const res = await axios.post(`${API_URL}/auth/mfa/login`, { preAuthToken, code });
      handleLoginSuccess(res.data, false);
    },
    [handleLoginSuccess]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('household');
    localStorage.removeItem('persistentSession');
    setToken(null);
    setUser(null);
    setHousehold(null);
    window.location.href = '/login';
  }, []);

  const contentProps = {
    themeId,
    setThemeId,
    user,
    setUser,
    token,
    setToken,
    household,
    setHousehold,
    logout,
    login,
    mfaLogin,
    handleLoginSuccess,
    spec,
    onPreviewTheme: setPreviewThemeId,
    mode: modePref,
    onModeChange: setModePref,
  };

  const inner = (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <CssVarsProvider
          theme={theme}
          defaultMode="system"
          modeStorageKey={`${APP_NAME.toLowerCase()}-mode`}
          disableNestedContext
        >
          <CssBaseline />
          <CommandBar householdId={household?.id}>
            <AppInner {...contentProps} />
          </CommandBar>
        </CssVarsProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );

  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <CssVarsProvider
              theme={theme}
              defaultMode="system"
              modeStorageKey={`${APP_NAME.toLowerCase()}-mode`}
              disableNestedContext
            >
              <CssBaseline />
              <CommandBar householdId={household?.id}>
                <AppInner {...contentProps} />
              </CommandBar>
            </CssVarsProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </ClerkProvider>
    );
  }

  return inner;
}
