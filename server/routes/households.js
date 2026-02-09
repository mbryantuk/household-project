const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { globalDb, getHouseholdDb, dbGet, dbRun, dbAll } = require('../db');
const { authenticateToken, requireHouseholdRole, requireSystemRole } = require('../middleware/auth');
const { listBackups, createBackup, cleanOldBackups, restoreBackup, BACKUP_DIR, DATA_DIR } = require('../services/backup');

/**
 * POST /households
 * Create a new household. Only allowed for users.
 */
router.post('/households', authenticateToken, async (req, res) => {
    const { name, is_test } = req.body;
    if (!name) return res.status(400).json({ error: "Household name is required" });

    const finalIsTest = (is_test || process.env.NODE_ENV === 'test') ? 1 : 0;

    try {
        const hhResult = await dbRun(globalDb, 
            `INSERT INTO households (name, is_test) VALUES (?, ?)`, 
            [name, finalIsTest]
        );
        const householdId = hhResult.id;

        await dbRun(globalDb,
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')`,
            [req.user.id, householdId]
        );

        // Track as last accessed
        await dbRun(globalDb, `UPDATE users SET last_household_id = ? WHERE id = ?`, [householdId, req.user.id]);

        const hhDb = getHouseholdDb(householdId);
        hhDb.close();

        res.status(201).json({ id: householdId, name });
    } catch (err) {
        console.error("Create Household Error:", err);
        res.status(500).json({ error: "Failed to create household: " + err.message });
    }
});

router.get('/households/:id', authenticateToken, requireHouseholdRole('viewer'), (req, res) => {
    globalDb.get(`SELECT * FROM households WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Household not found" });
        res.json(row);
    });
});

router.put('/households/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const householdId = parseInt(req.params.id);
    const { 
        name, address_street, address_city, address_zip,
        date_format, currency, decimals, avatar,
        auto_backup, backup_retention, enabled_modules,
        metadata_schema
    } = req.body;
    
    let fields = []; let values = [];
    if (name) { fields.push('name = ?'); values.push(name); }
    if (address_street !== undefined) { fields.push('address_street = ?'); values.push(address_street); }
    if (address_city !== undefined) { fields.push('address_city = ?'); values.push(address_city); }
    if (address_zip !== undefined) { fields.push('address_zip = ?'); values.push(address_zip); }
    if (date_format) { fields.push('date_format = ?'); values.push(date_format); }
    if (currency) { fields.push('currency = ?'); values.push(currency); }
    if (decimals !== undefined) { fields.push('decimals = ?'); values.push(decimals); }
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    if (auto_backup !== undefined) { fields.push('auto_backup = ?'); values.push(auto_backup ? 1 : 0); }
    if (backup_retention !== undefined) { fields.push('backup_retention = ?'); values.push(parseInt(backup_retention)); }
    if (enabled_modules !== undefined) { fields.push('enabled_modules = ?'); values.push(enabled_modules); }
    if (metadata_schema !== undefined) { fields.push('metadata_schema = ?'); values.push(metadata_schema); }
    
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    
    values.push(householdId);
    const sql = `UPDATE households SET ${fields.join(', ')} WHERE id = ?`;
    
    globalDb.run(sql, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Household updated" });
    });
});

/**
 * DELETE /households/:id
 * Destroy a household and all associated traces (DB, backups, links).
 * Accessible by Household Admin or System Admin.
 */
router.delete('/households/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const householdId = parseInt(req.params.id);
    try {
        // 1. Clean up Global DB references
        await dbRun(globalDb, `DELETE FROM user_households WHERE household_id = ?`, [householdId]);
        await dbRun(globalDb, `DELETE FROM households WHERE id = ?`, [householdId]);

        // 2. Nullify User pointers
        await dbRun(globalDb, `UPDATE users SET default_household_id = NULL WHERE default_household_id = ?`, [householdId]);
        await dbRun(globalDb, `UPDATE users SET last_household_id = NULL WHERE last_household_id = ?`, [householdId]);

        // 3. Delete Tenant Database File
        const hhDbPath = path.join(DATA_DIR, `household_${householdId}.db`);
        if (fs.existsSync(hhDbPath)) {
            try { 
                fs.unlinkSync(hhDbPath); 
            } catch (e) { 
                console.error(`[Cleanup] Failed to delete DB file for HH ${householdId}:`, e.message); 
            }
        }

        // 4. Delete Backup Files
        try {
            if (fs.existsSync(BACKUP_DIR)) {
                const files = fs.readdirSync(BACKUP_DIR);
                const backups = files.filter(f => f.startsWith(`household-${householdId}-`));
                backups.forEach(f => {
                    fs.unlinkSync(path.join(BACKUP_DIR, f));
                });
                if (backups.length > 0) console.log(`[Cleanup] Deleted ${backups.length} backup files for HH ${householdId}`);
            }
        } catch (e) {
            console.error(`[Cleanup] Failed to delete backups for HH ${householdId}:`, e.message);
        }

        res.json({ message: "Household and all traces destroyed." });
    } catch (err) {
        console.error(`[Destruction Error] HH ${householdId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /households/:id/select
 * Persist the last household the user accessed.
 */
router.post('/households/:id/select', authenticateToken, async (req, res) => {
    const householdId = parseInt(req.params.id);
    try {
        // Verify user belongs to this household
        const link = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND household_id = ? AND is_active = 1`, [req.user.id, householdId]);
        if (!link) return res.status(403).json({ error: "Access denied to this household" });

        await dbRun(globalDb, `UPDATE users SET last_household_id = ? WHERE id = ?`, [householdId, req.user.id]);
        res.json({ message: "Preference updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/households/:id/users', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const sql = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.avatar, uh.role, uh.is_active 
        FROM users u
        JOIN user_households uh ON u.id = uh.user_id
        WHERE uh.household_id = ?
    `;
    globalDb.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/households/:id/users', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const householdId = req.params.id;
    const { email, role, firstName, lastName, first_name, last_name, avatar, password, is_test } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    const finalFirstName = firstName || first_name || '';
    const finalLastName = lastName || last_name || '';
    const finalIsTest = (is_test || process.env.NODE_ENV === 'test') ? 1 : 0;

    try {
        let user = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        let userId;
        let generatedPassword = null;

        if (user) {
            userId = user.id;
            const existingLink = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND household_id = ?`, [userId, householdId]);
            if (existingLink) return res.status(409).json({ error: "User already in household" });
        } else {
            generatedPassword = password || Array(12).fill("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*")
                .map(x => x[Math.floor(crypto.randomInt(0, x.length))]).join('');
            
            const hash = bcrypt.hashSync(generatedPassword, 8);
            const result = await dbRun(globalDb, 
                `INSERT INTO users (email, password_hash, first_name, last_name, avatar, system_role, is_test, is_active) VALUES (?, ?, ?, ?, ?, 'user', ?, 1)`,
                [email, hash, finalFirstName, finalLastName, avatar || null, finalIsTest]
            );
            userId = result.id;
        }

        await dbRun(globalDb, 
            `INSERT INTO user_households (user_id, household_id, role, is_active) VALUES (?, ?, ?, 1)`,
            [userId, householdId, role || 'member']
        );
        
        res.json({ message: "User added to household", userId, generatedPassword });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/households/:id/users/:userId', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const { id: householdId, userId } = req.params;
    const { role, firstName, lastName, first_name, last_name, avatar, email } = req.body;

    try {
        // 1. Update Household Role if provided
        if (role) {
            await dbRun(globalDb, `UPDATE user_households SET role = ? WHERE user_id = ? AND household_id = ?`, [role, userId, householdId]);
        }

        // 2. Update Global User Info if provided
        let uFields = []; let uValues = [];
        const fName = first_name || firstName;
        const lName = last_name || lastName;

        if (fName !== undefined) { uFields.push('first_name = ?'); uValues.push(fName); }
        if (lName !== undefined) { uFields.push('last_name = ?'); uValues.push(lName); }
        if (avatar !== undefined) { uFields.push('avatar = ?'); uValues.push(avatar); }
        if (email !== undefined) { uFields.push('email = ?'); uValues.push(email); }

        if (uFields.length > 0) {
            uValues.push(userId);
            await dbRun(globalDb, `UPDATE users SET ${uFields.join(', ')} WHERE id = ?`, uValues);
        }

        res.json({ message: "User updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/households/:id/backups', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    try {
        const backups = await listBackups(req.params.id);
        res.json(backups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/households/:id/backups', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    try {
        const householdId = req.params.id;
        
        // Fetch metadata for manifest
        const household = await dbGet(globalDb, "SELECT * FROM households WHERE id = ?", [householdId]);
        const users = await dbAll(globalDb, `
            SELECT u.email, u.first_name, u.last_name, uh.role 
            FROM users u
            JOIN user_households uh ON u.id = uh.user_id
            WHERE uh.household_id = ?
        `, [householdId]);

        const manifest = {
            version: "1.0",
            exported_at: new Date().toISOString(),
            household,
            users,
            type: 'household_export'
        };

        const filename = await createBackup(householdId, manifest);
        res.json({ message: "Household backup created", filename });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
