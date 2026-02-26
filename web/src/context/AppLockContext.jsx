/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const AppLockContext = createContext();

export function AppLockProvider({ children }) {
  const { api, user, isAuthenticated } = useAuth();
  const { showNotification } = useUI();

  const [isLocked, setIsLocked] = useState(false);
  const [isLockEnabled, setIsLockEnabled] = useState(
    localStorage.getItem('app_lock_enabled') === 'true'
  );

  const lockApp = useCallback(() => {
    if (isLockEnabled && isAuthenticated) {
      setIsLocked(true);
    }
  }, [isLockEnabled, isAuthenticated]);

  const unlockApp = useCallback(async () => {
    try {
      // 1. Get login options
      const optionsRes = await api.get(`/passkeys/login/options?email=${user.email}`);
      const options = optionsRes.data;

      // 2. Trigger Biometric/Passkey Auth
      const assertion = await startAuthentication({
        ...options,
        // Item 229: Force user verification for biometric lock
        userVerification: 'required',
      });

      // 3. Verify on server
      await api.post('/passkeys/login/verify', assertion);

      setIsLocked(false);
      showNotification('App Unlocked', 'success');
    } catch (err) {
      console.error('Unlock failed', err);
      showNotification('Biometric verification failed.', 'danger');
    }
  }, [api, user, showNotification]);

  /**
   * VERIFY IDENTITY
   * Item 234: Used for revealing sensitive fields
   */
  const verifyIdentity = useCallback(async () => {
    try {
      const optionsRes = await api.get(`/passkeys/login/options?email=${user.email}`);
      const assertion = await startAuthentication({
        ...optionsRes.data,
        userVerification: 'required',
      });
      await api.post('/passkeys/login/verify', assertion);
      return true;
    } catch (err) {
      console.error('Verification failed', err);
      return false;
    }
  }, [api, user]);

  // Handle auto-lock on visibility change (PWA backgrounding)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lockApp();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lockApp]);

  return (
    <AppLockContext.Provider
      value={{ isLocked, isLockEnabled, setIsLockEnabled, lockApp, unlockApp, verifyIdentity }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export const useAppLock = () => useContext(AppLockContext);
