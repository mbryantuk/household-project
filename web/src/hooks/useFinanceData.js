import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch all financial profiles of a household
 */
export function useFinanceProfiles(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-profiles'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/profiles`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all current accounts of a household
 */
export function useCurrentAccounts(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-current-accounts'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/current-accounts`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all income sources of a household
 */
export function useIncome(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-income'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/income`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch and calculate finance summary for dashboard
 */
export function useFinanceSummary(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-summary'],
    queryFn: async () => {
      if (!householdId || !api) return null;

      try {
        const [profilesRes, cyclesRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/profiles`),
          api.get(`/households/${householdId}/finance/budget-cycles`),
        ]);

        const profiles = Array.isArray(profilesRes.data) ? profilesRes.data : [];
        const cycles = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];

        // Calculate Total Balance (Net Worth Proxy)
        const totalBalance = cycles.reduce((sum, c) => sum + (parseFloat(c.current_balance) || 0), 0);

        // Calculate Budget Health (Income vs Spend Proxy)
        const totalIncome = cycles.reduce((sum, c) => sum + (parseFloat(c.actual_pay) || 0), 0);
        const spending = totalIncome - totalBalance;

        return {
          netWorth: totalBalance,
          monthlyIncome: totalIncome,
          spending,
          profiles: profiles.slice(0, 3),
        };
      } catch (err) {
        console.error('Finance Summary Calculation Error:', err);
        return { netWorth: 0, monthlyIncome: 0, spending: 0, profiles: [] };
      }
    },
    enabled: !!api && !!householdId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch all mortgages of a household
 */
export function useMortgages(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-mortgages'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/mortgages`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all loans of a household
 */
export function useLoans(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-loans'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/loans`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all credit cards of a household
 */
export function useCreditCards(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-credit-cards'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/credit-cards`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all vehicle finance of a household
 */
export function useVehicleFinance(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-vehicle-finance'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/vehicle-finance`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all recurring charges of a household
 */
export function useRecurringCharges(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-charges'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/charges`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch household details
 */
export function useHouseholdDetails(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'details'],
    queryFn: async () => {
      if (!householdId || !api) return null;
      const res = await api.get(`/households/${householdId}/details`);
      return res.data;
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all savings accounts of a household
 */
export function useSavings(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-savings'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/savings`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all investments of a household
 */
export function useInvestments(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-investments'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/investments`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all pensions of a household
 */
export function usePensions(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-pensions'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/pensions`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch budget progress
 */
export function useBudgetProgress(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-budget-progress'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/budget-progress`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch budget cycles
 */
export function useBudgetCycles(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-budget-cycles'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/budget-cycles`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch all recurring costs (polymorphic)
 */
export function useRecurringCosts(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'finance-recurring-costs'],
    queryFn: async () => {
      if (!householdId || !api) return [];
      const res = await api.get(`/households/${householdId}/finance/recurring-costs`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api && !!householdId,
  });
}

/**
 * Hook to fetch bank holidays
 */
export function useBankHolidays(api) {
  return useQuery({
    queryKey: ['system', 'holidays'],
    queryFn: async () => {
      if (!api) return [];
      const res = await api.get('/system/holidays');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!api,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Aggregated hook for wealth tracking data
 */
export function useWealthData(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'wealth-data'],
    queryFn: async () => {
      if (!householdId || !api) return null;
      try {
        const [
          pensionRes,
          saveRes,
          invRes,
          mortRes,
          vehRes,
          vFinRes,
          detailRes,
          potRes,
          loanRes,
          ccRes,
          accRes,
        ] = await Promise.all([
          api.get(`/households/${householdId}/finance/pensions`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/savings`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/investments`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/mortgages`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/vehicles`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/vehicle-finance`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/details`).catch(() => ({ data: {} })),
          api.get(`/households/${householdId}/finance/savings/pots`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/loans`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/credit-cards`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/current-accounts`).catch(() => ({ data: [] })),
        ]);

        return {
          pensions: pensionRes.data || [],
          savings: saveRes.data || [],
          investments: invRes.data || [],
          mortgages: mortRes.data || [],
          vehicles: vehRes.data || [],
          vehicle_finance: vFinRes.data || [],
          house_details: detailRes.data || {},
          savings_pots: potRes.data || [],
          loans: loanRes.data || [],
          credit_cards: ccRes.data || [],
          current_accounts: accRes.data || [],
        };
      } catch (err) {
        console.error('Wealth Data Fetch Error:', err);
        return null;
      }
    },
    enabled: !!api && !!householdId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Aggregated hook for budget status widget
 */
export function useBudgetStatusData(api, householdId) {
  return useQuery({
    queryKey: ['households', householdId, 'budget-status-data'],
    queryFn: async () => {
      if (!householdId || !api) return null;
      const [incRes, progRes, cycleRes, recurringRes, ccRes, accountRes, holidayRes] =
        await Promise.all([
          api.get(`/households/${householdId}/finance/income`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/budget-progress`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/budget-cycles`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/recurring-costs`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/credit-cards`).catch(() => ({ data: [] })),
          api.get(`/households/${householdId}/finance/current-accounts`).catch(() => ({ data: [] })),
          api.get(`/system/holidays`).catch(() => ({ data: [] })),
        ]);

      return {
        incomes: incRes?.data || [],
        progress: progRes?.data || [],
        cycles: cycleRes?.data || [],
        recurring_costs: recurringRes?.data || [],
        credit_cards: ccRes?.data || [],
        current_accounts: accountRes?.data || [],
        bank_holidays: holidayRes?.data || [],
      };
    },
    enabled: !!api && !!householdId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
