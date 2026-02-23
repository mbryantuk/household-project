const { DATABASE_URL } = require('../config');
const logger = require('../utils/logger').default;
const { notifyHousehold } = require('./socket');

let db;
let auditLogs;

if (DATABASE_URL) {
  try {
    const dbModule = require('../db/index');
    const schema = require('../db/schema');
    db = dbModule.db;
    auditLogs = schema.auditLogs;
  } catch (err) {
    logger.error('[AUDIT-INIT] Failed to initialize Postgres audit logging:', err.message);
  }
}

/**
 * Log a sensitive action and broadcast real-time update.
 */
async function logAction({
  householdId,
  userId,
  action,
  entityType,
  entityId,
  metadata = {},
  req,
}) {
  const logData = {
    householdId,
    userId,
    action,
    entityType,
    entityId,
    metadata,
    ipAddress: req?.ip || req?.headers['x-forwarded-for'] || null,
    userAgent: req?.headers['user-agent'] || null,
    timestamp: new Date().toISOString(),
  };

  // 1. Console Log
  logger.info({ audit: logData }, `[AUDIT] ${action}`);

  // 2. Real-time Notification
  notifyHousehold(householdId, 'DATA_UPDATED', { action, entityType, entityId });

  // 3. Persistent DB
  if (db && auditLogs) {
    try {
      await db.insert(auditLogs).values({
        householdId: logData.householdId,
        userId: logData.userId,
        action: logData.action,
        entityType: logData.entityType,
        entityId: logData.entityId,
        metadata: logData.metadata,
        ipAddress: logData.ipAddress,
        userAgent: logData.userAgent,
      });
    } catch (err) {
      logger.error(`[AUDIT-DB-ERROR] Failed to persist log ${action}:`, err.message);
    }
  }
}

async function auditLog(householdId, userId, action, entityType, entityId, metadata, req) {
  return await logAction({ householdId, userId, action, entityType, entityId, metadata, req });
}

module.exports = { logAction, auditLog };
