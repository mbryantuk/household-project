const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

/**
 * Multi-Tenancy Enforcement for Members:
 * All queries MUST filter by household_id and verify user context via middleware.
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

// 1. LIST MEMBERS
router.get('/households/:id/members', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.all(`SELECT * FROM members WHERE household_id = ?`, [req.hhId], (err, rows) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. GET SINGLE MEMBER
router.get('/households/:id/members/:itemId', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, (req, res) => {
    req.tenantDb.get(`SELECT * FROM members WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], (err, row) => {
        closeDb(req);
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Member not found" });
        res.json(row);
    });
});

// 3. ADD MEMBER
router.post('/households/:id/members', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
    const fields = Object.keys(req.body);
    req.body.household_id = req.hhId;
    
    const placeholders = Object.keys(req.body).join(', ');
    const qs = Object.keys(req.body).map(() => '?').join(', ');
    const values = Object.values(req.body);

    const sql = `INSERT INTO members (${placeholders}) VALUES (${qs})`;

    req.tenantDb.run(sql, values, function(err) {
        if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
        
        const memberId = this.lastID;
        const { name, dob, emoji } = req.body;

        if (dob) {
            const birthdaySql = `INSERT INTO dates (household_id, title, date, type, member_id, emoji) VALUES (?, ?, ?, 'birthday', ?, ?)`;
            req.tenantDb.run(birthdaySql, [req.hhId, `${name}'s Birthday`, dob, memberId, emoji || '🎂'], (bErr) => {
                closeDb(req);
                res.json({ id: memberId, ...req.body });
            });
        } else {
            closeDb(req);
            res.json({ id: memberId, ...req.body });
        }
    });
});

// 4. UPDATE MEMBER
router.put('/households/:id/members/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
    const itemId = req.params.itemId;
    const fields = Object.keys(req.body).filter(f => f !== 'id' && f !== 'household_id');
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f]);

    const sql = `UPDATE members SET ${sets} WHERE id = ? AND household_id = ?`;

    req.tenantDb.run(sql, [...values, itemId, req.hhId], function(err) {
        if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
        if (this.changes === 0) { closeDb(req); return res.status(404).json({ error: "Member not found" }); }

        // Sync Birthday
        const { name, dob, emoji } = req.body;
        if (dob && name) {
            req.tenantDb.get(`SELECT id FROM dates WHERE member_id = ? AND type = 'birthday' AND household_id = ?`, [itemId, req.hhId], (sErr, row) => {
                if (row) {
                    req.tenantDb.run(`UPDATE dates SET title = ?, date = ?, emoji = ? WHERE id = ?`, [`${name}'s Birthday`, dob, emoji || '🎂', row.id], () => closeDb(req));
                } else {
                    req.tenantDb.run(`INSERT INTO dates (household_id, title, date, type, member_id, emoji) VALUES (?, ?, ?, 'birthday', ?, ?)`, 
                        [req.hhId, `${name}'s Birthday`, dob, itemId, emoji || '🎂'], () => closeDb(req));
                }
            });
        } else {
            closeDb(req);
        }
        res.json({ message: "Updated" });
    });
});

// 5. DELETE MEMBER
router.delete('/households/:id/members/:itemId', authenticateToken, requireHouseholdRole('admin'), useTenantDb, (req, res) => {
    req.tenantDb.run(`DELETE FROM members WHERE id = ? AND household_id = ?`, [req.params.itemId, req.hhId], function(err) {
        if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
        // Also delete their birthday
        req.tenantDb.run(`DELETE FROM dates WHERE member_id = ? AND type = 'birthday' AND household_id = ?`, [req.params.itemId, req.hhId], () => {
            closeDb(req);
            res.json({ message: "Deleted" });
        });
    });
});

module.exports = router;