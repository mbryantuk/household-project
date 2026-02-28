const { dbAll } = require('../db');

/**
 * Item 251: Anomaly Detection
 * Finds recent transactions that are unusually high compared to historical averages for that category.
 */
async function detectAnomalies(tenantDb, householdId) {
  // 1. Get historical averages by category (excluding current month)
  const historicalAvgSql = `
    SELECT category, AVG(amount) as avg_amount, COUNT(*) as tx_count
    FROM transactions 
    WHERE household_id = ? 
      AND deleted_at IS NULL 
      AND date < date('now', 'start of month')
      AND date > date('now', '-6 months')
    GROUP BY category
    HAVING tx_count > 2
  `;
  const historicalAverages = await dbAll(tenantDb, historicalAvgSql, [householdId]);

  if (!historicalAverages || historicalAverages.length === 0) return [];

  const avgMap = new Map();
  historicalAverages.forEach((row) => avgMap.set(row.category, row.avg_amount));

  // 2. Get recent transactions (last 30 days)
  const recentSql = `
    SELECT * FROM transactions 
    WHERE household_id = ? 
      AND deleted_at IS NULL 
      AND date >= date('now', '-30 days')
  `;
  const recentTransactions = await dbAll(tenantDb, recentSql, [householdId]);

  const anomalies = [];

  for (const tx of recentTransactions) {
    if (!tx.category || !avgMap.has(tx.category)) continue;

    const avg = avgMap.get(tx.category);
    // If transaction is 2x the historical average and greater than a trivial amount (e.g., £10)
    if (avg > 10 && tx.amount > avg * 2) {
      anomalies.push({
        type: 'anomaly',
        title: 'Unusual Spend Detected',
        message: `Your recent transaction of £${tx.amount.toFixed(2)} for '${tx.category}' is significantly higher than your 6-month average of £${avg.toFixed(2)}.`,
        metadata: {
          transactionId: tx.id,
          category: tx.category,
          amount: tx.amount,
          historicalAverage: avg,
        },
      });
    }
  }

  return anomalies;
}

module.exports = { detectAnomalies };
