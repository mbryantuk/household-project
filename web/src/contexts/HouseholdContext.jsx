import React, { createContext, useContext } from 'react';

const HouseholdContext = createContext(null);

/**
 * Provider for shared household state to eliminate prop-drilling.
 */
export function HouseholdProvider({ children, value }) {
  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

/**
 * Hook to access the current household context.
 */
export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
