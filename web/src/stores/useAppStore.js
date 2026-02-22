import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * HEARTHSTONE GLOBAL STATE (Item 13)
 * Replaces heavy Context Providers for UI-only state.
 */
export const useAppStore = create(
  persist(
    (set) => ({
      sidebarPinned: localStorage.getItem('nav_pinned') === 'true',
      setSidebarPinned: (pinned) => {
        localStorage.setItem('nav_pinned', String(pinned));
        set({ sidebarPinned: pinned });
      },

      notificationCount: 0,
      setNotificationCount: (count) => set({ notificationCount: count }),

      // Dashboard Customization (Item 13 - Greenfield)
      dashboardLayout: [],
      setDashboardLayout: (layout) => set({ dashboardLayout: layout }),
    }),
    {
      name: 'hearthstone-app-storage',
    }
  )
);
