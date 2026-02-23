import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for Real-time Dashboard Updates
 */
export function useRealtime(householdId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!householdId) return;

    const socket = io(window.location.origin, {
      query: { householdId },
    });

    socket.on('DATA_UPDATED', (data) => {
      console.log('⚡ [REALTIME] Data updated:', data);

      // Smart Cache Invalidation
      if (data.entityType) {
        queryClient.invalidateQueries({ queryKey: [data.entityType] });
      }

      // Always refresh global household stats/summary
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['my-households'] });
    });

    return () => socket.disconnect();
  }, [householdId, queryClient]);
}
