const { dbAll } = require('../db');
const { getTenantDb } = require('../db/index');
const { sendNotification } = require('./notification_router');
const logger = require('../utils/logger');

/**
 * Item 253: Smart Reminders
 * Checks for upcoming warranty expirations and MOT due dates (e.g. within 30 days) and triggers push notifications.
 */
async function checkSmartReminders(householdId) {
  try {
    const tenantDb = await getTenantDb(householdId);

    // 1. Warranty Expirations
    const assetsSql = `
      SELECT id, name, warranty_expiry 
      FROM assets 
      WHERE household_id = ? AND deleted_at IS NULL 
        AND warranty_expiry >= date('now') 
        AND warranty_expiry <= date('now', '+30 days')
    `;
    const expiringAssets = await dbAll(tenantDb, assetsSql, [householdId]);

    for (const asset of expiringAssets) {
      await sendNotification(householdId, {
        title: 'Warranty Expiring Soon',
        message: `The warranty for '${asset.name}' expires on ${asset.warranty_expiry}.`,
        type: 'upcoming',
        metadata: { entityType: 'asset', entityId: asset.id },
      });
      logger.info(
        `[SMART_REMINDERS] Warranty reminder sent for asset ${asset.id} in HH:${householdId}`
      );
    }

    // 2. MOT / Tax Due
    const vehiclesSql = `
      SELECT id, make, model, registration, mot_due, tax_due
      FROM vehicles
      WHERE household_id = ? AND deleted_at IS NULL
    `;
    const vehicles = await dbAll(tenantDb, vehiclesSql, [householdId]);

    for (const v of vehicles) {
      // Check MOT
      if (v.mot_due) {
        const motDate = new Date(v.mot_due);
        const diffDays = Math.ceil((motDate - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          await sendNotification(householdId, {
            title: 'MOT Due Soon',
            message: `MOT for ${v.make} ${v.model} (${v.registration}) is due on ${v.mot_due}.`,
            type: 'urgent',
            metadata: { entityType: 'vehicle', entityId: v.id },
          });
          logger.info(
            `[SMART_REMINDERS] MOT reminder sent for vehicle ${v.id} in HH:${householdId}`
          );
        }
      }

      // Check Tax
      if (v.tax_due) {
        const taxDate = new Date(v.tax_due);
        const diffDays = Math.ceil((taxDate - new Date()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 30) {
          await sendNotification(householdId, {
            title: 'Vehicle Tax Due Soon',
            message: `Tax for ${v.make} ${v.model} (${v.registration}) is due on ${v.tax_due}.`,
            type: 'urgent',
            metadata: { entityType: 'vehicle', entityId: v.id },
          });
          logger.info(
            `[SMART_REMINDERS] Tax reminder sent for vehicle ${v.id} in HH:${householdId}`
          );
        }
      }
    }
  } catch (err) {
    logger.error(`[SMART_REMINDERS] Failed for HH:${householdId}`, err);
    throw err;
  }
}

module.exports = { checkSmartReminders };
