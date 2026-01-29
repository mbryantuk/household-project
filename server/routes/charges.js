const express = require('express');
const router = express.Router({ mergeParams: true });
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

/**
 * Middleware to Attach Tenant DB
 */
const useTenantDb = (req, res, next) => {
    // Parent router handles :id
    const hhId = req.params.id;
    if (!hhId) return res.status(400).json({ error: "Household ID required" });
    const db = getHouseholdDb(hhId);
    req.tenantDb = db;
    req.hhId = hhId;
    next();
};

const closeDb = (req) => {
    if (req.tenantDb) req.tenantDb.close();
};

// GET / (relative to mount point /households/:id/finance/charges)
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    const sql = `SELECT * FROM finance_recurring_charges WHERE household_id = ? ORDER BY created_at DESC`;
    req.tenantDb.all(sql, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET /:chargeId
router.get('/:chargeId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    const sql = `SELECT * FROM finance_recurring_charges WHERE id = ? AND household_id = ?`;
    req.tenantDb.get(sql, [req.params.chargeId, req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Charge not found' });
        res.json(row);
    });
});

// POST /
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, start_date,
        adjust_for_working_day, linked_entity_type, linked_entity_id, notes 
    } = req.body;

    const sql = `INSERT INTO finance_recurring_charges (
        household_id, name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, start_date,
        adjust_for_working_day, linked_entity_type, linked_entity_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        req.hhId, name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, start_date,
        adjust_for_working_day || 1, linked_entity_type, linked_entity_id, notes
    ];

    req.tenantDb.run(sql, params, function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT /:chargeId
router.put('/:chargeId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, start_date,
        adjust_for_working_day, linked_entity_type, linked_entity_id, notes, is_active 
    } = req.body;

    const sql = `UPDATE finance_recurring_charges SET 
        name = ?, amount = ?, segment = ?, frequency = ?, 
        day_of_month = ?, month_of_year = ?, day_of_week = ?, exact_date = ?, start_date = ?,
        adjust_for_working_day = ?, linked_entity_type = ?, linked_entity_id = ?, 
        notes = ?, is_active = ?
        WHERE id = ? AND household_id = ?`;

    const params = [
        name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, start_date,
        adjust_for_working_day, linked_entity_type, linked_entity_id, 
        notes, is_active,
        req.params.chargeId, req.hhId
    ];

    req.tenantDb.run(sql, params, function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Charge not found' });
        res.json({ message: 'Charge updated' });
    });
});

// DELETE /:chargeId
router.delete('/:chargeId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const sql = `UPDATE finance_recurring_charges SET is_active = 0 WHERE id = ? AND household_id = ?`;
    req.tenantDb.run(sql, [req.params.chargeId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Charge not found' });
        res.json({ message: 'Charge archived' });
    });
});

module.exports = router;