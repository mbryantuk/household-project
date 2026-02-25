import { useState, useMemo, useCallback, Suspense } from 'react';
import { Toaster } from 'sonner';
import { CssVarsProvider, GlobalStyles, CssBaseline } from '@mui/joy';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';

// Theme and Local Components
import { getAppTheme } from './theme';
import { APP_NAME } from './constants';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { HouseholdProvider } from './context/HouseholdContext';
import { UIProvider } from './context/UIContext';

// Components
import AppInner from './AppInner';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

export default function App() {
  const [initialToken] = useState(localStorage.getItem('token'));
  const [initialUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [initialHousehold] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('household')) || null;
    } catch {
      return null;
    }
  });

  const [themeId, setThemeId] = useState(initialUser?.theme || 'hearth');
  const [previewThemeId, setPreviewThemeId] = useState(null);

  const customConfig = useMemo(() => {
    if (!initialUser?.customTheme) return null;
    try {
      return typeof initialUser.customTheme === 'string'
        ? JSON.parse(initialUser.customTheme)
        : initialUser.customTheme;
    } catch {
      return null;
    }
  }, [initialUser?.customTheme]);

  const theme = useMemo(
    () => getAppTheme(previewThemeId || themeId, customConfig),
    [previewThemeId, themeId, customConfig]
  );

  const handleLoginSuccess = useCallback((data, rememberMe) => {
    const { token, role, context, household: hhData, user: userData, system_role } = data;
    const fullUser = { ...userData, role, system_role };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(fullUser));
    if (rememberMe) localStorage.setItem('persistentSession', 'true');
    else localStorage.removeItem('persistentSession');

    if (context === 'household') {
      localStorage.setItem('household', JSON.stringify(hhData));
      window.location.href = `/household/${hhData.id}/dashboard`;
    } else {
      localStorage.removeItem('household');
      window.location.href = '/select-household';
    }
  }, []);

  const onLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('household');
    localStorage.removeItem('persistentSession');
    window.location.href = '/login';
  }, []);

  const appContent = (
    <AuthProvider
      initialToken={initialToken}
      initialUser={initialUser}
      handleLoginSuccess={handleLoginSuccess}
      onLogout={onLogout}
    >
      <UIProvider>
        <HouseholdProvider initialHousehold={initialHousehold}>
          <CssVarsProvider
            theme={theme}
            defaultMode="system"
            modeStorageKey={`${APP_NAME.toLowerCase()}-mode`}
            disableNestedContext
          >
            <CssBaseline />
            <BrowserRouter>
              <Suspense fallback={null}>
                <AppInner
                  themeId={themeId}
                  setThemeId={setThemeId}
                  onPreviewTheme={setPreviewThemeId}
                />
              </Suspense>
            </BrowserRouter>
            <Toaster position="bottom-center" />
          </CssVarsProvider>
        </HouseholdProvider>
      </UIProvider>
    </AuthProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
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
      {CLERK_PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>{appContent}</ClerkProvider>
      ) : (
        appContent
      )}
    </QueryClientProvider>
  );
}
