/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children, initialUser, handleLoginSuccess, onLogout }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(initialUser);
  const [isInitializing, setIsInitializing] = useState(true);

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: `${window.location.origin}/api`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    });

    instance.interceptors.response.use(
      (response) => {
        if (response.data && response.data.success === true && response.data.data !== undefined) {
          return { ...response, data: response.data.data, _envelope: response.data };
        }
        return response;
      },
      (error) => {
        if (error.response?.status === 401 && !isInitializing) {
          setToken(null);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [token, isInitializing]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${window.location.origin}/api/auth/profile`, {
          withCredentials: true,
        });
        const data = res.data.success ? res.data.data : res.data;
        if (data && data.id) {
          setUser(data);
        }
      } catch {
        // Not authenticated
      } finally {
        setIsInitializing(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(
    async (email, password, rememberMe) => {
      const res = await axios.post(
        `${window.location.origin}/api/auth/login`,
        {
          email,
          password,
          rememberMe,
        },
        { withCredentials: true }
      );

      const data = res.data.success ? res.data.data : res.data;
      if (data.mfa_required) return { mfa_required: true, preAuthToken: data.preAuthToken };

      if (data.token) setToken(data.token);
      handleLoginSuccess(data, rememberMe);
    },
    [handleLoginSuccess]
  );

  const logout = useCallback(async () => {
    try {
      await axios.post(`${window.location.origin}/api/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Ignore cleanup failures
    }
    setToken(null);
    setUser(null);
    onLogout();
  }, [onLogout]);

  const value = {
    token,
    setToken,
    user,
    setUser,
    api,
    login,
    logout,
    isAuthenticated: !!user,
    isInitializing,
  };

  return <AuthContext.Provider value={value}>{!isInitializing && children}</AuthContext.Provider>;
};
