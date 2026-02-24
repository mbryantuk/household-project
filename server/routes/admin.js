const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
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

router.use(authenticateToken);

/**
 * GET /admin/feature-flags
 */
router.get('/feature-flags', requireSystemRole('admin'), async (req, res) => {
  try {
    const flags = await db.select().from(featureFlags);
    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/feature-flags
 */
router.post('/feature-flags', requireSystemRole('admin'), async (req, res) => {
  try {
    const { id, description, isEnabled, rolloutPercentage, criteria } = req.body;
    await db
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
    res.json({ message: 'Flag saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/audit-logs
 * System admin sees all, or filter by householdId
 * Item 91: Cursor-Based Pagination
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const hhId = req.query.householdId ? parseInt(req.query.householdId) : null;
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Authorization: User must be system admin OR admin of the target household
    if (
      req.user.systemRole !== 'admin' &&
      (!hhId || req.user.role !== 'admin' || req.user.householdId !== hhId)
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let filters = [];
    if (hhId) filters.push(eq(auditLogs.householdId, hhId));
    if (cursor) filters.push(lt(auditLogs.id, cursor));

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...filters))
      .orderBy(desc(auditLogs.id))
      .limit(limit + 1); // Fetch one extra to check for next page

    const hasMore = logs.length > limit;
    const data = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    res.json({
      data,
      meta: {
        next_cursor: nextCursor,
        has_more: hasMore,
        count: data.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Require System Admin for the rest
router.use(requireSystemRole('admin'));

router.get('/stats', async (req, res) => {
  try {
    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    const hhCount = await db.select({ count: sql`count(*)` }).from(households);
    res.json({ users: parseInt(userCount[0].count), households: parseInt(hhCount[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json(allUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/households', async (req, res) => {
  try {
    const allHhs = await db.select().from(households).orderBy(desc(households.createdAt));
    res.json(allHhs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/nightly-health', async (req, res) => {
  try {
    const results = await db
      .select()
      .from(testResults)
      .orderBy(desc(testResults.createdAt))
      .limit(50);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/version-history', async (req, res) => {
  try {
    const history = await db
      .select()
      .from(versionHistory)
      .orderBy(desc(versionHistory.createdAt))
      .limit(10);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/households/:id/export
 * Admin-only trigger for full tenant export (ZIP format)
 */
router.get('/households/:id/export', async (req, res) => {
  const householdId = req.params.id;
  try {
    const { createBackup } = require('../services/backup');
    const filename = await createBackup(householdId, {
      version: '1.0',
      exported_at: new Date().toISOString(),
      household_id: householdId,
    });
    res.json({ message: 'Export ready', filename });
  } catch (err) {
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

/**
 * DELETE /api/admin/households/:id
 * Admin-only trigger for tenant destruction.
 */
router.delete('/households/:id', async (req, res) => {
  const householdId = parseInt(req.params.id);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(userHouseholds).where(eq(userHouseholds.householdId, householdId));
      await tx.delete(households).where(eq(households.id, householdId));
    });
    res.json({ message: 'Household destroyed' });
  } catch (err) {
    res.status(500).json({ error: 'Destruction failed: ' + err.message });
  }
});

/**
 * GET /api/admin/heapdump
 * Generate a heap snapshot for Item 160: Memory Profiling
 */
router.get('/heapdump', (req, res) => {
  const v8 = require('v8');
  const fs = require('fs');
  const path = require('path');
  try {
    const filename = `hearthstone-heap-${Date.now()}.heapsnapshot`;
    const filepath = path.join(__dirname, '..', 'data', filename);
    v8.writeHeapSnapshot(filepath);
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Heapdump download failed', err);
      }
      fs.unlink(filepath, () => {}); // Cleanup after sending
    });
  } catch (err) {
    res.status(500).json({ error: 'Heapdump failed: ' + err.message });
  }
});

module.exports = router;
