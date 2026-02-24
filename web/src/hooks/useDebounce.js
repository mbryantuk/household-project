import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing fast-changing values (Item 175).
 * Useful for search inputs or window resize event values.
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
