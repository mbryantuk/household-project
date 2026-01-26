const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

/**
 * Middleware to Attach Tenant DB
 */
const useTenantDb = (req, res, next) => {
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

/**
 * @swagger
 * components:
 *   schemas:
 *     RecurringCharge:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         household_id:
 *           type: integer
 *         name:
 *           type: string
 *         amount:
 *           type: number
 *         segment:
 *           type: string
 *           enum: [household_bill, insurance, warranty, subscription, utility, other, vehicle_tax, vehicle_mot, vehicle_service, vehicle_fuel]
 *         frequency:
 *           type: string
 *           enum: [weekly, monthly, quarterly, yearly, one_off]
 *         day_of_month:
 *           type: integer
 *         month_of_year:
 *           type: integer
 *         day_of_week:
 *           type: integer
 *         exact_date:
 *           type: string
 *           format: date
 *         adjust_for_working_day:
 *           type: integer
 *           description: 1 for true, 0 for false
 *         linked_entity_type:
 *           type: string
 *         linked_entity_id:
 *           type: integer
 *         notes:
 *           type: string
 *         is_active:
 *           type: integer
 */

// GET /households/:id/finance/charges
router.get('/households/:id/finance/charges', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    const sql = `SELECT * FROM finance_recurring_charges WHERE household_id = ? ORDER BY created_at DESC`;
    req.tenantDb.all(sql, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET /households/:id/finance/charges/:chargeId
router.get('/households/:id/finance/charges/:chargeId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    const sql = `SELECT * FROM finance_recurring_charges WHERE id = ? AND household_id = ?`;
    req.tenantDb.get(sql, [req.params.chargeId, req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Charge not found' });
        res.json(row);
    });
});

// POST /households/:id/finance/charges
router.post('/households/:id/finance/charges', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, 
        adjust_for_working_day, linked_entity_type, linked_entity_id, notes 
    } = req.body;

    const sql = `INSERT INTO finance_recurring_charges (
        household_id, name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, 
        adjust_for_working_day, linked_entity_type, linked_entity_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        req.hhId, name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, 
        adjust_for_working_day || 1, linked_entity_type, linked_entity_id, notes
    ];

    req.tenantDb.run(sql, params, function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

// PUT /households/:id/finance/charges/:chargeId
router.put('/households/:id/finance/charges/:chargeId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, 
        adjust_for_working_day, linked_entity_type, linked_entity_id, notes, is_active 
    } = req.body;

    const sql = `UPDATE finance_recurring_charges SET 
        name = ?, amount = ?, segment = ?, frequency = ?, 
        day_of_month = ?, month_of_year = ?, day_of_week = ?, exact_date = ?, 
        adjust_for_working_day = ?, linked_entity_type = ?, linked_entity_id = ?, 
        notes = ?, is_active = ?
        WHERE id = ? AND household_id = ?`;

    const params = [
        name, amount, segment, frequency, 
        day_of_month, month_of_year, day_of_week, exact_date, 
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

// DELETE /households/:id/finance/charges/:chargeId
router.delete('/households/:id/finance/charges/:chargeId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const sql = `DELETE FROM finance_recurring_charges WHERE id = ? AND household_id = ?`;
    req.tenantDb.run(sql, [req.params.chargeId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Charge not found' });
        res.json({ message: 'Charge deleted' });
    });
});

module.exports = router;