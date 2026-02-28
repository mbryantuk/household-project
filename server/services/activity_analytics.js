const { auditLogs, users, userProfiles } = require('../db/schema');
const { eq, and, gte, sql } = require('drizzle-orm');
const logger = require('../utils/logger');

/**
 * Item 265: Household Activity Heatmap
 * Analyzes audit logs to measure engagement across modules.
 */
async function getActivityHeatmap(db, householdId) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Fetch counts grouped by entityType (module) and member
    const rows = await db
      .select({
        module: auditLogs.entityType,
        userId: auditLogs.userId,
        actionCount: sql`count(*)`.mapWith(Number),
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.householdId, householdId),
          gte(auditLogs.createdAt, thirtyDaysAgo),
          sql`${auditLogs.entityType} IS NOT NULL`
        )
      )
      .groupBy(auditLogs.entityType, auditLogs.userId);

    // 2. Fetch member names for mapping
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
    const userDatas = await db
      .select({
        id: users.id,
        firstName: userProfiles.firstName,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(sql`${users.id} IN (${userIds.length > 0 ? userIds.join(',') : '0'})`);

    const userMap = {};
    userDatas.forEach((u) => (userMap[u.id] = u.firstName || `User ${u.id}`));

    // 3. Normalize for Heatmap (Modules vs Members)
    const modules = [...new Set(rows.map((r) => r.module))];
    const data = modules.map((mod) => {
      const entry = { module: mod };
      rows
        .filter((r) => r.module === mod)
        .forEach((r) => {
          const name = userMap[r.userId] || `User ${r.userId}`;
          entry[name] = r.actionCount;
        });
      return entry;
    });

    return {
      data,
      members: Object.values(userMap),
      modules,
    };
  } catch (err) {
    logger.error(`[ACTIVITY-ANALYTICS] Failed for HH:${householdId}:`, err);
    return null;
  }
}

module.exports = { getActivityHeatmap };
