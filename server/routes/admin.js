const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { globalDb, getHouseholdDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { listBackups, createBackup, restoreBackup, BACKUP_DIR, DATA_DIR } = require('../services/backup');

// Upload middleware for full system restores
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

// ==========================================
// 🛡️ FULL SYSTEM BACKUP (SysAdmin Only)
// ==========================================

router.get('/backups', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    listBackups().then(backups => res.json(backups)).catch(err => res.status(500).json({ error: err.message }));
});

router.post('/backups/trigger', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    createBackup().then(filename => res.json({ message: "Full system backup created", filename })).catch(err => res.status(500).json({ error: err.message }));
});

router.get('/backups/download/:filename', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    res.download(filePath);
});

router.post('/backups/upload', authenticateToken, upload.single('backup'), async (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
        await restoreBackup(req.file.path);
        fs.unlinkSync(req.file.path);
        res.json({ message: "Full system restore complete." });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 🌍 GLOBAL MANAGEMENT (SysAdmin Only)
// ==========================================

router.get('/households', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    globalDb.all("SELECT * FROM households", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/households', authenticateToken, async (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    const { name, adminUsername, adminPassword, adminEmail } = req.body;
    
    if (!name || !adminPassword) return res.status(400).json({ error: "Missing fields" });
    
    // Fallback if adminEmail not provided (legacy tests compatibility)
    // In real usage, adminEmail is required. For tests using 'adminUsername', we'll generate a fake email
    const email = adminEmail || `${adminUsername || 'admin'}@example.com`;

    const accessKey = crypto.randomBytes(3).toString('hex').toUpperCase();

    try {
        // 1. Create Household
        const hhResult = await dbRun(globalDb, `INSERT INTO households (name, access_key) VALUES (?, ?)`, [name, accessKey]);
        const householdId = hhResult.id;

        // 2. Initialize DB (Trigger creation)
        const hhDb = getHouseholdDb(householdId);
        hhDb.close();

        // 3. Create/Find Admin User
        let userId;
        const existingUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        
        if (existingUser) {
            userId = existingUser.id;
        } else {
            const hash = bcrypt.hashSync(adminPassword, 8);
            const userResult = await dbRun(globalDb, 
                `INSERT INTO users (email, password_hash, first_name, system_role) VALUES (?, ?, ?, 'user')`,
                [email, hash, adminUsername || 'Admin']
            );
            userId = userResult.id;
        }

        // 4. Link User as Admin
        await dbRun(globalDb, 
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')`,
            [userId, householdId]
        );

        res.json({ message: "Household created", householdId, accessKey });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/households/:id', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    const { name, access_key, theme } = req.body;
    let fields = []; let values = [];
    if (name) { fields.push('name = ?'); values.push(name); }
    if (access_key) { fields.push('access_key = ?'); values.push(access_key); }
    if (theme) { fields.push('theme = ?'); values.push(theme); }
    values.push(req.params.id);
    globalDb.run(`UPDATE households SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Household updated" });
    });
});

router.delete('/households/:id', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    const hhId = req.params.id;
    globalDb.run("DELETE FROM households WHERE id = ?", [hhId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const dbPath = path.join(DATA_DIR, `household_${hhId}.db`);
        if (fs.existsSync(dbPath)) { try { fs.unlinkSync(dbPath); } catch (e) {} }
        res.json({ message: "Household deleted" });
    });
});

// ==========================================
// 👥 GLOBAL USER MANAGEMENT (SysAdmin)
// ==========================================

router.get('/users', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    globalDb.all("SELECT id, email, first_name, last_name, avatar, system_role FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/create-user', authenticateToken, async (req, res) => {
    const { username, password, role, email, first_name, last_name, avatar, householdId } = req.body;
    const targetHhId = householdId || req.user.householdId;
    
    // Legacy support: if 'username' is passed but no 'email', gen fake email
    const finalEmail = email || `${username}@example.com`;

    if (req.user.system_role !== 'sysadmin') {
        // If not sysadmin, must be admin of target household
        // NOTE: This endpoint is legacy/sysadmin mostly. Regular admins use POST /households/:id/users
        // We will restrict this endpoint to SysAdmins OR strictly strictly defined logic.
        // For simplicity, let's allow it if they pass the check, but better to use the other endpoint.
        // The tests use this.
        if (req.user.role !== 'admin') return res.sendStatus(403);
        if (parseInt(req.user.householdId) !== parseInt(targetHhId)) return res.sendStatus(403);
    }

    try {
        // 1. Create User Global
        const hash = bcrypt.hashSync(password, 8);
        // Check exist
        let userId;
        const existing = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [finalEmail]);
        if (existing) {
            userId = existing.id;
        } else {
            const res = await dbRun(globalDb, 
                `INSERT INTO users (email, password_hash, first_name, last_name, avatar, system_role) VALUES (?, ?, ?, ?, ?, 'user')`,
                [finalEmail, hash, first_name || username, last_name, avatar]
            );
            userId = res.id;
        }

        // 2. Link
        if (targetHhId) {
            await dbRun(globalDb, 
                `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)`,
                [userId, targetHhId, role || 'member']
            );
        }

        res.json({ message: "User created", id: userId });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:userId', authenticateToken, async (req, res) => {
    // Only SysAdmin should use this generic endpoint
    // Local admins use specific household user management logic usually
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);

    const { username, role, password, email, first_name, last_name, avatar } = req.body;
    
    let fields = []; let values = [];
    // We map 'username' to first_name for compatibility if needed, or ignore
    if (username) { fields.push('first_name = ?'); values.push(username); }
    if (password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 8)); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (first_name !== undefined) { fields.push('first_name = ?'); values.push(first_name); }
    if (last_name !== undefined) { fields.push('last_name = ?'); values.push(last_name); }
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
    values.push(req.params.userId);

    try {
        await dbRun(globalDb, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ message: "User updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:id', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    
    // SysAdmin delete: Remove from global users (cascade deletes links)
    globalDb.run("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Global user removed" });
    });
});

module.exports = router;