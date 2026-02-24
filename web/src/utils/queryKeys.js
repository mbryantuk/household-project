/**
 * React Query Key Factory (Item 116)
 * Centralizes all query keys to prevent typos and cache collisions.
 */
export const queryKeys = {
  // Global
  user: ['user'],
  households: ['households'],
  bankHolidays: ['bankHolidays'],

  // Per-Household Domains
  household: {
    details: (hhId) => ['household', hhId, 'details'],
    members: (hhId) => ['household', hhId, 'members'],
    assets: (hhId) => ['household', hhId, 'assets'],
    vehicles: (hhId) => ['household', hhId, 'vehicles'],
    pets: (hhId) => ['household', hhId, 'pets'],
    chores: (hhId) => ['household', hhId, 'chores'],
    meals: (hhId) => ['household', hhId, 'meals'],
    finance: {
      all: (hhId) => ['household', hhId, 'finance'],
      accounts: (hhId) => ['household', hhId, 'finance', 'accounts'],
      recurring: (hhId) => ['household', hhId, 'finance', 'recurring'],
      budgets: (hhId) => ['household', hhId, 'finance', 'budgets'],
    },
    shopping: {
      lists: (hhId) => ['household', hhId, 'shopping', 'lists'],
      schedules: (hhId) => ['household', hhId, 'shopping', 'schedules'],
    },
  },
};
