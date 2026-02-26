const { dbAll, dbRun, getHouseholdDb } = require('../db');
const logger = require('../utils/logger');
const { addDays, format } = require('date-fns');
const { v4: uuidv4 } = require('uuid');

/**
 * GROCERY AUTOMATION SERVICE
 * Item 223: Auto-populate shopping list from meal plan
 */

async function populateGroceriesFromMeals(householdId) {
  logger.info(`[GROCERY-AUTO] Syncing shopping list for HH:${householdId}`);
  const db = getHouseholdDb(householdId);

  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');

    // 1. Get planned meals for next 7 days
    const plans = await dbAll(
      db,
      'SELECT mp.*, m.ingredients FROM meal_plans mp JOIN meals m ON mp.meal_id = m.id WHERE mp.household_id = ? AND mp.date >= ? AND mp.date <= ?',
      [householdId, today, nextWeek]
    );

    if (!plans.length) return { added: 0 };

    // 2. Aggregate unique ingredients
    const neededItems = new Set();
    plans.forEach((plan) => {
      if (plan.ingredients) {
        try {
          const items = JSON.parse(plan.ingredients);
          if (Array.isArray(items)) {
            items.forEach((item) => {
              if (typeof item === 'string') neededItems.add(item.trim().toLowerCase());
              else if (item.name) neededItems.add(item.name.trim().toLowerCase());
            });
          }
        } catch (e) {
          logger.warn(`[GROCERY-AUTO] Failed to parse ingredients for meal ${plan.meal_id}`);
        }
      }
    });

    if (neededItems.size === 0) return { added: 0 };

    // 3. Get existing shopping items to avoid duplicates
    const existing = await dbAll(
      db,
      'SELECT name FROM shopping_items WHERE household_id = ? AND is_checked = 0',
      [householdId]
    );
    const existingNames = new Set(existing.map((i) => i.name.toLowerCase()));

    let addedCount = 0;
    for (const itemName of neededItems) {
      if (!existingNames.has(itemName)) {
        await dbRun(
          db,
          'INSERT INTO shopping_items (id, household_id, name, category, quantity, is_checked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [uuidv4(), householdId, itemName, 'general', '1']
        );
        addedCount++;
      }
    }

    logger.info(
      `[GROCERY-AUTO] Added ${addedCount} new items to shopping list for HH:${householdId}`
    );
    return { added: addedCount };
  } catch (err) {
    logger.error(`[GROCERY-AUTO] Error populating groceries for HH:${householdId}:`, err);
    throw err;
  }
}

module.exports = { populateGroceriesFromMeals };
