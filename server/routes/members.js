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
        if (err) {
            closeDb(req);
            return res.status(500).json({ error: err.message });
        }

        const today = new Date();
        const updates = [];

        rows.forEach(member => {
            if (member.type === 'child' && member.dob) {
                const birthDate = new Date(member.dob);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                if (age >= 18) {
                    // Promote to adult
                    member.type = 'adult';
                    updates.push(new Promise((resolve) => {
                        req.tenantDb.run(`UPDATE members SET type = 'adult' WHERE id = ?`, [member.id], () => resolve());
                    }));
                }
            }
        });

        // Wait for updates (if any) before closing, though we return early response usually ok, 
        // better to close after ensuring writes.
        if (updates.length > 0) {
            Promise.all(updates).then(() => {
                closeDb(req);
                res.json(rows);
            });
        } else {
            closeDb(req);
            res.json(rows);
        }
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
    // Construct full name if not provided but parts are
    if (!req.body.name && req.body.first_name) {
        req.body.name = [req.body.first_name, req.body.middle_name, req.body.last_name].filter(Boolean).join(' ');
    } else if (req.body.name && !req.body.first_name) {
        // Inverse: Split name if only full name provided (legacy fallback)
        const parts = req.body.name.trim().split(' ');
        if (parts.length === 1) req.body.first_name = parts[0];
        else if (parts.length === 2) { req.body.first_name = parts[0]; req.body.last_name = parts[1]; }
        else {
            req.body.first_name = parts[0];
            req.body.last_name = parts[parts.length - 1];
            req.body.middle_name = parts.slice(1, -1).join(' ');
        }
    }

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

    // Logic to sync Name parts
    if (req.body.first_name || req.body.last_name) {
        // If updating parts, update full name
        const parts = [
            req.body.first_name, 
            req.body.middle_name, 
            req.body.last_name
        ].filter(p => p !== undefined && p !== null); 
        
        // Note: This logic is imperfect because we might only be updating one field (e.g. first_name) 
        // and we need the existing other parts to reconstruct the full name.
        // For atomic updates, we should probably fetch the record first or assume the frontend sends all 3 parts.
        // The frontend WILL send all 3 parts.
        
        req.body.name = [req.body.first_name, req.body.middle_name, req.body.last_name].filter(Boolean).join(' ');
    }

    const fields = Object.keys(req.body).filter(f => f !== 'id' && f !== 'household_id');
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => req.body[f]);

    const sql = `UPDATE members SET ${sets} WHERE id = ? AND household_id = ?`;

    req.tenantDb.run(sql, [...values, itemId, req.hhId], function(err) {
        if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
        if (this.changes === 0) { closeDb(req); return res.status(404).json({ error: "Member not found" }); }

        // Sync Birthday
        const { name, dob, emoji } = req.body;
        if (dob || name) {
            // Need to handle case where name isn't in body but dob is, or vice versa. 
            // Ideally we fetch current name if missing.
            // For now, assuming frontend sends 'name' (computed above) if it changes.
            const newTitle = name ? `${name}'s Birthday` : null;
            
            req.tenantDb.get(`SELECT id, title FROM dates WHERE member_id = ? AND type = 'birthday' AND household_id = ?`, [itemId, req.hhId], (sErr, row) => {
                if (row) {
                    const updateTitle = newTitle || row.title;
                    const updateDate = dob || null; // If dob not provided, we shouldn't null it out unless intentional.
                    const updateEmoji = emoji || '🎂';
                    
                    let updateSql = `UPDATE dates SET emoji = ?`;
                    let updateParams = [updateEmoji];
                    
                    if (newTitle) { updateSql += `, title = ?`; updateParams.push(newTitle); }
                    if (dob) { updateSql += `, date = ?`; updateParams.push(dob); }
                    
                    updateSql += ` WHERE id = ?`;
                    updateParams.push(row.id);

                    req.tenantDb.run(updateSql, updateParams, () => closeDb(req));
                } else if (dob && name) {
                    req.tenantDb.run(`INSERT INTO dates (household_id, title, date, type, member_id, emoji) VALUES (?, ?, ?, 'birthday', ?, ?)`, 
                        [req.hhId, `${name}'s Birthday`, dob, itemId, emoji || '🎂'], () => closeDb(req));
                } else {
                    closeDb(req);
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