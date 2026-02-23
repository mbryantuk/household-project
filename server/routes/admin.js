const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const { users, households, testResults, versionHistory, auditLogs } = require('../db/schema');
const { eq, sql, desc } = require('drizzle-orm');
const { authenticateToken, requireSystemRole } = require('../middleware/auth');

router.use(authenticateToken);

/**
 * GET /admin/audit-logs
 * System admin sees all, or filter by householdId
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const hhId = req.query.householdId ? parseInt(req.query.householdId) : null;

    // Authorization: User must be system admin OR admin of the target household
    if (
      req.user.systemRole !== 'admin' &&
      (!hhId || req.user.role !== 'admin' || req.user.householdId !== hhId)
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = db.select().from(auditLogs);
    if (hhId) {
      query = query.where(eq(auditLogs.householdId, hhId));
    }

    const logs = await query.orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json(logs);
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

module.exports = router;
