import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateUuidV7 } from '@hearth/shared';

/**
 * Hook for Optimistic Shopping List Mutations (Item 118)
 */
export function useShoppingMutations(api, householdId, weekStr) {
  const queryClient = useQueryClient();
  const queryKey = ['households', householdId, 'shopping-list', weekStr];

  // Helper to handle optimistic updates
  // Named starting with 'use' to satisfy ESLint hook rules
  const useOptimisticMutation = (mutationFn, updateFn) => {
    return useMutation({
      mutationFn,
      onMutate: async (variables) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value
        const previousItems = queryClient.getQueryData(queryKey);

        // Optimistically update to the new value
        queryClient.setQueryData(queryKey, (old = []) => updateFn(old, variables));

        // Return a context object with the snapshotted value
        return { previousItems };
      },
      onError: (err, variables, context) => {
        // Rollback to the previous value
        queryClient.setQueryData(queryKey, context.previousItems);
      },
      onSettled: () => {
        // Always refetch after error or success to throw away the optimistic update
        // and ensure the server state is synchronized
        queryClient.invalidateQueries({ queryKey });
      },
    });
  };

  // 1. ADD ITEM
  const addItem = useOptimisticMutation(
    (newItem) =>
      api.post(`/households/${householdId}/shopping-list`, { ...newItem, week_start: weekStr }),
    (old, newItem) => [
      ...old,
      {
        id: `temp-${generateUuidV7()}`,
        ...newItem,
        is_checked: 0,
        created_at: new Date().toISOString(),
      },
    ]
  );

  // 2. TOGGLE ITEM
  const toggleItem = useOptimisticMutation(
    (item) =>
      api.put(`/households/${householdId}/shopping-list/${item.id}`, {
        is_checked: !item.is_checked,
      }),
    (old, item) =>
      old.map((i) => (i.id === item.id ? { ...i, is_checked: !i.is_checked ? 1 : 0 } : i))
  );

  // 3. DELETE ITEM
  const deleteItem = useOptimisticMutation(
    (id) => api.delete(`/households/${householdId}/shopping-list/${id}`),
    (old, id) => old.filter((i) => i.id !== id)
  );

  // 4. CLEAR COMPLETED
  const clearCompleted = useOptimisticMutation(
    () => api.delete(`/households/${householdId}/shopping-list/clear?week_start=${weekStr}`),
    (old) => old.filter((i) => !i.is_checked)
  );

  return {
    addItem,
    toggleItem,
    deleteItem,
    clearCompleted,
  };
}
