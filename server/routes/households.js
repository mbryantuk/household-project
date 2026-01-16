const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { globalDb, getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole, requireSystemRole } = require('../middleware/auth');
const { listBackups, createBackup, restoreBackup, BACKUP_DIR, DATA_DIR } = require('../services/backup');

// Upload middleware for restores
const upload = multer({ dest: path.join(__dirname, '../data/temp_uploads/') });

// HELPER: Promisify DB get
const dbGet = (db, sql, params) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

// HELPER: Promisify DB run
const dbRun = (db, sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        err ? reject(err) : resolve({ id: this.lastID, changes: this.changes });
    });
});

/**
 * POST /households
 * Create a new household. Only allowed for users.
 */
router.post('/households', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Household name is required" });

    try {
        // 1. Create Household record in Global DB
        const hhResult = await dbRun(globalDb, 
            `INSERT INTO households (name) VALUES (?)`, 
            [name]
        );
        const householdId = hhResult.id;

        // 2. Link User as Admin of this household
        await dbRun(globalDb,
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')`,
            [req.user.id, householdId]
        );

        // 3. Initialize Household DB file and schema
        const hhDb = getHouseholdDb(householdId);
        hhDb.close();

        res.status(201).json({ id: householdId, name });

    } catch (err) {
        console.error("Create Household Error:", err);
        res.status(500).json({ error: "Failed to create household: " + err.message });
    }
});

// GET /households/:id
router.get('/households/:id', authenticateToken, requireHouseholdRole('viewer'), (req, res) => {
    globalDb.get(`SELECT * FROM households WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Household not found" });
        res.json(row);
    });
});

// PUT /households/:id (Update) - Admin only
router.put('/households/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const householdId = parseInt(req.params.id);
    const { 
        name, address_street, address_city, address_zip,
        date_format, currency, decimals, avatar,
        auto_backup, backup_retention, enabled_modules
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
    
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    
    values.push(householdId);
    const sql = `UPDATE households SET ${fields.join(', ')} WHERE id = ?`;
    
    globalDb.run(sql, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Household updated" });
    });
});

// DELETE /households/:id - Admin only
router.delete('/households/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const householdId = parseInt(req.params.id);

    try {
        await dbRun(globalDb, `DELETE FROM user_households WHERE household_id = ?`, [householdId]);
        await dbRun(globalDb, `DELETE FROM households WHERE id = ?`, [householdId]);

        const hhDbPath = path.join(DATA_DIR, `household_${householdId}.db`);
        if (fs.existsSync(hhDbPath)) {
            try { fs.unlinkSync(hhDbPath); } catch (e) { console.error("File delete failed", e); }
        }

        res.json({ message: "Household deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 👥 USER ALLOCATION
// ==========================================

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
    const { email, role, firstName, lastName, password } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        let user = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        let userId;

        if (user) {
            userId = user.id;
            const existingLink = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND household_id = ?`, [userId, householdId]);
            if (existingLink) return res.status(409).json({ error: "User already in household" });
        } else {
            const initialPassword = password || crypto.randomBytes(4).toString('hex');
            const hash = bcrypt.hashSync(initialPassword, 8);
            const result = await dbRun(globalDb, 
                `INSERT INTO users (email, password_hash, first_name, last_name, system_role) VALUES (?, ?, ?, ?, 'user')`,
                [email, hash, firstName || '', lastName || '']
            );
            userId = result.id;
        }

        await dbRun(globalDb, 
            `INSERT INTO user_households (user_id, household_id, role, is_active) VALUES (?, ?, ?, 1)`,
            [userId, householdId, role || 'member']
        );
        res.json({ message: "User added to household", userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/households/:id/users/:userId', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const { id: householdId, userId } = req.params;
    const { role, is_active } = req.body;

    try {
        let linkFields = []; let linkValues = [];
        if (role) { linkFields.push('role = ?'); linkValues.push(role); }
        if (is_active !== undefined) { linkFields.push('is_active = ?'); linkValues.push(is_active ? 1 : 0); }

        if (linkFields.length > 0) {
            linkValues.push(userId, householdId);
            await dbRun(globalDb, `UPDATE user_households SET ${linkFields.join(', ')} WHERE user_id = ? AND household_id = ?`, linkValues);
        }
        res.json({ message: "User updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/households/:id/users/:userId', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    if (parseInt(req.params.userId) === req.user.id) {
        return res.status(400).json({ error: "Cannot remove yourself. Leave household instead." });
    }
    try {
        await dbRun(globalDb, `DELETE FROM user_households WHERE user_id = ? AND household_id = ?`, [req.params.userId, req.params.id]);
        res.json({ message: "User removed from household" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 💾 BACKUP & RESTORE
// ==========================================

router.get('/households/:id/backups', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    try {
        const backups = await listBackups(req.params.id);
        res.json(backups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/households/:id/backups/trigger', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    try {
        const filename = await createBackup(req.params.id);
        res.json({ message: "Household backup created", filename });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
