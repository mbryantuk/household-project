const express = require('express');
const router = express.Router();
const {
  users,
  households,
  userHouseholds,
  testResults,
  versionHistory,
  auditLogs,
  featureFlags,
} = require('../db/schema');
const { eq, sql, desc, lt, and } = require('drizzle-orm');
const { authenticateToken, requireSystemRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { FeatureFlagSchema, ForbiddenError, AppError } = require('@hearth/shared');
const response = require('../utils/response');
const crypto = require('crypto');
const { SECRET_KEY } = require('../config');

router.use(authenticateToken);

/**
 * Item 133: Internal Admin IdP Logic
 */
const requireAdminSignature = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();

  const signature = req.headers['x-admin-signature'];
  const timestamp = req.headers['x-admin-timestamp'];

  if (!signature || !timestamp) {
    throw new ForbiddenError('Admin signature required');
  }

  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(`${req.method}${req.path}${timestamp}`);
  const expected = hmac.digest('hex');

  if (signature !== expected) {
    throw new ForbiddenError('Invalid admin signature');
  }

  next();
};

/**
 * GET /admin/feature-flags
 */
router.get('/feature-flags', requireSystemRole('admin'), async (req, res, next) => {
  try {
    const flags = await req.ctx.db.select().from(featureFlags);
    response.success(res, flags);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/feature-flags
 * Item 103: Validated JSONB
 */
router.post(
  '/feature-flags',
  requireSystemRole('admin'),
  requireAdminSignature,
  validate(FeatureFlagSchema),
  async (req, res, next) => {
    try {
      const { id, description, isEnabled, rolloutPercentage, criteria } = req.body;
      await req.ctx.db
        .insert(featureFlags)
        .values({
          id,
          description,
          isEnabled,
          rolloutPercentage,
          criteria,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: featureFlags.id,
          set: { description, isEnabled, rolloutPercentage, criteria, updatedAt: new Date() },
        });
      response.success(res, { message: 'Flag saved' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /admin/audit-logs
 * Item 91: Cursor-Based Pagination
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const hhId = req.query.householdId ? parseInt(req.query.householdId) : null;
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    if (
      req.user.systemRole !== 'admin' &&
      (!hhId || req.user.role !== 'admin' || req.user.householdId !== hhId)
    ) {
      throw new ForbiddenError('Access denied to audit logs');
    }

    let filters = [];
    if (hhId) filters.push(eq(auditLogs.householdId, hhId));
    if (cursor) filters.push(lt(auditLogs.id, cursor));

    const logs = await req.ctx.db
      .select()
      .from(auditLogs)
      .where(and(...filters))
      .orderBy(desc(auditLogs.id))
      .limit(limit + 1);

    const hasMore = logs.length > limit;
    const data = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    response.success(res, data, {
      next_cursor: nextCursor,
      has_more: hasMore,
      count: data.length,
    });
  } catch (err) {
    next(err);
  }
});

// Require System Admin for the rest
router.use(requireSystemRole('admin'));

router.get('/stats', async (req, res, next) => {
  try {
    const userCount = await req.ctx.db.select({ count: sql`count(*)` }).from(users);
    const hhCount = await req.ctx.db.select({ count: sql`count(*)` }).from(households);
    response.success(res, {
      users: parseInt(userCount[0].count),
      households: parseInt(hhCount[0].count),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const allUsers = await req.ctx.db.select().from(users).orderBy(desc(users.createdAt));
    response.success(res, allUsers);
  } catch (err) {
    next(err);
  }
});

router.get('/households', async (req, res, next) => {
  try {
    const allHhs = await req.ctx.db.select().from(households).orderBy(desc(households.createdAt));
    response.success(res, allHhs);
  } catch (err) {
    next(err);
  }
});

router.get('/nightly-health', async (req, res, next) => {
  try {
    const results = await req.ctx.db
      .select()
      .from(testResults)
      .orderBy(desc(testResults.createdAt))
      .limit(50);
    response.success(res, results);
  } catch (err) {
    next(err);
  }
});

router.get('/version-history', async (req, res, next) => {
  try {
    const history = await req.ctx.db
      .select()
      .from(versionHistory)
      .orderBy(desc(versionHistory.createdAt))
      .limit(10);
    response.success(res, history);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/health/stats
 * Item 228: System Health Metrics
 */
router.get('/health/stats', async (req, res, next) => {
  try {
    const { getMainQueue } = require('../services/queue');
    const queue = getMainQueue();

    // 1. BullMQ Stats
    const counts = await queue.getJobCounts('wait', 'completed', 'failed', 'delayed', 'active');

    // 2. Redis Memory
    const redis = queue.client;
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);

    // 3. PostgreSQL Pool
    // In Drizzle/PG, we don't have direct access to the pool from the db object easily
    // but we can query PG internal stats
    const pgStats = await req.ctx.db.execute(
      sql`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()`
    );

    response.success(res, {
      jobs: counts,
      redis: {
        used_memory: memoryMatch ? memoryMatch[1] : 'unknown',
      },
      postgres: {
        active_connections: parseInt(pgStats[0]?.count || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/households/:id/export
 */
router.get('/households/:id/export', async (req, res, next) => {
  const householdId = req.params.id;
  try {
    const { createBackup } = require('../services/backup');
    const filename = await createBackup(householdId, {
      version: '1.0',
      exported_at: new Date().toISOString(),
      household_id: householdId,
    });
    response.success(res, { message: 'Export ready', filename });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/households/:id
 */
router.delete('/households/:id', requireAdminSignature, async (req, res, next) => {
  const householdId = parseInt(req.params.id);
  try {
    await req.ctx.db.transaction(async (tx) => {
      await tx.delete(userHouseholds).where(eq(userHouseholds.householdId, householdId));
      await tx.delete(households).where(eq(households.id, householdId));
    });
    response.success(res, { message: 'Household destroyed' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/heapdump
 * Item 160: Memory Profiling
 */
router.get('/heapdump', requireAdminSignature, (req, res) => {
  const v8 = require('v8');
  const fs = require('fs');
  const path = require('path');
  try {
    const filename = `hearthstone-heap-${Date.now()}.heapsnapshot`;
    const filepath = path.join(__dirname, '..', 'data', filename);
    v8.writeHeapSnapshot(filepath);
    res.download(filepath, filename, (err) => {
      if (err) req.ctx.logger.error('Heapdump download failed', err);
      fs.unlink(filepath, () => {});
    });
  } catch (err) {
    res.status(500).json({ error: 'Heapdump failed: ' + err.message });
  }
});

module.exports = router;
