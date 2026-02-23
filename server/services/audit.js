const { DATABASE_URL } = require('../config');
const logger = require('../utils/logger').default;

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
 * Log a sensitive action to the immutable audit trail.
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

  // 1. Structured Console Logging (Always)
  logger.info({ audit: logData }, `[AUDIT] ${action}`);

  // 2. Persistent Database Logging (If Postgres available)
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

/**
 * Wrapper for cleaner route usage
 */
async function auditLog(householdId, userId, action, entityType, entityId, metadata, req) {
  return await logAction({ householdId, userId, action, entityType, entityId, metadata, req });
}

module.exports = { logAction, auditLog };
