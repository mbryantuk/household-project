import { useEffect, useRef, lazy, Suspense, useCallback, useState } from 'react';
import {
  Box,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useColorScheme,
  Typography,
  CircularProgress,
} from '@mui/joy';
import { Routes, Route, Navigate } from 'react-router-dom';

// Contexts
import { useAuth } from './context/AuthContext';
import { useHousehold } from './context/HouseholdContext';
import { useUI } from './context/UIContext';

// Components
import CommandBar from './components/CommandBar';
import RootLayout from './layouts/RootLayout';
import HouseholdLayout from './layouts/HouseholdLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import HouseholdSelector from './pages/HouseholdSelector';
import OfflineOverlay from './components/ui/OfflineOverlay';

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

const IDLE_WARNING_MS = 60 * 60 * 1000;
const IDLE_LOGOUT_MS = 120 * 60 * 1000;

const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      height: '100dvh',
      width: '100vw',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <CircularProgress size="lg" />
  </Box>
);

export default function AppInner({ themeId, setThemeId, onPreviewTheme }) {
  const {
    setToken,
    user,
    setUser,
    api,
    logout,
    login,
    passkeyLogin,
    isAuthenticated,
    isInitializing,
  } = useAuth();
  const { household, setHousehold, members, dates, vehicles, updateSettings, householdId } =
    useHousehold();
  const { showNotification, confirmAction, confirmDialog, closeConfirm } = useUI();

  const { setMode } = useColorScheme();

  // Idle Management
  const lastActivity = useRef(null);
  const [isIdleWarning, setIsIdleWarning] = useState(false);

  useEffect(() => {
    lastActivity.current = Date.now();
    const handler = () => {
      if (!isIdleWarning) lastActivity.current = Date.now();
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, handler));

    const interval = setInterval(() => {
      if (localStorage.getItem('persistentSession') === 'true' || !isAuthenticated) return;
      const diff = Date.now() - lastActivity.current;
      if (diff > IDLE_WARNING_MS && !isIdleWarning) setIsIdleWarning(true);
      if (diff > IDLE_LOGOUT_MS) logout();
    }, 10000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      clearInterval(interval);
    };
  }, [isAuthenticated, isIdleWarning, logout]);

  const handleUpdateProfile = useCallback(
    async (updates) => {
      try {
        const updated = { ...user, ...updates };
        setUser(updated);
        await api.put('/auth/profile', updates);
        if (updates.theme) setThemeId(updates.theme);
        if (updates.mode) setMode(updates.mode);
      } catch {
        showNotification('Update failed.', 'danger');
      }
    },
    [api, user, setUser, setThemeId, setMode, showNotification]
  );

  const handleSelectHousehold = useCallback(
    async (hh) => {
      try {
        await api.post(`/households/${hh.id}/select`);
        const tokenRes = await api.post('/auth/token', { householdId: hh.id });
        setToken(tokenRes.data.token);
        setHousehold(hh);
      } catch {
        showNotification('Failed to switch household.', 'danger');
      }
    },
    [api, setToken, setHousehold, showNotification]
  );

  if (isInitializing) return <PageLoader />;

  return (
    <CommandBar householdId={householdId}>
      <OfflineOverlay />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login onLogin={login} onPasskeyLogin={passkeyLogin} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              isAuthenticated ? (
                <RootLayout context={{ api, user, showNotification, confirmAction }} />
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route
              index
              element={
                household ? (
                  <Navigate to={`/household/${householdId}/dashboard`} />
                ) : (
                  <Navigate to="/select-household" />
                )
              }
            />

            <Route
              path="select-household"
              element={
                <HouseholdSelector
                  api={api}
                  currentUser={user}
                  onLogout={logout}
                  onSelectHousehold={handleSelectHousehold}
                  showNotification={showNotification}
                  confirmAction={confirmAction}
                />
              }
            />

            <Route
              path="household/:id"
              element={
                <HouseholdLayout
                  households={[]}
                  onSelectHousehold={handleSelectHousehold}
                  api={api}
                  onUpdateHousehold={updateSettings}
                  members={members}
                  vehicles={vehicles}
                  user={user}
                  showNotification={showNotification}
                  confirmAction={confirmAction}
                  dates={dates}
                  onUpdateProfile={handleUpdateProfile}
                  onLogout={logout}
                  themeId={themeId}
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
                    members={members}
                    currentUser={user}
                    dates={dates}
                    api={api}
                  />
                }
              />
              <Route path="calendar" element={<CalendarView />} />
              <Route path="people" element={<PeopleView />} />
              <Route path="pets" element={<PetsView />} />
              <Route path="house/assets" element={<AssetsView />} />
              <Route path="house/details" element={<HouseholdDetailsView />} />
              <Route
                path="house/security"
                element={<SecurityAuditView api={api} householdId={householdId} />}
              />
              <Route path="house" element={<HouseView />} />
              <Route path="vehicles" element={<VehiclesView />} />
              <Route path="profile" element={<ProfileView />} />
              <Route path="meals" element={<MealPlannerView />} />
              <Route path="shopping" element={<ShoppingListView />} />
              <Route path="chores" element={<ChoresView />} />
              <Route path="finance" element={<FinanceView />} />
              <Route path="onboarding" element={<OnboardingWizard />} />
              <Route path="settings" element={<SettingsView />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>

      {/* Global Modals */}
      <Modal open={confirmDialog.open} onClose={closeConfirm}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle>{confirmDialog.title}</DialogTitle>
          <DialogContent>{confirmDialog.message}</DialogContent>
          <DialogActions>
            <Button variant="plain" color="neutral" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="danger"
              onClick={() => {
                if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                closeConfirm();
              }}
            >
              Proceed
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      <Modal open={isIdleWarning} onClose={() => {}}>
        <ModalDialog variant="outlined" role="alertdialog" color="warning">
          <DialogTitle>Session Expiring</DialogTitle>
          <DialogContent>
            <Typography>Your session has been idle. Logout soon.</Typography>
          </DialogContent>
          <DialogActions>
            <Button variant="solid" color="primary" onClick={() => setIsIdleWarning(false)}>
              Stay Signed In
            </Button>
            <Button variant="plain" color="neutral" onClick={logout}>
              Log Out
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </CommandBar>
  );
}
