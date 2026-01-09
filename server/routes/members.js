const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

// Middleware to standardize DB initialization across all member actions
const useTenantDb = (req, res, next) => {
    const db = getHouseholdDb(req.params.id);
    req.tenantDb = db;
    next();
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
    const { name, type, notes, alias, dob, species, gender, emoji } = req.body;
    
    const sql = `INSERT INTO members (name, type, notes, alias, dob, species, gender, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, type, notes, alias, dob, species, gender, emoji];

    req.tenantDb.run(sql, params, function(err) {
        if (err) {
            req.tenantDb.close();
            return res.status(500).json({ error: err.message });
        }
        
        const memberId = this.lastID;

        // Automatically add birthday to dates table if DOB is present
        if (dob) {
            const birthdaySql = `INSERT INTO dates (title, date, type, member_id) VALUES (?, ?, ?, ?)`;
            req.tenantDb.run(birthdaySql, [`${name}'s Birthday`, dob, 'birthday', memberId], (bErr) => {
                req.tenantDb.close();
                if (bErr) console.error("Failed to auto-add birthday:", bErr.message);
                res.json({ id: memberId, ...req.body });
            });
        } else {
            req.tenantDb.close();
            res.json({ id: memberId, ...req.body });
        }
    });
});

router.put('/households/:id/members/:memberId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
    const { name, type, notes, alias, dob, species, gender, emoji } = req.body;
    const memberId = req.params.memberId;

    const sql = `
        UPDATE members 
        SET name = ?, type = ?, notes = ?, alias = ?, dob = ?, species = ?, gender = ?, emoji = ?
        WHERE id = ?
    `;
    const params = [name, type, notes, alias, dob, species, gender, emoji, memberId];

    req.tenantDb.run(sql, params, function(err) {
        if (err) {
            req.tenantDb.close();
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            req.tenantDb.close();
            return res.status(404).json({ error: "Member not found" });
        }

        // Sync Birthday in dates table
        if (dob) {
            // Check if birthday already exists
            req.tenantDb.get(`SELECT id FROM dates WHERE member_id = ? AND type = 'birthday'`, [memberId], (sErr, row) => {
                if (row) {
                    req.tenantDb.run(`UPDATE dates SET title = ?, date = ? WHERE id = ?`, [`${name}'s Birthday`, dob, row.id], () => {
                        req.tenantDb.close();
                        res.json({ message: "Member and Birthday updated", id: memberId, ...req.body });
                    });
                } else {
                    req.tenantDb.run(`INSERT INTO dates (title, date, type, member_id) VALUES (?, ?, ?, ?)`, [`${name}'s Birthday`, dob, 'birthday', memberId], () => {
                        req.tenantDb.close();
                        res.json({ message: "Member updated, Birthday created", id: memberId, ...req.body });
                    });
                }
            });
        } else {
            // Remove birthday if DOB was cleared
            req.tenantDb.run(`DELETE FROM dates WHERE member_id = ? AND type = 'birthday'`, [memberId], () => {
                req.tenantDb.close();
                res.json({ message: "Member updated, Birthday removed", id: memberId, ...req.body });
            });
        }
    });
});
module.exports = router;