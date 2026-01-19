import { addMonths, setDate, isWeekend, subDays, isBefore, startOfDay, isSameDay, differenceInDays } from 'date-fns';

/**
 * Calculates the next payday based on a specific day of the month.
 * If the payment day falls on a weekend, it shifts to the nearest previous working day.
 * If the calculated date for the current month is in the past OR is today, it moves to the next month.
 * 
 * @param {number} paymentDay - The day of the month (1-31).
 * @returns {Date} The next payday date.
 */
export const getNextPayday = (paymentDay) => {
    if (!paymentDay) return null;

    const today = startOfDay(new Date());
    let candidateDate = setDate(today, paymentDay);

    // Initial Adjustment: If candidate falls on weekend, move back to Friday
    if (isWeekend(candidateDate)) {
        while (isWeekend(candidateDate)) {
            candidateDate = subDays(candidateDate, 1);
        }
    }

    // If the adjusted date is in the past or TODAY, try next month
    if (isBefore(candidateDate, today) || isSameDay(candidateDate, today)) {
        candidateDate = setDate(addMonths(today, 1), paymentDay);
        // Re-adjust for weekend for next month
        if (isWeekend(candidateDate)) {
            while (isWeekend(candidateDate)) {
                candidateDate = subDays(candidateDate, 1);
            }
        }
    }

    return candidateDate;
};

/**
 * Calculates days remaining until the given date.
 * @param {Date} targetDate 
 * @returns {number} Days remaining (0 if today, but logic above prevents today)
 */
export const getDaysUntil = (targetDate) => {
    if (!targetDate) return null;
    const today = startOfDay(new Date());
    return differenceInDays(targetDate, today);
};
