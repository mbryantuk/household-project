import React, { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useHouseholdMembers,
  useHouseholdUsers,
  useHouseholdDates,
  useHouseholdVehicles,
} from '../hooks/useHouseholdData';

const HouseholdContext = createContext(null);

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) throw new Error('useHousehold must be used within a HouseholdProvider');
  return context;
};

export const HouseholdProvider = ({ children, initialHousehold, api, showNotification }) => {
  const [household, setHousehold] = useState(initialHousehold);
  const queryClient = useQueryClient();

  const householdId = household?.id;

  // Real-time data sync via TanStack Query
  const { data: members = [] } = useHouseholdMembers(api, householdId);
  const { data: users = [] } = useHouseholdUsers(api, householdId);
  const { data: dates = [] } = useHouseholdDates(api, householdId);
  const { data: vehicles = [] } = useHouseholdVehicles(api, householdId);

  const updateSettings = useCallback(
    async (updates) => {
      if (!householdId) return;
      try {
        await api.put(`/households/${householdId}/house-details`, updates);
        const updated = { ...household, ...updates };
        setHousehold(updated);
        localStorage.setItem('household', JSON.stringify(updated));
        queryClient.invalidateQueries({ queryKey: ['my-households'] });
        showNotification('Household updated.', 'success');
      } catch {
        showNotification('Failed to update.', 'danger');
      }
    },
    [api, household, householdId, queryClient, showNotification]
  );

  const value = {
    household,
    setHousehold,
    members,
    users,
    dates,
    vehicles,
    updateSettings,
    householdId,
  };

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};
