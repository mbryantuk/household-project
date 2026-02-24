/**
 * Centralized Routing Configuration (Item 120)
 * Prevents broken links by using strongly-typed path generators.
 */
export const ROUTES = {
  // Public
  LOGIN: '/login',
  REGISTER: '/register',

  // Global
  ONBOARDING: '/onboarding',
  SETTINGS: '/settings',

  // Household Context
  HOUSEHOLD: {
    DASHBOARD: (hhId) => `/household/${hhId}/dashboard`,
    FINANCE: (hhId) => `/household/${hhId}/finance`,
    CALENDAR: (hhId) => `/household/${hhId}/calendar`,
    PEOPLE: (hhId) => `/household/${hhId}/people`,
    PETS: (hhId) => `/household/${hhId}/pets`,
    VEHICLES: (hhId) => `/household/${hhId}/vehicles`,
    ASSETS: (hhId) => `/household/${hhId}/assets`,
    MEALS: (hhId) => `/household/${hhId}/meals`,
    GROCERIES: (hhId) => `/household/${hhId}/groceries`,
    CHORES: (hhId) => `/household/${hhId}/chores`,
    HOUSE: (hhId) => `/household/${hhId}/house`,
  },
};
