const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { globalDb, getHouseholdDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
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
 * Create a new household for existing user
 */
router.post('/households', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Household name is required" });

    try {
        const accessKey = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        // 1. Create Household
        const hhResult = await dbRun(globalDb, 
            `INSERT INTO households (name, access_key, theme) VALUES (?, ?, 'default')`, 
            [name, accessKey]
        );
        const householdId = hhResult.id;

        // 2. Link User as Admin
        await dbRun(globalDb,
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')`,
            [req.user.id, householdId]
        );

        // 3. Initialize Household DB (by just getting it)
        const hhDb = getHouseholdDb(householdId);
        hhDb.close();

        res.status(201).json({ id: householdId, name, access_key: accessKey });

    } catch (err) {
        console.error("Create Household Error:", err);
        res.status(500).json({ error: "Failed to create household: " + err.message });
    }
});

// GET /households/:id (Get Single Details)
router.get('/households/:id', authenticateToken, (req, res) => {
    const householdId = parseInt(req.params.id);
    
    // Check user_households directly to allow access if admin even if not in current context
    globalDb.get("SELECT role FROM user_households WHERE user_id = ? AND household_id = ?", [req.user.id, householdId], (err, link) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!link) return res.sendStatus(403);

        globalDb.get(`SELECT * FROM households WHERE id = ?`, [householdId], (hErr, row) => {
            if (hErr) return res.status(500).json({ error: hErr.message });
            if (!row) return res.status(404).json({ error: "Household not found" });
            res.json(row);
        });
    });
});

// PUT /households/:id (Update)
router.put('/households/:id', authenticateToken, async (req, res) => {
    const householdId = parseInt(req.params.id);
    const link = await dbGet(globalDb, "SELECT role FROM user_households WHERE user_id = ? AND household_id = ?", [req.user.id, householdId]);
    
    if (!link || link.role !== 'admin') return res.sendStatus(403);

    const { 
        name, theme, 
        address_street, address_city, address_zip,
        date_format, currency, decimals, avatar,
        auto_backup, backup_retention
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
    if (auto_backup !== undefined) { fields.push('auto_backup = ?'); values.push(auto_backup ? 1 : 0); }
    if (backup_retention !== undefined) { fields.push('backup_retention = ?'); values.push(parseInt(backup_retention)); }
    
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    
    values.push(householdId);
    const sql = `UPDATE households SET ${fields.join(', ')} WHERE id = ?`;
    
    globalDb.run(sql, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Household updated" });
    });
});

// 🔴 DELETE /households/:id
router.delete('/households/:id', authenticateToken, async (req, res) => {
    const householdId = parseInt(req.params.id);
    const link = await dbGet(globalDb, "SELECT role FROM user_households WHERE user_id = ? AND household_id = ?", [req.user.id, householdId]);
    
    if (!link || link.role !== 'admin') return res.sendStatus(403);

    try {
        // 1. Delete all user links first (Referential integrity)
        await dbRun(globalDb, `DELETE FROM user_households WHERE household_id = ?`, [householdId]);

        // 2. Delete the household record
        await dbRun(globalDb, `DELETE FROM households WHERE id = ?`, [householdId]);

        // 3. Delete the physical SQLite file
        const hhDbPath = path.join(DATA_DIR, `household_${householdId}.db`);
        if (fs.existsSync(hhDbPath)) {
            try { fs.unlinkSync(hhDbPath); } catch (e) { console.error("File delete failed", e); }
        }

        res.json({ message: "Household deleted" });
    } catch (err) {
        console.error("Delete Household Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 👥 USER ALLOCATION (Global SaaS)
// ==========================================

// GET /households/:id/users (List Users linked to Household)
router.get('/households/:id/users', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const householdId = req.params.id;

    const sql = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.avatar, uh.role, uh.is_active 
        FROM users u
        JOIN user_households uh ON u.id = uh.user_id
        WHERE uh.household_id = ?
    `;

    globalDb.all(sql, [householdId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /households/:id/users (Invite/Add User)
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
        console.error("Add User Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /households/:id/users/:userId (Update user in household + Activation toggle)
router.put('/households/:id/users/:userId', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const { id: householdId, userId } = req.params;
    const { email, role, first_name, last_name, firstName, lastName, password, avatar, is_active } = req.body;

    try {
        // 1. Update Global User Info
        let fields = []; let values = [];
        if (email) { fields.push('email = ?'); values.push(email); }
        if (password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 8)); }
        
        const fName = first_name || firstName;
        const lName = last_name || lastName;
        if (fName) { fields.push('first_name = ?'); values.push(fName); }
        if (lName) { fields.push('last_name = ?'); values.push(lName); }
        if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }

        if (fields.length > 0) {
            values.push(userId);
            await dbRun(globalDb, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        }

        // 2. Update Household Role and Activation
        let linkFields = []; let linkValues = [];
        if (role) { linkFields.push('role = ?'); linkValues.push(role); }
        if (is_active !== undefined) { linkFields.push('is_active = ?'); linkValues.push(is_active ? 1 : 0); }

        if (linkFields.length > 0) {
            linkValues.push(userId, householdId);
            await dbRun(globalDb, `UPDATE user_households SET ${linkFields.join(', ')} WHERE user_id = ? AND household_id = ?`, linkValues);
        }

        res.json({ message: "User updated successfully" });

    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /households/:id/users/:userId
router.delete('/households/:id/users/:userId', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const householdId = req.params.id;
    const userId = req.params.userId;

    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: "Cannot remove yourself. Leave household instead." });
    }

    try {
        await dbRun(globalDb, `DELETE FROM user_households WHERE user_id = ? AND household_id = ?`, [userId, householdId]);
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

router.get('/households/:id/backups/download/:filename', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const filename = req.params.filename;
    if (!filename.startsWith(`household-${req.params.id}`)) {
        return res.status(403).json({ error: "Access denied to this backup file" });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    res.download(filePath);
});

router.get('/households/:id/db/download', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const dbFile = `household_${req.params.id}.db`;
    const fullPath = path.join(DATA_DIR, dbFile);
    if (fs.existsSync(fullPath)) {
        res.download(fullPath, `totem_data.db`);
    } else {
        res.status(404).json({ error: "Database file not found" });
    }
});

router.post('/households/:id/backups/restore', authenticateToken, requireHouseholdRole('admin'), upload.single('backup'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        if (req.file.originalname.endsWith('.zip')) {
            await restoreBackup(req.file.path, req.params.id);
        } else if (req.file.originalname.endsWith('.db')) {
            const targetPath = path.join(DATA_DIR, `household_${req.params.id}.db`);
            fs.copyFileSync(req.file.path, targetPath);
        } else {
            return res.status(400).json({ error: "Invalid file type. Upload .zip or .db" });
        }
        
        fs.unlinkSync(req.file.path);
        res.json({ message: "Household data restored successfully." });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;