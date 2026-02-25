/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo } from 'react';
import { parseISO, addMinutes } from 'date-fns';
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';

const TimezoneContext = createContext();

/**
 * Item 174: Timezone Nuances
 * Standardizes date handling across the application.
 */
export function TimezoneProvider({ children }) {
  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const value = useMemo(
    () => ({
      timezone: userTimezone,

      /**
       * Format a UTC string into user's local time
       */
      formatLocal: (dateStr, formatStr = 'PPP p') => {
        if (!dateStr) return '';
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
        return formatInTimeZone(date, userTimezone, formatStr);
      },

      /**
       * Convert local input to UTC for server
       */
      toUtc: (date) => {
        const offset = getTimezoneOffset(userTimezone, date);
        return addMinutes(date, -offset / 60000).toISOString();
      },
    }),
    [userTimezone]
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export const useTimezone = () => useContext(TimezoneContext);
