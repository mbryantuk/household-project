const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/crypto');

/**
 * Multi-Tenancy Enforcement for Members:
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

        // Decrypt PII before processing
        rows.forEach(member => {
            member.dob = decrypt(member.dob);
            member.will_details = decrypt(member.will_details);
            member.life_insurance_provider = decrypt(member.life_insurance_provider);

            if (member.type === 'child' && member.dob) {
                const birthDate = new Date(member.dob);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                if (age >= 18) {
                    member.type = 'adult';
                    updates.push(new Promise((resolve) => {
                        req.tenantDb.run(`UPDATE members SET type = 'adult' WHERE id = ?`, [member.id], () => resolve());
                    }));
                }
            }
        });

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
        
        // Decrypt PII
        row.dob = decrypt(row.dob);
        row.will_details = decrypt(row.will_details);
        row.life_insurance_provider = decrypt(row.life_insurance_provider);
        
        res.json(row);
    });
});

// 3. ADD MEMBER
router.post('/households/:id/members', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    req.tenantDb.all(`PRAGMA table_info(members)`, [], (pErr, cols) => {
        if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
        
        const validColumns = cols.map(c => c.name);
        
        // Name logic
        if (!req.body.name && req.body.first_name) {
            req.body.name = [req.body.first_name, req.body.middle_name, req.body.last_name].filter(Boolean).join(' ');
        } else if (req.body.name && !req.body.first_name) {
            const parts = req.body.name.trim().split(' ');
            if (parts.length === 1) req.body.first_name = parts[0];
            else if (parts.length === 2) { req.body.first_name = parts[0]; req.body.last_name = parts[1]; }
            else {
                req.body.first_name = parts[0];
                req.body.last_name = parts[parts.length - 1];
                req.body.middle_name = parts.slice(1, -1).join(' ');
            }
        }

        const data = { ...req.body, household_id: req.hhId };
        
        // Encrypt PII
        if (data.dob) data.dob = encrypt(data.dob);
        if (data.will_details) data.will_details = encrypt(data.will_details);
        if (data.life_insurance_provider) data.life_insurance_provider = encrypt(data.life_insurance_provider);
        
        const insertData = {};
        Object.keys(data).forEach(key => {
            if (validColumns.includes(key) && key !== 'id') {
                insertData[key] = data[key];
            }
        });

        const fields = Object.keys(insertData);
        const placeholders = fields.join(', ');
        const qs = fields.map(() => '?').join(', ');
        const values = Object.values(insertData);

        const sql = `INSERT INTO members (${placeholders}) VALUES (${qs})`;

        req.tenantDb.run(sql, values, function(err) {
            if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
            
            const memberId = this.lastID;
            const { name, dob, emoji } = data;
            const rawDob = decrypt(dob);

            if (rawDob) {
                const birthdaySql = `INSERT INTO dates (household_id, title, date, type, member_id, emoji) VALUES (?, ?, ?, 'birthday', ?, ?)`;
                req.tenantDb.run(birthdaySql, [req.hhId, `${name}'s Birthday`, rawDob, memberId, emoji || '🎂'], (bErr) => {
                    closeDb(req);
                    res.json({ id: memberId, ...insertData, dob: rawDob });
                });
            } else {
                closeDb(req);
                res.json({ id: memberId, ...insertData });
            }
        });
    });
});

// 4. UPDATE MEMBER
router.put('/households/:id/members/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
    const itemId = req.params.itemId;

    req.tenantDb.all(`PRAGMA table_info(members)`, [], (pErr, cols) => {
        if (pErr) { closeDb(req); return res.status(500).json({ error: pErr.message }); }
        const validColumns = cols.map(c => c.name);

        if (req.body.first_name || req.body.last_name) {
            req.body.name = [req.body.first_name, req.body.middle_name, req.body.last_name].filter(Boolean).join(' ');
        }

        const data = { ...req.body };

        // Encrypt PII
        if (data.dob) data.dob = encrypt(data.dob);
        if (data.will_details) data.will_details = encrypt(data.will_details);
        if (data.life_insurance_provider) data.life_insurance_provider = encrypt(data.life_insurance_provider);

        const updateData = {};
        Object.keys(data).forEach(key => {
            if (validColumns.includes(key) && key !== 'id' && key !== 'household_id') {
                updateData[key] = data[key];
            }
        });

        const fields = Object.keys(updateData);
        if (fields.length === 0) { closeDb(req); return res.status(400).json({ error: "No valid fields to update" }); }

        const sets = fields.map(f => `${f} = ?`).join(', ');
        const values = Object.values(updateData);

        const sql = `UPDATE members SET ${sets} WHERE id = ? AND household_id = ?`;

        req.tenantDb.run(sql, [...values, itemId, req.hhId], function(err) {
            if (err) { closeDb(req); return res.status(500).json({ error: err.message }); }
            if (this.changes === 0) { closeDb(req); return res.status(404).json({ error: "Member not found" }); }

            // Sync Birthday
            const { name, dob, emoji } = data;
            const rawDob = decrypt(dob);

            if (rawDob || name) {
                const newTitle = name ? `${name}'s Birthday` : null;
                
                req.tenantDb.get(`SELECT id, title FROM dates WHERE member_id = ? AND type = 'birthday' AND household_id = ?`, [itemId, req.hhId], (sErr, row) => {
                    if (row) {
                        const updateEmoji = emoji || '🎂';
                        let updateSql = `UPDATE dates SET emoji = ?`;
                        let updateParams = [updateEmoji];
                        if (newTitle) { updateSql += `, title = ?`; updateParams.push(newTitle); }
                        if (rawDob) { updateSql += `, date = ?`; updateParams.push(rawDob); }
                        updateSql += ` WHERE id = ?`;
                        updateParams.push(row.id);
                        req.tenantDb.run(updateSql, updateParams, () => closeDb(req));
                    } else if (rawDob && name) {
                        req.tenantDb.run(`INSERT INTO dates (household_id, title, date, type, member_id, emoji) VALUES (?, ?, ?, 'birthday', ?, ?)`, 
                            [req.hhId, `${name}'s Birthday`, rawDob, itemId, emoji || '🎂'], () => closeDb(req));
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
});

// 5. DELETE MEMBER
router.delete('/households/:id/members/:itemId', authenticateToken, requireHouseholdRole('member'), useTenantDb, (req, res) => {
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