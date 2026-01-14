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
// 🛡️ HOUSEHOLD BACKUP (Admin Only)
// ==========================================

router.get('/backups', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    listBackups().then(backups => res.json(backups)).catch(err => res.status(500).json({ error: err.message }));
});

router.post('/backups/trigger', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    createBackup().then(filename => res.json({ message: "Backup created", filename })).catch(err => res.status(500).json({ error: err.message }));
});

router.get('/backups/download/:filename', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    res.download(filePath);
});

router.post('/backups/upload', authenticateToken, upload.single('backup'), async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
        await restoreBackup(req.file.path);
        fs.unlinkSync(req.file.path);
        res.json({ message: "Restore complete." });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 🌍 HOUSEHOLD MANAGEMENT (Admin Only)
// ==========================================

router.get('/households', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    globalDb.all("SELECT * FROM households WHERE id = ?", [req.user.householdId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create household is restricted to the /auth/register route in this model
// but we keep the logic here if needed for existing flows, restricting to admin
router.post('/households', authenticateToken, async (req, res) => {
    return res.status(403).json({ error: "Direct household creation via admin route disabled. Use registration." });
});

router.put('/households/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    if (parseInt(req.params.id) !== parseInt(req.user.householdId)) return res.sendStatus(403);

    const { name, 
        address_street, address_city, address_zip,
        date_format, currency, decimals, avatar,
        auto_backup, backup_retention 
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
    if (auto_backup !== undefined) { fields.push('auto_backup = ?'); values.push(auto_backup); }
    if (backup_retention !== undefined) { fields.push('backup_retention = ?'); values.push(backup_retention); }

    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(req.params.id);
    globalDb.run(`UPDATE households SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Household updated" });
    });
});

router.delete('/households/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    if (parseInt(req.params.id) !== parseInt(req.user.householdId)) return res.sendStatus(403);

    const hhId = req.params.id;
    globalDb.run("DELETE FROM households WHERE id = ?", [hhId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const dbPath = path.join(DATA_DIR, `household_${hhId}.db`);
        if (fs.existsSync(dbPath)) { try { fs.unlinkSync(dbPath); } catch (e) {} }
        res.json({ message: "Household deleted" });
    });
});

// ==========================================
// 👥 USER MANAGEMENT (Admin)
// ==========================================

router.get('/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const sql = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.avatar, uh.role 
        FROM users u
        JOIN user_households uh ON u.id = uh.user_id
        WHERE uh.household_id = ?
    `;
    globalDb.all(sql, [req.user.householdId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/**
 * GET /admin/users/:userId
 */
router.get('/users/:userId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    try {
        const user = await dbGet(globalDb, `
            SELECT u.id, u.email, u.first_name, u.last_name, u.avatar, uh.role 
            FROM users u
            JOIN user_households uh ON u.id = uh.user_id
            WHERE u.id = ? AND uh.household_id = ?
        `, [req.params.userId, req.user.householdId]);
        
        if (!user) return res.status(404).json({ error: "User not found in this household" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/create-user', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { username, password, role, email, first_name, last_name, avatar, householdId } = req.body;
    const targetHhId = householdId || req.user.householdId;

    if (parseInt(req.user.householdId) !== parseInt(targetHhId)) return res.sendStatus(403);

    const finalEmail = email || `${username}@example.com`;

    try {
        const hash = bcrypt.hashSync(password, 8);
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

        await dbRun(globalDb, 
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)`,
            [userId, targetHhId, role || 'member']
        );

        res.json({ message: "User created", id: userId });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:userId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    // Verify user is in same household
    const link = await dbGet(globalDb, "SELECT * FROM user_households WHERE user_id = ? AND household_id = ?", [req.params.userId, req.user.householdId]);
    if (!link) return res.sendStatus(403);

    const { username, password, email, first_name, last_name, avatar } = req.body;
    
    let fields = []; let values = [];
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

router.delete('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    // Just remove from this household
    globalDb.run("DELETE FROM user_households WHERE user_id = ? AND household_id = ?", [req.params.id, req.user.householdId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "User removed from household" });
    });
});

module.exports = router;