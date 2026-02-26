import { useEffect } from 'react';

/**
 * Hook for handling global keyboard shortcuts
 */
export function useKeyboardShortcut(key, callback, options = {}) {
  const { ctrl = false, shift = false, alt = false, disableInput = true } = options;

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore if typing in an input and disableInput is true
      if (disableInput) {
        const active = document.activeElement;
        const isInput =
          active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable;
        if (isInput) return;
      }

      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = ctrl ? event.ctrlKey || event.metaKey : true;
      const shiftMatch = shift ? event.shiftKey : true;
      const altMatch = alt ? event.altKey : true;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ctrl, shift, alt, disableInput]);
}
