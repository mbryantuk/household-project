import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch all members of a household
 */
export function useHouseholdMembers(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'members'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/members`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all users/links of a household
 */
export function useHouseholdUsers(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'users'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/users`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all important dates of a household
 */
export function useHouseholdDates(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'dates'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/dates`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all vehicles of a household
 */
export function useHouseholdVehicles(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'vehicles'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/vehicles`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all households for the current user
 */
export function useMyHouseholds(api) {
  return useQuery({
    queryKey: ['my-households'],
    queryFn: async () => {
      if (!api) return [];
      const res = await api.get('/auth/my-households');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api,
  });
}

/**
 * Hook to fetch the shopping list for a specific week
 */
export function useShoppingList(api, householdId, weekStart) {
  return useQuery({
    queryKey: ['households', householdId, 'shopping-list', weekStart],
    queryFn: async () => {
      if (!householdId || !weekStart || !api) return [];
      const res = await api.get(`/households/${householdId}/shopping-list?week_start=${weekStart}`);
      return Array.isArray(res.data.items) ? res.data.items : [];
    },
    enabled: !!api && !!householdId && !!weekStart,
  });
}

/**
 * Hook to fetch the meal library
 */
export function useMeals(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'meals'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/meals`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch meal plans for a date range
 */
export function useMealPlans(api, householdId, start, end) {
  return useQuery({
    queryKey: ['households', householdId, 'meal-plans', start, end],
    queryFn: async () => {
      if (!householdId || !start || !end || !api) return [];
      const res = await api.get(`/households/${householdId}/meal-plans?start=${start}&end=${end}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId && !!start && !!end,
  });
}

/**
 * Hook to fetch all assets of a household
 */
export function useAssets(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'assets'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/assets`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all chores of a household
 */
export function useChores(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'chores'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/chores`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch chore stats
 */
export function useChoreStats(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'chores', 'stats'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/chores/stats`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}
