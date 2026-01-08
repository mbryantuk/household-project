const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { globalDb, getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

// GET /households/:id (Get Single Details)
router.get('/households/:id', authenticateToken, (req, res) => {
    // Security: Only allow access if user is logged into this household OR is SysAdmin
    if (req.user.system_role !== 'sysadmin' && parseInt(req.user.householdId) !== parseInt(req.params.id)) {
        return res.sendStatus(403);
    }

    globalDb.get(`SELECT * FROM households WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Household not found" });
        res.json(row);
    });
});

// PUT /households/:id (Update)
router.put('/households/:id', authenticateToken, (req, res) => {
    // Only Local Admin or SysAdmin
    if (req.user.role !== 'admin' && req.user.system_role !== 'sysadmin') return res.sendStatus(403);

    const { 
        name, theme, 
        address_street, address_city, address_zip,
        date_format, currency, decimals, avatar
    } = req.body;
    let fields = []; let values = [];
    if (name) { fields.push('name = ?'); values.push(name); }
    if (theme) { fields.push('theme = ?'); values.push(theme); }
    if (address_street !== undefined) { fields.push('address_street = ?'); values.push(address_street); }
    if (address_city !== undefined) { fields.push('address_city = ?'); values.push(address_city); }
    if (address_zip !== undefined) { fields.push('address_zip = ?'); values.push(address_zip); }
    if (date_format) { fields.push('date_format = ?'); values.push(date_format); }
    if (currency) { fields.push('currency = ?'); values.push(currency); }
    if (decimals !== undefined) { fields.push('decimals = ?'); values.push(decimals); }
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    
    values.push(req.params.id);
    const sql = `UPDATE households SET ${fields.join(', ')} WHERE id = ?`;
    
    globalDb.run(sql, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Household updated" });
    });
});

// 🔴 DELETE /households/:id
router.delete('/households/:id', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403); // Only SysAdmin can delete houses now

    const householdId = req.params.id;

    globalDb.run(`DELETE FROM households WHERE id = ?`, [householdId], function(err) {
        if (err) return res.status(500).json({ error: err.message });

        // Delete the physical SQLite file from the Pi
        const hhDbPath = path.join(__dirname, '../data', `household_${householdId}.db`);
        if (fs.existsSync(hhDbPath)) {
            try { fs.unlinkSync(hhDbPath); } catch (e) { console.error("File delete failed", e); }
        }

        res.json({ message: "Household deleted" });
    });
});

// ==========================================
// 👥 USER ALLOCATION (Local)
// ==========================================

// GET /households/:id/users (List Local Users)
router.get('/households/:id/users', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const householdId = req.params.id;
    const db = getHouseholdDb(householdId);
    
    db.all(`SELECT id, username, email, role FROM users`, [], (err, rows) => {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;