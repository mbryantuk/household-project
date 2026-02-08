const { globalDb, getHouseholdDb, dbAll, dbGet } = require('../db');
const { sendEmail } = require('./EmailService');
const nodeCron = require('node-cron');

/**
 * Helper: Parse budget settings
 */
const getBudgetSettings = (user) => {
    try {
        return user.budget_settings ? JSON.parse(user.budget_settings) : {};
    } catch (e) {
        return {};
    }
};

/**
 * Helper: Check if date is weekend
 */
const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0=Sun, 6=Sat
};

/**
 * Helper: Adjust date to previous Friday if weekend
 */
const adjustToWorkingDay = (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return date; // Invalid date

    const day = date.getDay();
    if (day === 0) { // Sunday -> Friday
        date.setDate(date.getDate() - 2);
    } else if (day === 6) { // Saturday -> Friday
        date.setDate(date.getDate() - 1);
    }
    return date;
};

/**
 * Core Logic: Check and Send Reminders
 */
const checkAndSendReminders = async () => {
    console.log('[BillReminderService] 🕰️ Starting daily bill check...');

    try {
        // 1. Get all users with bill reminders enabled
        // We fetch all users first to check their settings JSON. 
        // Optimized query could use LIKE but JSON parsing in code is safer for now.
        const users = await dbAll(globalDb, "SELECT id, email, first_name, budget_settings FROM users WHERE is_active = 1");
        
        const subscribedUsers = users.filter(u => {
            const settings = getBudgetSettings(u);
            return settings.bill_reminders === true;
        });

        console.log(`[BillReminderService] Found ${subscribedUsers.length} users with reminders enabled.`);

        for (const user of subscribedUsers) {
            await processUserReminders(user);
        }

    } catch (err) {
        console.error('[BillReminderService] ❌ Error in daily check:', err);
    }
};

/**
 * Process a single user
 */
const processUserReminders = async (user) => {
    // Get user's households
    const households = await dbAll(globalDb, 
        `SELECT h.id, h.name, h.currency 
         FROM households h
         JOIN user_households uh ON h.id = uh.household_id
         WHERE uh.user_id = ? AND uh.is_active = 1`, 
        [user.id]
    );

    const upcomingBills = [];

    // Target Date: 3 Days from now
    // We want to notify if the bill is due EXACTLY 3 days from now, 
    // OR if it's due sooner and we missed it? 
    // Spec says "Upcoming bills", let's assume a 3-day warning window.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const warningWindowDays = 3;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + warningWindowDays);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    for (const household of households) {
        try {
            const db = getHouseholdDb(household.id);
            // Fetch recurring costs
            const costs = await dbAll(db, "SELECT * FROM recurring_costs WHERE is_active = 1");
            
            for (const cost of costs) {
                if (!cost.start_date) continue;

                // Determine next due date
                // Simplified logic: We assume monthly frequency for prototype anchor
                // TODO: Robust recurrence expansion (using rrule or similar if available, else basic custom logic)
                
                let nextDue = getNextDueDate(cost, today);
                
                // Adjust for working day if enabled
                if (cost.adjust_for_working_day) {
                    nextDue = adjustToWorkingDay(nextDue.toISOString().split('T')[0]);
                }

                const nextDueStr = nextDue.toISOString().split('T')[0];

                // Check if it matches our target date (3 days out)
                // We use string comparison for YYYY-MM-DD
                if (nextDueStr === targetDateStr) {
                    upcomingBills.push({
                        ...cost,
                        household_name: household.name,
                        currency: household.currency || 'GBP',
                        due_date: nextDueStr
                    });
                }
            }
        } catch (err) {
            console.error(`[BillReminderService] Error checking household ${household.id}:`, err.message);
        }
    }

    if (upcomingBills.length > 0) {
        await sendReminderEmail(user, upcomingBills);
    }
};

/**
 * Calculate next due date from start_date
 * NOTE: This is a simplified version. A robust production system needs a full recurrence engine.
 */
const getNextDueDate = (cost, referenceDate) => {
    const start = new Date(cost.start_date);
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();
    
    let due = new Date(start);
    
    if (cost.frequency === 'monthly') {
        // Set to current month, keeping the day
        due.setFullYear(currentYear);
        due.setMonth(currentMonth);
        
        // If the day has passed, move to next month
        // But wait, we are looking for FUTURE dates.
        // If today is Feb 8, and bill is 5th, next is March 5.
        // If bill is 10th, next is Feb 10.
        
        if (due < referenceDate) {
            due.setMonth(due.getMonth() + 1);
        }
    } else if (cost.frequency === 'yearly') {
        due.setFullYear(currentYear);
        if (due < referenceDate) {
            due.setFullYear(currentYear + 1);
        }
    } else if (cost.frequency === 'weekly') {
        // Fast forward week by week
        while (due < referenceDate) {
            due.setDate(due.getDate() + 7);
        }
    }

    return due;
};

const sendReminderEmail = async (user, bills) => {
    const billListHtml = bills.map(b => 
        `<li><strong>${b.name}</strong>: ${b.currency} ${b.amount} (Due: ${b.due_date}) in ${b.household_name}</li>`
    ).join('');

    const html = `
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>📅 Upcoming Bill Reminders</h2>
            <p>Hi ${user.first_name},</p>
            <p>You have the following bills coming up in 3 days:</p>
            <ul>
                ${billListHtml}
            </ul>
            <p>Check your dashboard for more details.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">
                You are receiving this because you enabled 'Bill Reminders' in your Budget Settings.
            </p>
        </div>
    `;

    await sendEmail(user.email, `Upcoming Bills Reminder (${bills.length})`, html);
};

const initCron = () => {
    // Run at 09:00 AM every day
    nodeCron.schedule('0 9 * * *', () => {
        checkAndSendReminders();
    });
    console.log('[BillReminderService] 🕒 Cron job scheduled: Daily at 09:00 AM');
};

module.exports = { initCron, checkAndSendReminders };
