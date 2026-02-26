const { dbAll, getHouseholdDb } = require('../db');
const { auditLog } = require('./audit');
const logger = require('../utils/logger');
const { addJob } = require('./queue');
const { addDays, format, parseISO, isBefore, isValid } = require('date-fns');

/**
 * FINANCE ALERTS SERVICE
 * Item 221: Smart Overdraft Protection
 */

async function checkUpcomingOverdrafts(householdId) {
  logger.info(`[FINANCE-ALERTS] Checking overdrafts for HH:${householdId}`);
  const db = getHouseholdDb(householdId);

  try {
    // 1. Get all current accounts
    const accounts = await dbAll(
      db,
      'SELECT * FROM finance_current_accounts WHERE household_id = ? AND deleted_at IS NULL',
      [householdId]
    );
    if (!accounts.length) return;

    // 2. Get all recurring costs
    const costs = await dbAll(
      db,
      'SELECT * FROM recurring_costs WHERE household_id = ? AND deleted_at IS NULL AND is_active = 1',
      [householdId]
    );

    // 3. Get all income
    const incomes = await dbAll(
      db,
      'SELECT * FROM finance_income WHERE household_id = ? AND deleted_at IS NULL AND is_active = 1',
      [householdId]
    );

    const alerts = [];
    const today = new Date();
    const projectionEnd = addDays(today, 30);

    for (const account of accounts) {
      let projectedBalance = parseFloat(account.current_balance) || 0;
      const overdraftLimit = parseFloat(account.overdraft_limit) || 0;
      const accountId = account.id;

      // Filter recurring items for this account
      const accountCosts = costs.filter((c) => c.bank_account_id === accountId);
      const accountIncomes = incomes.filter((i) => i.bank_account_id === accountId);

      // Simple 30-day projection
      for (let day = 0; day <= 30; day++) {
        const currentDate = addDays(today, day);
        const dayOfMonth = currentDate.getDate();

        // Add Income
        accountIncomes.forEach((inc) => {
          if (inc.payment_day === dayOfMonth) {
            projectedBalance += parseFloat(inc.amount) || 0;
          }
        });

        // Subtract Costs
        for (const cost of accountCosts) {
          if (cost.day_of_month === dayOfMonth) {
            const amount = parseFloat(cost.amount) || 0;
            if (projectedBalance - amount < -overdraftLimit) {
              // Potential Overdraft!
              alerts.push({
                accountId,
                accountName: account.account_name,
                costName: cost.name,
                amount,
                date: format(currentDate, 'yyyy-MM-dd'),
                projectedBalance: projectedBalance - amount,
                shortfall: Math.abs(projectedBalance - amount + overdraftLimit),
              });
            }
            projectedBalance -= amount;
          }
        }
      }
    }

    // 4. Dispatch Notifications
    if (alerts.length > 0) {
      logger.warn(
        `[FINANCE-ALERTS] Found ${alerts.length} potential overdrafts for HH:${householdId}`
      );
      for (const alert of alerts) {
        const message = `Potential overdraft on ${alert.date}: ${alert.costName} (${alert.amount}) will leave ${alert.accountName} at ${alert.projectedBalance.toFixed(2)}.`;

        // Create in-app notification
        await dbAll(
          db,
          'INSERT INTO notifications (household_id, title, message, type, is_read, created_at, updated_at) VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [householdId, 'Overdraft Warning', message, 'urgent']
        );

        // Optional: Trigger background job for email
        // await addJob('SEND_EMAIL', { householdId, subject: 'Hearthstone: Overdraft Warning', text: message });
      }
    }

    return alerts;
  } catch (err) {
    logger.error(`[FINANCE-ALERTS] Error checking overdrafts for HH:${householdId}:`, err);
    throw err;
  }
}

module.exports = { checkUpcomingOverdrafts };
