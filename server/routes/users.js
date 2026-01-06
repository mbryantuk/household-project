const express = require('express');
const router = express.Router();
const { globalDb } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

// Note: In server.js we will mount this at /households, so paths here are relative
// e.g., router.get('/:id/users') becomes /households/:id/users

router.get('/:id/users', authenticateToken, requireHouseholdRole('viewer'), (req, res) => {
    const isSysAdmin = req.user.system_role === 'sysadmin';
    let sql = `SELECT u.id, u.username, u.email, uh.role, u.system_role FROM user_households uh JOIN users u ON uh.user_id = u.id WHERE uh.household_id = ?`;
    if (!isSysAdmin) sql += ` AND u.system_role != 'sysadmin'`;
    
    globalDb.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/:id/users', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const { usernameToAdd, role } = req.body; 
    globalDb.get(`SELECT id FROM users WHERE username = ?`, [usernameToAdd], (err, user) => {
        if (!user) return res.status(404).json({ error: "User not found" });
        globalDb.run(`INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)`, 
            [user.id, req.params.id, role || 'member'], (err) => {
                if (err) return res.status(500).json({ error: "User likely already added" });
                res.json({ message: "User added" });
            });
    });
});

router.put('/:id/users/:userId', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    const { newRole } = req.body;
    if (!['admin', 'member', 'viewer'].includes(newRole)) return res.status(400).json({ error: "Invalid role" });
    globalDb.run(`UPDATE user_households SET role = ? WHERE household_id = ? AND user_id = ?`, 
        [newRole, req.params.id, req.params.userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Role updated" });
    });
});

router.delete('/:id/users/:userId', authenticateToken, requireHouseholdRole('admin'), (req, res) => {
    globalDb.run(`DELETE FROM user_households WHERE household_id = ? AND user_id = ?`, 
        [req.params.id, req.params.userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "User removed" });
    });
});

module.exports = router;