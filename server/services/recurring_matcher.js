const { dbAll } = require('../db');
const logger = require('../utils/logger');

/**
 * Item 255: Automated Recurring Cost Matching
 * Analyzes transaction history to suggest common recurring patterns.
 */
async function suggestRecurringCosts(tenantDb, householdId) {
  try {
    // 1. Get existing recurring costs to avoid duplicate suggestions
    const existing = await dbAll(
      tenantDb,
      'SELECT name, amount FROM recurring_costs WHERE household_id = ? AND deleted_at IS NULL AND is_active = 1',
      [householdId]
    );

    // 2. Fetch transactions from the last 6 months
    const txSql = `
      SELECT 
        description, 
        ROUND(amount, 2) as rounded_amount, 
        category,
        strftime('%Y-%m', date) as month_key
      FROM transactions
      WHERE household_id = ? 
        AND deleted_at IS NULL
        AND date > date('now', '-6 months')
        AND amount > 0 
    `;
    const txs = await dbAll(tenantDb, txSql, [householdId]);

    if (!txs || txs.length === 0) return [];

    // 3. Group transactions by (description, amount) and track unique months
    const groups = {};

    txs.forEach((t) => {
      const key = `${t.description.trim().toUpperCase()}_${t.rounded_amount}`;
      if (!groups[key]) {
        groups[key] = {
          count: 0,
          months: new Set(),
          category: t.category,
          description: t.description,
          amount: t.rounded_amount,
        };
      }
      groups[key].count++;
      groups[key].months.add(t.month_key);
    });

    const suggestions = [];
    for (const key in groups) {
      const g = groups[key];
      // If seen in 3 or more distinct months
      if (g.months.size >= 3) {
        // Check if this pattern already exists in recurring costs
        const isExisting = existing.some(
          (e) =>
            e.name.trim().toUpperCase() === g.description.trim().toUpperCase() &&
            Math.abs(e.amount - g.amount) < 0.05
        );

        if (!isExisting) {
          suggestions.push({
            type: 'recurring_suggestion',
            name: g.description,
            amount: g.amount,
            category: g.category,
            frequency: 'monthly',
            message: `We noticed '${g.description}' for £${g.amount.toFixed(2)} appeared in ${g.months.size} of the last 6 months. Would you like to track this as a recurring cost?`,
          });
        }
      }
    }

    return suggestions;
  } catch (err) {
    logger.error(`[RECURRING_MATCHER] Analysis failed for HH:${householdId}`, err);
    return [];
  }
}

module.exports = { suggestRecurringCosts };
