const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const { globalDb, getHouseholdDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { listBackups, createBackup, restoreBackup, BACKUP_DIR } = require('../services/backup');

// Upload middleware
const upload = multer({ dest: path.join(__dirname, '../data/temp_uploads/') });

// ===============================
// 🛡️ BACKUP ROUTES (SysAdmin Only)
// ===============================

// GET /backups - List all backups
router.get('/backups', authenticateToken, async (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    try {
        const backups = await listBackups();
        res.json(backups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /backups/trigger - Manually create backup
router.post('/backups/trigger', authenticateToken, async (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    try {
        const filename = await createBackup();
        res.json({ message: "Backup created", filename });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /backups/download/:filename
router.get('/backups/download/:filename', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    res.download(filePath, (err) => {
        if (err) res.status(404).json({ error: "File not found" });
    });
});

// POST /backups/restore/:filename - Restore from local backup
router.post('/backups/restore/:filename', authenticateToken, async (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    try {
        await restoreBackup(filePath);
        res.json({ message: "System restored successfully. Please restart if necessary." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /backups/upload - Upload and restore
router.post('/backups/upload', authenticateToken, upload.single('backup'), async (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    try {
        await restoreBackup(req.file.path);
        res.json({ message: "Backup uploaded and restored successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// 🌍 SYSADMIN ROUTES (Global)
// ===============================

// GET /households (List All - SysAdmin)
router.get('/households', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);
    
    globalDb.all("SELECT * FROM households", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /households (Create New Tenant)
router.post('/households', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);

    const { name, adminUsername, adminPassword } = req.body;
    if (!name || !adminUsername || !adminPassword) return res.status(400).json({ error: "Missing fields" });

    // Generate Unique Access Key (e.g., "DE2E1D")
    const accessKey = crypto.randomBytes(3).toString('hex').toUpperCase();

    // 1. Create in Global DB
    globalDb.run(`INSERT INTO households (name, access_key) VALUES (?, ?)`, [name, accessKey], function(err) {
        if (err) {
            console.error("Create Household DB Error:", err);
            return res.status(500).json({ error: err.message });
        }
        
        const householdId = this.lastID;
        const hhDb = getHouseholdDb(householdId); // Creates DB and Tables

        // 2. Create Initial Admin in Local DB
        const hash = bcrypt.hashSync(adminPassword, 8);
        hhDb.run(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')`, 
            [adminUsername, hash], (err) => {
                hhDb.close();
                if (err) return res.status(500).json({ error: "Created household but failed to create admin." });
                
                res.json({ 
                    message: "Household created successfully", 
                    householdId, 
                    accessKey, 
                    admin: adminUsername 
                });
            });
    });
});

// PUT /households/:id (Update Tenant - SysAdmin)
router.put('/households/:id', authenticateToken, (req, res) => {
    if (req.user.system_role !== 'sysadmin') return res.sendStatus(403);

    const { name, access_key, theme } = req.body;
    if (!name && !access_key && !theme) return res.status(400).json({ error: "Nothing to update" });

    let fields = [];
    let values = [];

    if (name) { fields.push('name = ?'); values.push(name); }
    if (access_key) { fields.push('access_key = ?'); values.push(access_key); }
    if (theme) { fields.push('theme = ?'); values.push(theme); }
    
    values.push(req.params.id);

    globalDb.run(`UPDATE households SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) {
            console.error("Update Household Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Household updated successfully" });
    });
});

// ===============================
// 🏠 HOUSEHOLD ADMIN ROUTES (Local)
// ===============================

// POST /create-user (Create Local User)
router.post('/create-user', authenticateToken, (req, res) => {
    const { username, password, role, email, avatar } = req.body;
    
    // Check permissions (Must be Local Admin or SysAdmin)
    const targetHhId = req.user.householdId || req.body.householdId;
    if (!targetHhId) return res.status(400).json({ error: "Household ID required" });

    const isAuthorized = req.user.role === 'admin' || req.user.system_role === 'sysadmin';
    if (!isAuthorized) return res.sendStatus(403);

    const targetDb = getHouseholdDb(targetHhId);
    const hash = bcrypt.hashSync(password, 8);
    console.log(`📝 Creating user '${username}' in household ${targetHhId}`);

    targetDb.run(`INSERT INTO users (username, password_hash, role, email, avatar) VALUES (?, ?, ?, ?, ?)`, 
        [username, hash, role || 'member', email, avatar], function(err) {
            targetDb.close();
            if (err) {
                console.error("Create User DB Error:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "User created", id: this.lastID });
        });
});

// GET /users (List Local Users)
router.get('/users', authenticateToken, (req, res) => {
    // If SysAdmin wants to see users of a specific house
    const targetHhId = req.query.householdId || req.user.householdId;
    
    if (!targetHhId && req.user.system_role !== 'sysadmin') return res.sendStatus(400);
    
    // Note: SysAdmins technically don't have a 'local' user list unless query param is used.
    // Use GET /admin/users for global sysadmins.
    
    if (targetHhId) {
        const db = getHouseholdDb(targetHhId);
        db.all("SELECT id, username, role, email, avatar FROM users", [], (err, rows) => {
            db.close();
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        // List Global SysAdmins
        globalDb.all("SELECT id, username, system_role FROM users WHERE system_role = 'sysadmin'", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

// DELETE /users/:id (Remove Local User)

router.delete('/users/:id', authenticateToken, (req, res) => {

    const targetHhId = req.user.householdId || req.body.householdId; // Sysadmin passes via body

    if (!targetHhId) return res.sendStatus(400);



    const isAuthorized = req.user.role === 'admin' || req.user.system_role === 'sysadmin';

    if (!isAuthorized) return res.sendStatus(403);



    const db = getHouseholdDb(targetHhId);

    db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {

        db.close();

        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "User deleted" });

    });

});



// PUT /users/:id (Update Local User)
router.put('/users/:id', authenticateToken, (req, res) => {
    const targetHhId = req.user.householdId || req.body.householdId;
    if (!targetHhId) return res.sendStatus(400);

    const isAuthorized = req.user.role === 'admin' || req.user.system_role === 'sysadmin';
    if (!isAuthorized) return res.sendStatus(403);

    const { username, role, password, email, avatar } = req.body;
    if (!username && !role && !password && !email && !avatar) return res.status(400).json({ error: "Nothing to update" });

    let fields = [];
    let values = [];
    if (username) { fields.push('username = ?'); values.push(username); }
    if (role) { fields.push('role = ?'); values.push(role); }
    if (password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 8)); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }

    values.push(req.params.id);

    const db = getHouseholdDb(targetHhId);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

    db.run(sql, values, function(err) {
        db.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "User updated" });
    });
});



module.exports = router;
