const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { auditLog } = require('../services/audit');
const response = require('../utils/response');

/**
 * GET /api/households/:id/shopping-list/schedules
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
  req.tenantDb.all(
    'SELECT * FROM shopping_schedules WHERE household_id = ?',
    [req.hhId],
    (err, rows) => {
      if (err) return response.error(res, err.message);
      response.success(res, rows || []);
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
      if (err) return response.error(res, err.message);
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
      response.success(res, { id: newId, ...req.body }, null, 201);
    }
  );
});

/**
 * POST /api/households/:id/shopping-list/schedules/:scheduleId/toggle-complete
 * Item 118: Marks a cycle as completed and logs the actual cost.
 */
router.post('/:scheduleId/toggle-complete', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { scheduleId } = req.params;
  const { is_completed, actual_cost } = req.body;

  req.tenantDb.run(
    'UPDATE shopping_schedules SET is_completed = ?, last_completed_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
    [is_completed ? 1 : 0, scheduleId, req.hhId],
    async function (err) {
      if (err) return response.error(res, err.message);
      if (this.changes === 0) return response.error(res, 'Schedule not found', null, 404);

      await auditLog(
        req.hhId,
        req.user.id,
        'SHOPPING_SCHEDULE_TOGGLE',
        'shopping_schedule',
        scheduleId,
        { is_completed, actual_cost },
        req
      );

      response.success(res, { success: true, is_completed });
    }
  );
});

module.exports = router;
