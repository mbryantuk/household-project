import { useState, useMemo, useCallback, Suspense } from 'react';
import { Toaster } from 'sonner';
import { CssVarsProvider, GlobalStyles, CssBaseline } from '@mui/joy';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import posthog from 'posthog-js';

// Theme and Local Components
import { getAppTheme } from './theme';
import { APP_NAME } from './constants';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { HouseholdProvider } from './context/HouseholdContext';
import { UIProvider } from './context/UIContext';
import { TimezoneProvider } from './context/TimezoneContext';
import { AppLockProvider } from './context/AppLockContext';

// Components
import AppInner from './AppInner';
import ErrorBoundary from './components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

if (typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // Handled manually
  });
}

export default function App() {
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
    const { role, context, household: hhData, user: userData, system_role } = data;
    const fullUser = { ...userData, role, system_role };
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
    localStorage.removeItem('user');
    localStorage.removeItem('household');
    localStorage.removeItem('persistentSession');
    window.location.href = '/login';
  }, []);

  const appContent = (
    <ErrorBoundary>
      <AuthProvider
        initialUser={initialUser}
        handleLoginSuccess={handleLoginSuccess}
        onLogout={onLogout}
      >
        <UIProvider>
          <TimezoneProvider>
            <HouseholdProvider initialHousehold={initialHousehold}>
              <AppLockProvider>
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
              </AppLockProvider>
            </HouseholdProvider>
          </TimezoneProvider>
        </UIProvider>
      </AuthProvider>
    </ErrorBoundary>
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
          '@media (prefers-reduced-motion: reduce)': {
            '*, ::before, ::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        }}
      />
      {appContent}
    </QueryClientProvider>
  );
}
