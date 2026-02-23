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
 * @param {Object} params
 * @param {number} params.householdId - The target household
 * @param {number} params.userId - The user performing the action
 * @param {string} params.action - Action identifier (e.g. 'MEMBER_UPDATE')
 * @param {string} [params.entityType] - Type of object affected
 * @param {number} [params.entityId] - ID of object affected
 * @param {Object} [params.metadata] - Extra context (IP, diff, etc)
 * @param {Object} [params.req] - Optional Express request to auto-extract IP/UA
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

module.exports = { logAction };
