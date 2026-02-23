const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const { users, households, userHouseholds, testResults, versionHistory } = require('../db/schema');
const { eq, sql, desc } = require('drizzle-orm');
const { authenticateToken, requireSystemRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireSystemRole('admin'));

/**
 * GET /admin/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    const hhCount = await db.select({ count: sql`count(*)` }).from(households);

    res.json({
      users: parseInt(userCount[0].count),
      households: parseInt(hhCount[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/users
 */
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json(allUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/households
 */
router.get('/households', async (req, res) => {
  try {
    const allHhs = await db.select().from(households).orderBy(desc(households.createdAt));
    res.json(allHhs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/nightly-health
 */
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

/**
 * GET /admin/version-history
 */
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
