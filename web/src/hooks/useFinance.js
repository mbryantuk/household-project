import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Generic fetcher for finance endpoints.
 */
const fetcher = (api, url) => api.get(url).then(res => res.data);

/**
 * Hook to fetch finance data by category (income, savings, etc.)
 */
export function useFinanceData(api, householdId, category) {
  return useQuery({
    queryKey: ['finance', householdId, category],
    queryFn: () => fetcher(api, `/households/${householdId}/finance/${category}`),
    enabled: !!householdId && !!api,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update finance data with automatic cache invalidation.
 */
export function useUpdateFinance(api, householdId, category) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => api.put(`/households/${householdId}/finance/${category}/${data.id}`, data),
    onSuccess: () => {
      // Automatically refresh the specific category
      queryClient.invalidateQueries(['finance', householdId, category]);
    }
  });
}

/**
 * Hook to fetch recurring costs (bills, subscriptions, etc.)
 */
export function useRecurringCosts(api, householdId) {
  return useQuery({
    queryKey: ['recurring-costs', householdId],
    queryFn: () => fetcher(api, `/households/${householdId}/recurring-costs`),
    enabled: !!householdId && !!api,
    staleTime: 1000 * 60 * 5,
  });
}
