import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook to prevent accidental navigation when a form is dirty.
 * Handles both browser-level (refresh/close) and React Router navigation.
 *
 * @param {boolean} isDirty - Whether the form has unsaved changes.
 * @param {string} message - Optional message for the browser's native dialog.
 */
export default function useUnsavedChanges(
  isDirty,
  message = 'You have unsaved changes. Are you sure you want to leave?'
) {
  // 1. Browser-level warning (Refresh, Close tab, Back button outside React Router)
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // 2. React Router internal navigation warning
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        return isDirty && currentLocation.pathname !== nextLocation.pathname;
      },
      [isDirty]
    )
  );

  return blocker;
}
