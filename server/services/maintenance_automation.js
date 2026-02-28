const { dbAll, dbRun, getHouseholdDb } = require('../db');
const { getTenantDb } = require('../db/index');
const logger = require('../utils/logger');
const { addDays, format, isBefore } = require('date-fns');

/**
 * Item 291: Automated Maintenance Workflows
 * Generates chores for upcoming vehicle maintenance and asset warranties.
 */
async function generateMaintenanceWorkflows(householdId) {
  try {
    const tenantDb = await getTenantDb(householdId);
    const today = new Date();
    const threshold = addDays(today, 14); // 14 days lead time

    // 1. Vehicle MOT / Service Chores
    const vehicles = await dbAll(
      tenantDb,
      'SELECT id, make, model, registration, mot_due FROM vehicles WHERE household_id = ? AND deleted_at IS NULL',
      [householdId]
    );

    for (const v of vehicles) {
      if (v.mot_due) {
        const motDate = new Date(v.mot_due);
        if (isBefore(motDate, threshold) && !isBefore(motDate, today)) {
          // Check if chore already exists to avoid duplicates
          const name = `Book MOT for ${v.make} ${v.model} (${v.registration})`;
          const existing = await dbAll(
            tenantDb,
            'SELECT id FROM chores WHERE household_id = ? AND name = ? AND deleted_at IS NULL',
            [householdId, name]
          );

          if (existing.length === 0) {
            await dbRun(
              tenantDb,
              'INSERT INTO chores (household_id, name, description, frequency, value, next_due_date, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                householdId,
                name,
                `The MOT for ${v.registration} is due on ${v.mot_due}.`,
                'one_off',
                5,
                v.mot_due,
                '🚗',
              ]
            );
            logger.info(`[AUTO-MAINT] Generated MOT chore for HH:${householdId}, Vehicle:${v.id}`);
          }
        }
      }
    }

    // 2. Asset Warranty Chores
    const assets = await dbAll(
      tenantDb,
      'SELECT id, name, warranty_expiry FROM assets WHERE household_id = ? AND deleted_at IS NULL',
      [householdId]
    );

    for (const a of assets) {
      if (a.warranty_expiry) {
        const expiryDate = new Date(a.warranty_expiry);
        if (isBefore(expiryDate, threshold) && !isBefore(expiryDate, today)) {
          const name = `Check Warranty for ${a.name}`;
          const existing = await dbAll(
            tenantDb,
            'SELECT id FROM chores WHERE household_id = ? AND name = ? AND deleted_at IS NULL',
            [householdId, name]
          );

          if (existing.length === 0) {
            await dbRun(
              tenantDb,
              'INSERT INTO chores (household_id, name, description, frequency, value, next_due_date, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                householdId,
                name,
                `The warranty for ${a.name} expires on ${a.warranty_expiry}. Inspect for issues!`,
                'one_off',
                2,
                a.warranty_expiry,
                '🛡️',
              ]
            );
            logger.info(
              `[AUTO-MAINT] Generated warranty chore for HH:${householdId}, Asset:${a.id}`
            );
          }
        }
      }
    }
  } catch (err) {
    logger.error(`[AUTO-MAINT] Failed for HH:${householdId}:`, err.message);
  }
}

module.exports = { generateMaintenanceWorkflows };
