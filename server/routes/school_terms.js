const express = require('express');
const router = express.Router();
const { getHouseholdDb, ensureHouseholdSchema } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

const useTenantDb = async (req, res, next) => {
    const hhId = req.params.id;
    if (!hhId) return res.status(400).json({ error: "Household ID required" });
    try {
        const db = getHouseholdDb(hhId);
        await ensureHouseholdSchema(db, hhId);
        req.tenantDb = db;
        req.hhId = hhId;
        next();
    } catch (err) {
        res.status(500).json({ error: "Database initialization failed: " + err.message });
    }
};

const closeDb = (req) => {
    if (req.tenantDb) req.tenantDb.close();
};

router.get('/households/:id/school-terms', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    const memberId = req.query.member_id;
    let sql = `SELECT * FROM school_terms WHERE household_id = ?`;
    const params = [req.hhId];
    
    if (memberId) {
        sql += ` AND member_id = ?`;
        params.push(memberId);
    }
    
    sql += ` ORDER BY start_date DESC`;

    req.tenantDb.all(sql, params, (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

router.post('/households/:id/school-terms', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { member_id, term_name, start_date, end_date } = req.body;
    if (!member_id || !term_name || !start_date || !end_date) {
        closeDb(req);
        return res.status(400).json({ error: "All fields are required" });
    }
    
    const sql = `INSERT INTO school_terms (household_id, member_id, term_name, start_date, end_date) VALUES (?, ?, ?, ?, ?)`;
    req.tenantDb.run(sql, [req.hhId, member_id, term_name, start_date, end_date], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, member_id, term_name, start_date, end_date });
    });
});

router.put('/households/:id/school-terms/:termId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { termId } = req.params;
    const { term_name, start_date, end_date } = req.body;
    
    if (!term_name || !start_date || !end_date) {
        closeDb(req);
        return res.status(400).json({ error: "All fields are required" });
    }

    const sql = `UPDATE school_terms SET term_name = ?, start_date = ?, end_date = ? WHERE id = ? AND household_id = ?`;
    req.tenantDb.run(sql, [term_name, start_date, end_date, termId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Term not found" });
        res.json({ message: "Term updated", id: termId, ...req.body });
    });
});

router.delete('/households/:id/school-terms/:termId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { termId } = req.params;
    req.tenantDb.run(`DELETE FROM school_terms WHERE id = ? AND household_id = ?`, [termId, req.hhId], function(err) {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Term removed" });
    });
});

module.exports = router;
