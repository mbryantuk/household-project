const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

// Middleware to init DB and Table
const useTenantDb = (req, res, next) => {
    const db = getHouseholdDb(req.params.id);
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS dates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL, -- YYYY-MM-DD
            type TEXT DEFAULT 'event', -- birthday, anniversary, holiday, other
            description TEXT
        )
    `;
    db.run(createTableSql, (err) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: "DB Init failed for dates" });
        }
        req.tenantDb = db;
        next();
    });
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
    const { title, date, type, description } = req.body;
    
    if (!title || !date) {
        req.tenantDb.close();
        return res.status(400).json({ error: "Title and Date are required" });
    }

    const sql = `INSERT INTO dates (title, date, type, description) VALUES (?, ?, ?, ?)`;
    req.tenantDb.run(sql, [title, date, type, description], function(err) {
        req.tenantDb.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, date, type, description });
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

module.exports = router;
