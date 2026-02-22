const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');

/**
 * GET /households/:id/shopping-list/schedules
 */
router.get('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const householdId = req.params.id;
  const sql = `
        SELECT s.*, p.is_completed, p.actual_cost, p.cycle_date
        FROM shopping_schedules s
        LEFT JOIN shopping_cycle_progress p ON s.id = p.schedule_id 
           AND p.cycle_date = s.next_run_date
        WHERE s.household_id = ?
    `;
  req.tenantDb.all(sql, [householdId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(
      rows.map((row) => ({
        ...row,
        items: JSON.parse(row.items || '[]'),
      }))
    );
  });
});

/**
 * POST /households/:id/shopping-list/schedules/:scheduleId/toggle-complete
 */
router.post(
  '/:scheduleId/toggle-complete',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { scheduleId } = req.params;
    const { cycle_date, is_completed, actual_cost } = req.body;
    const householdId = req.params.id;

    const sql = `INSERT INTO shopping_cycle_progress (household_id, schedule_id, cycle_date, is_completed, actual_cost, completed_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(household_id, schedule_id, cycle_date) DO UPDATE SET
                 is_completed = excluded.is_completed,
                 actual_cost = excluded.actual_cost,
                 completed_at = CURRENT_TIMESTAMP`;

    req.tenantDb.run(
      sql,
      [householdId, scheduleId, cycle_date, is_completed ? 1 : 0, actual_cost || 0],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status updated' });
      }
    );
  }
);

/**
 * POST /households/:id/shopping-list/schedules
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
  const { name, items, frequency, day_of_week, day_of_month, next_run_date } = req.body;
  const householdId = req.params.id;

  const sql = `INSERT INTO shopping_schedules (household_id, name, items, frequency, day_of_week, day_of_month, next_run_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    householdId,
    name,
    JSON.stringify(items || []),
    frequency,
    day_of_week,
    day_of_month,
    next_run_date,
  ];

  req.tenantDb.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});

/**
 * PUT /households/:id/shopping-list/schedules/:scheduleId
 */
router.put(
  '/:scheduleId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    const { name, items, frequency, day_of_week, day_of_month, next_run_date, is_active } =
      req.body;
    const { scheduleId } = req.params;

    const sql = `UPDATE shopping_schedules SET 
                 name = ?, items = ?, frequency = ?, day_of_week = ?, day_of_month = ?, next_run_date = ?, is_active = ?
                 WHERE id = ?`;
    const params = [
      name,
      JSON.stringify(items || []),
      frequency,
      day_of_week,
      day_of_month,
      next_run_date,
      is_active,
      scheduleId,
    ];

    req.tenantDb.run(sql, params, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Schedule updated' });
    });
  }
);

/**
 * DELETE /households/:id/shopping-list/schedules/:scheduleId
 */
router.delete(
  '/:scheduleId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  (req, res) => {
    req.tenantDb.run(
      'DELETE FROM shopping_schedules WHERE id = ?',
      [req.params.scheduleId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Schedule deleted' });
      }
    );
  }
);

module.exports = router;
