const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { globalDb, getHouseholdDb } = require('../db'); 
const { SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');

// LOGIN: Supports both SysAdmin (Global) and Household (Local) login
router.post('/login', (req, res) => {
    const { accessKey, username, password } = req.body;
    
    // 1. SYSADMIN LOGIN (No Access Key or "ADMIN")
    if (!accessKey || accessKey.toUpperCase() === 'ADMIN') {
        console.log(`🔐 SysAdmin Login Attempt: ${username}`);
        globalDb.get(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`, [username], (err, user) => {
            if (err || !user) return res.status(404).json({ error: "System Admin not found" });
            
            const isValid = bcrypt.compareSync(password, user.password_hash);
            if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

            if (user.system_role !== 'sysadmin') return res.status(403).json({ error: "Not a System Administrator" });

            const token = jwt.sign({ 
                id: user.id, username: user.username, system_role: 'sysadmin' 
            }, SECRET_KEY, { expiresIn: '24h' });
            
            res.json({ token, role: 'sysadmin', context: 'global' });
        });
        return;
    }

    // 2. HOUSEHOLD LOGIN (Access Key Provided)
    console.log(`🏠 Household Login Attempt: ${username} @ Key: ${accessKey}`);
    
    // Find the household by key
    globalDb.get(`SELECT * FROM households WHERE access_key = ?`, [accessKey], (err, household) => {
        if (err || !household) return res.status(404).json({ error: "Invalid Household Key" });

        // Open Household DB
        const hhDb = getHouseholdDb(household.id);
        
        hhDb.get(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`, [username], (err, user) => {
            hhDb.close(); // Always close connection
            
            if (err || !user) return res.status(404).json({ error: "User not found in this household" });

            const isValid = bcrypt.compareSync(password, user.password_hash);
            if (!isValid) return res.status(401).json({ error: "Invalid password" });

            // Generate Token with Household Context
            const token = jwt.sign({ 
                id: user.id, 
                username: user.username, 
                householdId: household.id,
                householdName: household.name,
                role: user.role, // admin, member, viewer
                system_role: 'user'
            }, SECRET_KEY, { expiresIn: '24h' });

            res.json({ 
                token, 
                role: user.role, 
                context: 'household',
                household: { 
                    id: household.id, 
                    name: household.name, 
                    theme: household.theme,
                    access_key: household.access_key,
                    address_street: household.address_street,
                    address_city: household.address_city,
                    address_zip: household.address_zip,
                    date_format: household.date_format,
                    currency: household.currency,
                    decimals: household.decimals,
                    avatar: household.avatar
                }
            });
        });
    });
});

// PROFILE: Update own details (Works for both contexts)
router.put('/profile', authenticateToken, (req, res) => {
    const { username, password } = req.body;
    if (!username && !password) return res.status(400).json({ error: "Nothing to update" });

    const isSysAdmin = req.user.system_role === 'sysadmin';
    const targetDb = isSysAdmin ? globalDb : getHouseholdDb(req.user.householdId);

    let fields = [];
    let values = [];
    if (username) { fields.push('username = ?'); values.push(username); }
    if (password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 8)); }
    values.push(req.user.id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

    targetDb.run(sql, values, function(err) {
        if (!isSysAdmin) targetDb.close();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Profile updated" });
    });
});

module.exports = router;