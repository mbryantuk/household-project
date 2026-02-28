const { dbAll } = require('../db');
const logger = require('../utils/logger');

/**
 * Item 283: Automated Grocery Lists (Proactive Suggestions)
 * Analyzes historical shopping data to suggest items that are likely needed.
 */
async function getGrocerySuggestions(tenantDb, householdId) {
  try {
    // 1. Fetch checked items from the last 90 days
    const sql = `
      SELECT name, category, COUNT(*) as buy_count, MAX(created_at) as last_bought
      FROM shopping_items
      WHERE household_id = ? AND is_checked = 1
        AND created_at >= date('now', '-90 days')
      GROUP BY name, category
      HAVING buy_count >= 2
    `;
    const historicalItems = await dbAll(tenantDb, sql, [householdId]);

    // 2. Fetch currently unchecked items to avoid suggesting what's already on the list
    const currentList = await dbAll(
      tenantDb,
      'SELECT name FROM shopping_items WHERE household_id = ? AND is_checked = 0',
      [householdId]
    );
    const currentNames = new Set(currentList.map((i) => i.name.toLowerCase()));

    const suggestions = [];
    const now = new Date();

    historicalItems.forEach((item) => {
      if (currentNames.has(item.name.toLowerCase())) return;

      const lastBought = new Date(item.last_bought);
      const daysSinceLast = Math.floor((now - lastBought) / (1000 * 60 * 60 * 24));

      // Heuristic: If bought 3 times in 90 days (~monthly) and last bought > 20 days ago
      const buyInterval = 90 / item.buy_count;
      if (daysSinceLast >= buyInterval * 0.8) {
        suggestions.push({
          name: item.name,
          category: item.category,
          reason: `You usually buy this every ${Math.round(buyInterval)} days.`,
          confidence: item.buy_count > 5 ? 'high' : 'medium',
        });
      }
    });

    return suggestions;
  } catch (err) {
    logger.error(`[GROCERY-INTELLIGENCE] Failed for HH:${householdId}:`, err);
    return [];
  }
}

module.exports = { getGrocerySuggestions };
