const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

// Middleware to init DB and Table
const useTenantDb = (req, res, next) => {
    const db = getHouseholdDb(req.params.id);
    req.tenantDb = db;
    next();
};

// GET /households/:id/dates
router.get('/households/:id/dates', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.all(`SELECT * FROM dates ORDER BY date ASC`, [], (err, rows) => {
        req.tenantDb.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /households/:id/dates
router.post('/households/:id/dates', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        title, date, end_date, is_all_day, type, description, emoji, 
        recurrence, recurrence_end_date 
    } = req.body;
    
    if (!title || !date) {
        req.tenantDb.close();
        return res.status(400).json({ error: "Title and Start Date are required" });
    }

    const sql = `
        INSERT INTO dates (
            title, date, end_date, is_all_day, type, description, emoji, 
            recurrence, recurrence_end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    req.tenantDb.run(sql, [
        title, date, end_date, is_all_day, type, description, emoji, 
        recurrence || 'none', recurrence_end_date
    ], function(err) {
        req.tenantDb.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            id: this.lastID, title, date, end_date, is_all_day, type, description, emoji, 
            recurrence, recurrence_end_date 
        });
    });
});

// DELETE /households/:id/dates/:dateId
router.delete('/households/:id/dates/:dateId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    req.tenantDb.run(`DELETE FROM dates WHERE id = ?`, [req.params.dateId], function(err) {
        req.tenantDb.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Date removed" });
    });
});

// PUT /households/:id/dates/:dateId
router.put('/households/:id/dates/:dateId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const { 
        title, date, end_date, is_all_day, type, description, emoji, 
        recurrence, recurrence_end_date 
    } = req.body;
    const { dateId } = req.params;

    if (!title || !date) {
        req.tenantDb.close();
        return res.status(400).json({ error: "Title and Date are required" });
    }

    const sql = `
        UPDATE dates SET 
            title = ?, date = ?, end_date = ?, is_all_day = ?, type = ?, 
            description = ?, emoji = ?, recurrence = ?, recurrence_end_date = ?
        WHERE id = ?
    `;
    
    req.tenantDb.run(sql, [
        title, date, end_date, is_all_day, type, description, emoji, 
        recurrence || 'none', recurrence_end_date, dateId
    ], function(err) {
        req.tenantDb.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
            message: "Date updated", id: dateId, 
            title, date, end_date, is_all_day, type, description, emoji, 
            recurrence, recurrence_end_date 
        });
    });
});

module.exports = router;
