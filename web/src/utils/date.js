import { formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Standard relative time formatter
 */
export const getRelativeTime = (dateInput) => {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (!isValid(date)) return '';
  return formatDistanceToNow(date, { addSuffix: true });
};
