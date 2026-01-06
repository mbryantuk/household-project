const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { globalDb } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.post('/create-user', authenticateToken, (req, res) => {
    const { username, password, email, householdId, role } = req.body;
    
    // VALIDATION
    if (!username || !password || !householdId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // SECURITY CHECK
    const isSysAdmin = req.user.system_role === 'sysadmin';

    // Helper to perform the creation
    const performCreate = () => {
        const hash = bcrypt.hashSync(password, 8);
        
        // 1. Create User
        globalDb.run(`INSERT INTO users (username, password_hash, email, system_role) VALUES (?, ?, ?, 'user')`, 
            [username, hash, email], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: "Username already exists" });
                    return res.status(500).json({ error: err.message });
                }
                
                const newUserId = this.lastID;

                // 2. Link to Household
                globalDb.run(`INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)`, 
                    [newUserId, householdId, role || 'member'], (err) => {
                        if (err) return res.status(500).json({ error: "User created, but failed to assign." });
                        res.json({ message: "User created and assigned", userId: newUserId });
                    });
            });
    };

    // LOGIC: Who is allowed to do this?
    if (isSysAdmin) {
        // Sysadmins can do anything
        performCreate();
    } else {
        // Normal users must be an ADMIN of the target household
        const sql = `SELECT role FROM user_households WHERE user_id = ? AND household_id = ?`;
        globalDb.get(sql, [req.user.id, householdId], (err, row) => {
            if (err || !row || row.role !== 'admin') {
                return res.status(403).json({ error: "Access denied: You must be an Admin of this household to create users for it." });
            }
            performCreate();
        });
    }
});

// Export the router so server.js can use it
module.exports = router;