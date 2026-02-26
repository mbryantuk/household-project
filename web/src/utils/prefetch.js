/**
 * Utility to prefetch lazy-loaded components.
 *
 * @param {Function} factory - The lazy factory function (e.g., () => import('./View'))
 */
export const prefetchComponent = (factory) => {
  if (typeof factory === 'function') {
    factory().catch(() => {
      /* ignore prefetch errors */
    });
  }
};

/**
 * Pre-load common feature chunks
 */
export const preloadFeatures = {
  finance: () => import('../features/FinanceView'),
  shopping: () => import('../features/ShoppingListView'),
  meals: () => import('../features/MealPlannerView'),
  chores: () => import('../features/ChoresView'),
  house: () => import('../features/HouseView'),
};
