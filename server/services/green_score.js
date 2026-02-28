const { dbAll, getHouseholdDb } = require('../db');
const { getTenantDb } = require('../db/index');
const logger = require('../utils/logger');

/**
 * Item 295: Household "Green Score" calculation
 * Based on energy efficiency trends and recycling habits.
 */
async function calculateGreenScore(householdId) {
  try {
    const tenantDb = await getTenantDb(householdId);

    // 1. Energy factor (Last 30 days usage)
    const energyReadings = await dbAll(
      tenantDb,
      `
      SELECT value FROM utility_readings 
      WHERE household_id = ? AND utility_type = 'energy' 
        AND reading_date >= date('now', '-30 days')
    `,
      [householdId]
    );

    // 2. Waste factor (Recycling frequency)
    const wasteAccounts = await dbAll(
      tenantDb,
      'SELECT waste_type FROM waste_accounts WHERE household_id = ? AND deleted_at IS NULL',
      [householdId]
    );
    const hasRecycling = wasteAccounts.some((w) =>
      w.waste_type.toLowerCase().includes('recycling')
    );

    // Base score 50
    let score = 50;
    let factors = [];

    if (hasRecycling) {
      score += 20;
      factors.push('Active recycling program (+20)');
    }

    if (energyReadings.length >= 2) {
      const first = energyReadings[0].value;
      const last = energyReadings[energyReadings.length - 1].value;
      if (last < first) {
        score += 15;
        factors.push('Energy consumption decreasing (+15)');
      } else {
        score -= 5;
        factors.push('Energy consumption increasing (-5)');
      }
    }

    // Normalized to 0-100
    const finalScore = Math.max(0, Math.min(100, score));
    let rating = 'Bronze';
    if (finalScore > 80) rating = 'Gold';
    else if (finalScore > 60) rating = 'Silver';

    return {
      score: finalScore,
      rating,
      factors,
    };
  } catch (err) {
    logger.error(`[GREEN-SCORE] Failed for HH:${householdId}:`, err.message);
    return { score: 0, rating: 'Unknown', factors: ['Insufficient data'] };
  }
}

module.exports = { calculateGreenScore };
