const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { auditLog } = require('../services/audit');

/**
 * GET /api/households/:id/shopping-list/schedules
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all(
    'SELECT * FROM shopping_schedules WHERE household_id = ?',
    [req.hhId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

/**
 * POST /api/households/:id/shopping-list/schedules
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { name, items, frequency, day_of_week, day_of_month } = req.body;
  req.tenantDb.run(
    'INSERT INTO shopping_schedules (household_id, name, items, frequency, day_of_week, day_of_month) VALUES (?, ?, ?, ?, ?, ?)',
    [req.hhId, name, JSON.stringify(items || []), frequency, day_of_week, day_of_month],
    async function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const newId = this.lastID;
      await auditLog(
        req.hhId,
        req.user.id,
        'SHOPPING_SCHEDULE_CREATE',
        'shopping_schedule',
        newId,
        { name },
        req
      );
      res.status(201).json({ id: newId, ...req.body });
    }
  );
});

module.exports = router;
