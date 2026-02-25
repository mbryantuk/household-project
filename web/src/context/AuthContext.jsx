import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({
  children,
  initialToken,
  initialUser,
  handleLoginSuccess,
  onLogout,
}) => {
  const [token, setToken] = useState(initialToken);
  const [user, setUser] = useState(initialUser);

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: `${window.location.origin}/api`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return instance;
  }, [token]);

  const login = useCallback(
    async (email, password, rememberMe) => {
      const res = await axios.post(`${window.location.origin}/api/auth/login`, {
        email,
        password,
        rememberMe,
      });
      if (res.data.mfa_required) return { mfa_required: true, preAuthToken: res.data.preAuthToken };
      handleLoginSuccess(res.data, rememberMe);
    },
    [handleLoginSuccess]
  );

  const logout = useCallback(() => {
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
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
