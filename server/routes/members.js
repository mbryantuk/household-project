const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

// Middleware to standardize DB initialization across all member actions
const useTenantDb = (req, res, next) => {
    const db = getHouseholdDb(req.params.id);
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'adult',
            notes TEXT,
            alias TEXT, 
            dob TEXT, 
            species TEXT, 
            gender TEXT
        )
    `;
    db.run(createTableSql, (err) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: "DB Init failed" });
        }
        req.tenantDb = db;
        next();
    });
};

// 1. LIST MEMBERS (Full Path: GET /members/households/:id/members)
router.get('/households/:id/members', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.all(`SELECT * FROM members`, [], (err, rows) => {
        const dbRef = req.tenantDb;
        dbRef.close(); 
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET A SINGLE MEMBER (Full Path: GET /members/households/:id/members/:memberId)
router.get('/households/:id/members/:memberId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.get(`SELECT * FROM members WHERE id = ?`, [req.params.memberId], (err, row) => {
        const dbRef = req.tenantDb;
        dbRef.close();
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Member not found" });
        res.json(row);
    });
});

// 2. ADD MEMBER (Full Path: POST /members/households/:id/members)
router.post('/households/:id/members', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
    // 🟢 Updated to include new fields from the UI
    const { name, type, notes, alias, dob, species, gender } = req.body;
    
    const sql = `INSERT INTO members (name, type, notes, alias, dob, species, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, type, notes, alias, dob, species, gender];

    req.tenantDb.run(sql, params, function(err) {
        const dbRef = req.tenantDb;
        dbRef.close(); 
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body });
    });
});

// 3. REMOVE MEMBER (Full Path: DELETE /members/households/:id/members/:memberId)
router.delete('/households/:id/members/:memberId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
    req.tenantDb.run(`DELETE FROM members WHERE id = ?`, [req.params.memberId], function(err) {
        const dbRef = req.tenantDb;
        dbRef.close(); 
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Member removed" });
    });
});
router.put('/households/:id/members/:memberId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
    const { name, type, notes, alias, dob, species, gender } = req.body;
    const memberId = req.params.memberId;

    const sql = `
        UPDATE members 
        SET name = ?, type = ?, notes = ?, alias = ?, dob = ?, species = ?, gender = ?
        WHERE id = ?
    `;
    const params = [name, type, notes, alias, dob, species, gender, memberId];

    req.tenantDb.run(sql, params, function(err) {
        const dbRef = req.tenantDb;
        dbRef.close(); 
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Member not found" });
        
        res.json({ message: "Member updated successfully", id: memberId, ...req.body });
    });
});
module.exports = router;