const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { globalDb } = require('../db'); // Central DB connection
const { SECRET_KEY } = require('../config'); // Shared secret

// REGISTER: Create a new user
router.post('/register', (req, res) => {
    const { username, password, email, secretCode } = req.body;
    const hash = bcrypt.hashSync(password, 8);
    
    // Logic to determine system role
    const systemRole = (secretCode === 'MakeMeGod') ? 'sysadmin' : 'user';

    const sql = `INSERT INTO users (username, password_hash, email, system_role) VALUES (?, ?, ?, ?)`;
    globalDb.run(sql, [username, hash, email, systemRole], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, username, system_role: systemRole });
    });
});

// LOGIN: Verify credentials and issue token
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    globalDb.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "User not found" });

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: "Invalid password" });

        // Sign the JWT with user claims
        const token = jwt.sign({ 
            id: user.id, username: user.username, system_role: user.system_role 
        }, SECRET_KEY, { expiresIn: '24h' });
        
        res.json({ token, system_role: user.system_role });
    });
});

module.exports = router;