const { checkAndSendReminders } = require('../services/BillReminderService');
const { globalDb, getHouseholdDb, dbRun, dbGet } = require('../db');
const EmailService = require('../services/EmailService');

// Mock EmailService
jest.mock('../services/EmailService', () => ({
    sendEmail: jest.fn().mockResolvedValue(true)
}));

describe('Bill Reminder Service', () => {
    let userId;
    let householdId;

    beforeAll(async () => {
        // 1. Create User with Reminders Enabled
        const userRes = await dbRun(globalDb, 
            `INSERT INTO users (email, first_name, is_active, budget_settings) 
             VALUES (?, ?, 1, ?)`,
            ['remind_test@example.com', 'RemindMe', JSON.stringify({ bill_reminders: true })]
        );
        userId = userRes.id;

        // 2. Create Household
        const hhRes = await dbRun(globalDb, 
            `INSERT INTO households (name, is_test) VALUES (?, 1)`,
            ['Reminder HH']
        );
        householdId = hhRes.id;

        // 3. Link
        await dbRun(globalDb,
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')`,
            [userId, householdId]
        );
    });

    afterAll(async () => {
        // Cleanup
        await dbRun(globalDb, "DELETE FROM users WHERE id = ?", [userId]);
        await dbRun(globalDb, "DELETE FROM households WHERE id = ?", [householdId]);
        // Also need to clean household DB file strictly speaking, but standard cleanup script handles it usually.
    });

    test('should send email for bill due in 3 days', async () => {
        const db = getHouseholdDb(householdId);
        
        // Setup Date: 3 Days from now
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 3);
        
        const startStr = targetDate.toISOString().split('T')[0];

        // Insert Recurring Cost
        await dbRun(db, `
            CREATE TABLE IF NOT EXISTS recurring_costs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                amount REAL,
                frequency TEXT,
                start_date DATE,
                adjust_for_working_day INTEGER DEFAULT 1,
                currency TEXT DEFAULT 'GBP',
                is_active INTEGER DEFAULT 1
            )
        `);

        await dbRun(db, 
            `INSERT INTO recurring_costs (name, amount, frequency, start_date, adjust_for_working_day) 
             VALUES (?, ?, ?, ?, ?)`,
            ['Test Bill', 50.00, 'monthly', startStr, 0] // No adjustment to keep test simple
        );

        // Run Service
        await checkAndSendReminders();

        // Assert
        expect(EmailService.sendEmail).toHaveBeenCalledTimes(1);
        expect(EmailService.sendEmail).toHaveBeenCalledWith(
            'remind_test@example.com',
            expect.stringContaining('Upcoming Bills'),
            expect.stringContaining('Test Bill')
        );
    });
});
