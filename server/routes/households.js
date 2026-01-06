const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { globalDb, getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

// ==========================================
// 🏠 HOUSEHOLD MANAGEMENT
// ==========================================

// GET /my-households
router.get('/my-households', authenticateToken, (req, res) => {
    if (req.user.system_role === 'sysadmin') {
        globalDb.all(`SELECT id, name, theme, 'sysadmin' as role FROM households`, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        const sql = `SELECT h.id, h.name, h.theme, uh.role FROM households h JOIN user_households uh ON h.id = uh.household_id WHERE uh.user_id = ?`;
        globalDb.all(sql, [req.user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

// POST /households (Create)
router.post('/households', authenticateToken, (req, res) => {
    const { name, theme } = req.body;
    const themeToSave = theme || 'default';
    
    globalDb.run(`INSERT INTO households (name, theme) VALUES (?, ?)`, [name, themeToSave], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const householdId = this.lastID;
        
        globalDb.run(`INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)`, 
            [req.user.id, householdId, 'admin']);

        const hhDb = getHouseholdDb(householdId);
        hhDb.serialize(() => {
            hhDb.run(`CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                name TEXT NOT NULL, 
                type TEXT DEFAULT 'adult', 
                notes TEXT,
                alias TEXT, dob TEXT, species TEXT, gender TEXT
            )`);
        });
        hhDb.close(); 
        res.json({ message: "Household created", householdId, name });
    });
});

// PUT /households/:id (Update)
router.put('/households/:id', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const { name, theme } = req.body;
    let fields = []; let values = [];
    if (name) { fields.push('name = ?'); values.push(name); }
    if (theme) { fields.push('theme = ?'); values.push(theme); }
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    
    values.push(req.params.id);
    const sql = `UPDATE households SET ${fields.join(', ')} WHERE id = ?`;
    
    globalDb.run(sql, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Household updated" });
    });
});

// 🔴 DELETE /households/:id (The Tidy Up Button)
router.delete('/households/:id', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const householdId = req.params.id;

    globalDb.run(`DELETE FROM households WHERE id = ?`, [householdId], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        globalDb.run(`DELETE FROM user_households WHERE household_id = ?`, [householdId]);

        // Delete the physical SQLite file from the Pi
        const hhDbPath = path.join(__dirname, '../data', `household_${householdId}.db`);
        if (fs.existsSync(hhDbPath)) {
            try { fs.unlinkSync(hhDbPath); } catch (e) { console.error("File delete failed", e); }
        }

        res.json({ message: "Household deleted" });
    });
});

// ==========================================
// 👥 USER ALLOCATION
// ==========================================

router.post('/households/:id/users', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const householdId = req.params.id;
    const { username, role } = req.body;
    globalDb.get("SELECT id FROM users WHERE username = ?", [username], (err, targetUser) => {
        if (err || !targetUser) return res.status(404).json({ error: "User not found" });

        const sql = `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)
                     ON CONFLICT(user_id, household_id) DO UPDATE SET role = excluded.role`;
        globalDb.run(sql, [targetUser.id, householdId, role || 'member'], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Access granted" });
        });
    });
});

router.get('/households/:id/users', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const sql = `SELECT u.id, u.username, u.email, uh.role FROM users u 
                 JOIN user_households uh ON u.id = uh.user_id WHERE uh.household_id = ?`;
    globalDb.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;