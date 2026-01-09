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

// ==========================================
// 🛡️ FULL SYSTEM BACKUP (SysAdmin Only)
// ==========================================

// GET /admin/backups - List all full system backups
router.get('/backups', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    listBackups() // Full list
        .then(backups => res.json(backups))
        .catch(err => res.status(500).json({ error: err.message }));
});

// POST /admin/backups/trigger - Manually create full system backup
router.post('/backups/trigger', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    createBackup() // null = full
        .then(filename => res.json({ message: "Full system backup created", filename }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// GET /admin/backups/download/:filename
router.get('/backups/download/:filename', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    res.download(filePath);
});

// POST /admin/backups/upload - Upload and restore full system
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

// GET /admin/households
router.get('/households', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    globalDb.all("SELECT * FROM households", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /admin/households (Create New Household)
router.post('/households', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);

    const { name, adminUsername, adminPassword } = req.body;
    if (!name || !adminUsername || !adminPassword) return res.status(400).json({ error: "Missing fields" });

    const accessKey = crypto.randomBytes(3).toString('hex').toUpperCase();

    globalDb.run(`INSERT INTO households (name, access_key) VALUES (?, ?)`, [name, accessKey], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const householdId = this.lastID;
        const hhDb = getHouseholdDb(householdId);

        const hash = bcrypt.hashSync(adminPassword, 8);
        hhDb.run(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')`, 
            [adminUsername, hash], (err) => {
                hhDb.close();
                if (err) return res.status(500).json({ error: "Household created but admin user failed." });
                res.json({ message: "Household created", householdId, accessKey });
            });
    });
});

// PUT /admin/households/:id
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

// DELETE /admin/households/:id
router.delete('/households/:id', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    const hhId = req.params.id;

    globalDb.run("DELETE FROM households WHERE id = ?", [hhId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const dbPath = path.join(DATA_DIR, `household_${hhId}.db`);
        if (fs.existsSync(dbPath)) {
            try { fs.unlinkSync(dbPath); } catch (e) { console.error("Failed to delete DB file", e); }
        }
        res.json({ message: "Household deleted" });
    });
});

// GET /admin/users (Global SysAdmins)
router.get('/users', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    globalDb.all("SELECT id, username, email, avatar, system_role FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /admin/create-user (Local User Creation Helper for SysAdmin/Admin)
router.post('/create-user', authenticateToken, (req, res) => {
    const { username, password, role, email, avatar, householdId } = req.body;
    const targetHhId = householdId || req.user.householdId;
    
    if (!targetHhId) return res.status(400).json({ error: "Household ID required" });
    if (req.user.role !== 'admin' && req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    if (req.user.system_role !== 'sysadmin' && parseInt(req.user.householdId) !== parseInt(targetHhId)) return res.sendStatus(403);

    const targetDb = getHouseholdDb(targetHhId);
    const hash = bcrypt.hashSync(password, 8);

    targetDb.run(`INSERT INTO users (username, password_hash, role, email, avatar) VALUES (?, ?, ?, ?, ?)`, 
        [username, hash, role || 'member', email, avatar], function(err) {
            targetDb.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "User created", id: this.lastID });
        });
});

// DELETE /admin/users/:id (Global or Local depending on context)
router.delete('/users/:id', authenticateToken, (req, res) => {
    const { householdId } = req.query; // If deleting local user, pass householdId
    
    if (householdId) {
        if (req.user.role !== 'admin' && req.user.system_role !== 'sysadmin') return res.sendStatus(403);
        if (req.user.system_role !== 'sysadmin' && parseInt(req.user.householdId) !== parseInt(householdId)) return res.sendStatus(403);
        
        const db = getHouseholdDb(householdId);
        db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Local user deleted" });
        });
    } else {
        // Delete Global User
        if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
        globalDb.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Global user deleted" });
        });
    }
});

// PUT /admin/users/:id
router.put('/users/:id', authenticateToken, (req, res) => {
    const { householdId, username, role, password, email, avatar } = req.body;
    
    if (householdId) {
        if (req.user.role !== 'admin' && req.user.system_role !== 'sysadmin') return res.sendStatus(403);
        const db = getHouseholdDb(householdId);
        
        let fields = []; let values = [];
        if (username) { fields.push('username = ?'); values.push(username); }
        if (role) { fields.push('role = ?'); values.push(role); }
        if (password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 8)); }
        if (email !== undefined) { fields.push('email = ?'); values.push(email); }
        if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
        values.push(req.params.id);

        db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Local user updated" });
        });
    } else {
        if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
        // Update global user logic...
        res.json({ message: "Global user update not implemented yet" });
    }
});

module.exports = router;