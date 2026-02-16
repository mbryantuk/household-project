const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');

/**
 * GET /households/:id/shopping-list/schedules
 */
router.get('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    req.tenantDb.all("SELECT * FROM shopping_schedules WHERE household_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(row => ({
            ...row,
            items: JSON.parse(row.items || '[]')
        })));
    });
});

/**
 * POST /households/:id/shopping-list/schedules
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { name, items, frequency, day_of_week, day_of_month, next_run_date } = req.body;
    const householdId = req.params.id;

    const sql = `INSERT INTO shopping_schedules (household_id, name, items, frequency, day_of_week, day_of_month, next_run_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [householdId, name, JSON.stringify(items || []), frequency, day_of_week, day_of_month, next_run_date];

    req.tenantDb.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

/**
 * PUT /households/:id/shopping-list/schedules/:scheduleId
 */
router.put('/:scheduleId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { name, items, frequency, day_of_week, day_of_month, next_run_date, is_active } = req.body;
    const { scheduleId } = req.params;

    const sql = `UPDATE shopping_schedules SET 
                 name = ?, items = ?, frequency = ?, day_of_week = ?, day_of_month = ?, next_run_date = ?, is_active = ?
                 WHERE id = ?`;
    const params = [name, JSON.stringify(items || []), frequency, day_of_week, day_of_month, next_run_date, is_active, scheduleId];

    req.tenantDb.run(sql, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Schedule updated" });
    });
});

/**
 * DELETE /households/:id/shopping-list/schedules/:scheduleId
 */
router.delete('/:scheduleId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    req.tenantDb.run("DELETE FROM shopping_schedules WHERE id = ?", [req.params.scheduleId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Schedule deleted" });
    });
});

module.exports = router;
