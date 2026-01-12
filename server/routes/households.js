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
    // Ensure admin is in the right house
    if (req.user.system_role !== 'sysadmin' && parseInt(req.user.householdId) !== parseInt(req.params.id)) return res.sendStatus(403);

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
        const hhDbPath = path.join(DATA_DIR, `household_${householdId}.db`);
        if (fs.existsSync(hhDbPath)) {
            try { fs.unlinkSync(hhDbPath); } catch (e) { console.error("File delete failed", e); }
        }

        res.json({ message: "Household deleted" });
    });
});

// ==========================================
// 👥 USER ALLOCATION (Global SaaS)
// ==========================================

// GET /households/:id/users (List Users linked to Household)
router.get('/households/:id/users', authenticateToken, requireHouseholdRole('member'), (req, res) => {
    const householdId = req.params.id;
    if (req.user.system_role !== 'sysadmin' && parseInt(req.user.householdId) !== parseInt(householdId)) return res.sendStatus(403);

    const sql = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.avatar, uh.role 
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
        // 1. Check if user exists globally
        let user = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        let userId;

        if (user) {
            userId = user.id;
            // Check if already in household
            const existingLink = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND household_id = ?`, [userId, householdId]);
            if (existingLink) return res.status(409).json({ error: "User already in household" });
        } else {
            // 2. Create new user if not exists
            const initialPassword = password || crypto.randomBytes(4).toString('hex');
            const hash = bcrypt.hashSync(initialPassword, 8);
            
            const result = await dbRun(globalDb, 
                `INSERT INTO users (email, password_hash, first_name, last_name, system_role) VALUES (?, ?, ?, ?, 'user')`,
                [email, hash, firstName || '', lastName || '']
            );
            userId = result.id;
            
            if (!password) {
                // TODO: In a real app, send email with initialPassword
                console.log(`[Invited User] ${email} created with auto-password: ${initialPassword}`);
            }
        }

        // 3. Link to Household
        await dbRun(globalDb, 
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)`,
            [userId, householdId, role || 'member']
        );

        res.json({ message: "User added to household", userId });

    } catch (err) {
        console.error("Add User Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /households/:id/users/:userId (Remove User from Household)
router.delete('/households/:id/users/:userId', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const householdId = req.params.id;
    const userId = req.params.userId;

    // Prevent removing yourself (optional, but good practice)
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
// 💾 BACKUP & RESTORE (Household Scoped)
// ==========================================

// GET /households/:id/backups - List backups for this house
router.get('/households/:id/backups', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    try {
        const backups = await listBackups(req.params.id);
        res.json(backups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /households/:id/backups/trigger - Create backup for this house
router.post('/households/:id/backups/trigger', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    try {
        const filename = await createBackup(req.params.id);
        res.json({ message: "Household backup created", filename });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /households/:id/backups/download/:filename
router.get('/households/:id/backups/download/:filename', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const filename = req.params.filename;
    // Security: Ensure the user is only downloading their own household's backup
    if (!filename.startsWith(`household-${req.params.id}`)) {
        return res.status(403).json({ error: "Access denied to this backup file" });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    res.download(filePath);
});

// GET /households/:id/db/download - Direct DB Download
router.get('/households/:id/db/download', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const dbFile = `household_${req.params.id}.db`;
    const fullPath = path.join(DATA_DIR, dbFile);
    if (fs.existsSync(fullPath)) {
        res.download(fullPath, `${req.user.householdName || 'household'}_data.db`);
    } else {
        res.status(404).json({ error: "Database file not found" });
    }
});

// POST /households/:id/backups/restore - Upload and restore household DB
router.post('/households/:id/backups/restore', authenticateToken, requireHouseholdRole('admin'), upload.single('backup'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        // If it's a ZIP, use restoreBackup logic
        if (req.file.originalname.endsWith('.zip')) {
            await restoreBackup(req.file.path, req.params.id);
        } 
        // If it's a raw .db file, just move it
        else if (req.file.originalname.endsWith('.db')) {
            const targetPath = path.join(DATA_DIR, `household_${req.params.id}.db`);
            fs.copyFileSync(req.file.path, targetPath);
        } else {
            return res.status(400).json({ error: "Invalid file type. Upload .zip or .db" });
        }
        
        fs.unlinkSync(req.file.path); // Clean up temp
        res.json({ message: "Household data restored successfully." });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
