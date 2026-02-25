/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useHouseholdMembers,
  useHouseholdUsers,
  useHouseholdDates,
  useHouseholdVehicles,
} from '../hooks/useHouseholdData';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const HouseholdContext = createContext(null);

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) throw new Error('useHousehold must be used within a HouseholdProvider');
  return context;
};

export const HouseholdProvider = ({ children, initialHousehold }) => {
  const [household, setHouseholdState] = useState(initialHousehold);
  const { api, user, logout } = useAuth();
  const { showNotification, confirmAction } = useUI();
  const queryClient = useQueryClient();

  const [statusBarData, setStatusBarData] = useState(null);

  const setHousehold = useCallback((hh) => {
    setHouseholdState(hh);
    if (hh) {
      localStorage.setItem('household', JSON.stringify(hh));
    } else {
      localStorage.removeItem('household');
    }
  }, []);

  const householdId = household?.id;

  // Real-time data sync via TanStack Query
  const { data: members = [] } = useHouseholdMembers(api, householdId);
  const { data: users = [] } = useHouseholdUsers(api, householdId);
  const { data: dates = [] } = useHouseholdDates(api, householdId);
  const { data: vehicles = [] } = useHouseholdVehicles(api, householdId);

  const updateSettings = useCallback(
    async (updates) => {
      if (!householdId || !api) return;
      try {
        await api.put(`/households/${householdId}/details`, updates);
        const updated = { ...household, ...updates };
        setHousehold(updated);
        queryClient.invalidateQueries({ queryKey: ['my-households'] });
        showNotification('Household updated.', 'success');
      } catch {
        showNotification('Failed to update.', 'danger');
      }
    },
    [api, household, householdId, queryClient, showNotification, setHousehold]
  );

  const value = useMemo(
    () => ({
      household,
      setHousehold,
      members,
      users,
      dates,
      vehicles,
      updateSettings,
      householdId,
      api,
      user,
      onLogout: logout,
      showNotification,
      confirmAction,
      statusBarData,
      setStatusBarData,
    }),
    [
      household,
      members,
      users,
      dates,
      vehicles,
      updateSettings,
      householdId,
      api,
      user,
      logout,
      showNotification,
      confirmAction,
      statusBarData,
      setHousehold,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};
