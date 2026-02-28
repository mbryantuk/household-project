const { dbAll } = require('../db');
const logger = require('../utils/logger');

/**
 * Item 263: Smart Budget Adjustments
 * Analyzes the last 3 months of spending vs budget limits.
 */
async function getBudgetAdjustmentSuggestions(tenantDb, householdId) {
  try {
    // 1. Fetch budget categories
    const categories = await dbAll(
      tenantDb,
      'SELECT id, name, monthly_limit FROM finance_budget_categories WHERE household_id = ? AND deleted_at IS NULL',
      [householdId]
    );

    if (!categories || categories.length === 0) return [];

    // 2. Fetch transaction spend for last 3 full months, grouped by category and month
    const spendSql = `
      SELECT 
        category, 
        strftime('%Y-%m', date) as month_key,
        SUM(amount) as monthly_spend
      FROM transactions
      WHERE household_id = ? 
        AND deleted_at IS NULL
        AND date >= date('now', 'start of month', '-3 months')
        AND date < date('now', 'start of month')
        AND amount > 0 -- Assuming expenses are positive here, need to verify
      GROUP BY category, month_key
    `;
    const historicalSpend = await dbAll(tenantDb, spendSql, [householdId]);

    // 3. Calculate average spend per category
    const categoryAverages = {};
    historicalSpend.forEach((row) => {
      if (!categoryAverages[row.category]) {
        categoryAverages[row.category] = { total: 0, months: new Set() };
      }
      categoryAverages[row.category].total += row.monthly_spend;
      categoryAverages[row.category].months.add(row.month_key);
    });

    const suggestions = [];

    categories.forEach((cat) => {
      const avgData = categoryAverages[cat.name]; // Match by name
      if (!avgData || avgData.months.size === 0) return;

      const avgSpend = avgData.total / avgData.months.size;
      const currentLimit = cat.monthly_limit || 0;

      // Suggest decrease if average spend is < 70% of limit
      if (currentLimit > 50 && avgSpend < currentLimit * 0.7) {
        suggestions.push({
          type: 'budget_adjustment',
          categoryId: cat.id,
          categoryName: cat.name,
          currentLimit,
          suggestedLimit: Math.ceil(avgSpend * 1.1), // Suggest 10% above average
          reason: 'spending_low',
          message: `You've consistently spent less than your limit for '${cat.name}'. Consider lowering it from £${currentLimit} to £${Math.ceil(avgSpend * 1.1)} to free up budget elsewhere.`,
        });
      }

      // Suggest increase if average spend is > 95% of limit
      if (currentLimit > 0 && avgSpend > currentLimit * 0.95) {
        suggestions.push({
          type: 'budget_adjustment',
          categoryId: cat.id,
          categoryName: cat.name,
          currentLimit,
          suggestedLimit: Math.ceil(avgSpend * 1.2), // Suggest 20% buffer
          reason: 'spending_high',
          message: `You're consistently hitting your limit for '${cat.name}'. Consider increasing it from £${currentLimit} to £${Math.ceil(avgSpend * 1.2)} to avoid overspending.`,
        });
      }
    });

    return suggestions;
  } catch (err) {
    logger.error(`[BUDGET-INTELLIGENCE] Failed for HH:${householdId}:`, err);
    return [];
  }
}

module.exports = { getBudgetAdjustmentSuggestions };
