import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch and calculate finance summary for dashboard
 */
export function useFinanceSummary(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-summary'],
    queryFn: async () => {
      if (!householdId) return null;

      const [profilesRes, cyclesRes] = await Promise.all([
        api.get(`/households/${householdId}/finance/profiles`),
        api.get(`/households/${householdId}/finance/budget-cycles`),
      ]);

      const profiles = profilesRes.data || [];
      const cycles = cyclesRes.data || [];

      // Calculate Total Balance (Net Worth Proxy)
      const totalBalance = cycles.reduce((sum, c) => sum + (c.current_balance || 0), 0);

      // Calculate Budget Health (Income vs Spend Proxy)
      const totalIncome = cycles.reduce((sum, c) => sum + (c.actual_pay || 0), 0);
      const spending = totalIncome - totalBalance; // Rough proxy

      return {
        netWorth: totalBalance,
        monthlyIncome: totalIncome,
        spending,
        profiles: profiles.slice(0, 3),
      };
    },
    enabled: !!api && !!householdId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
