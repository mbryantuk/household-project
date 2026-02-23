import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Generic hook for fetching a single entity
 */
export function useEntity(api, householdId, type, id, endpoint) {
  return useQuery({
    queryKey: ['households', householdId, type, id],
    queryFn: async () => {
      if (!id || id === 'new' || !endpoint) return null;
      const res = await api.get(`${endpoint}/${id}`);
      return res.data;
    },
    enabled: !!api && !!householdId && !!id && id !== 'new' && !!endpoint,
  });
}

/**
 * Generic hook for entity mutations (Create, Update, Delete)
 */
export function useEntityMutation(api, householdId, type, endpoint) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, method = 'PUT' }) => {
      const url = id && id !== 'new' ? `${endpoint}/${id}` : endpoint;
      const res = await api({
        method,
        url,
        data,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific entity
      if (variables.id && variables.id !== 'new') {
        queryClient.invalidateQueries({
          queryKey: ['households', householdId, type, variables.id],
        });
      }
      // Invalidate the list of these entities
      queryClient.invalidateQueries({ queryKey: ['households', householdId, `${type}s`] });

      // Special case: if it's a member, also invalidate users and finance summary
      if (type === 'member') {
        queryClient.invalidateQueries({ queryKey: ['households', householdId, 'users'] });
        queryClient.invalidateQueries({ queryKey: ['households', householdId, 'finance-summary'] });
      }
    },
  });
}
