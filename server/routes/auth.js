const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { globalDb, getHouseholdDb } = require('../db'); 
const { SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

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
 * POST /register
 * SaaS Signup: Create Tenant + Admin User
 */
router.post('/register', async (req, res) => {
    const { householdName, email, password, firstName, lastName } = req.body;

    if (!householdName || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // 1. Check if email exists
        const existingUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        if (existingUser) return res.status(409).json({ error: "Email already registered" });

        // 2. Create Household
        // Generate a random access key just for API compatibility/uniqueness, though not used for login
        const accessKey = crypto.randomBytes(4).toString('hex').toUpperCase();
        
        const hhResult = await dbRun(globalDb, 
            `INSERT INTO households (name, access_key, theme) VALUES (?, ?, 'default')`, 
            [householdName, accessKey]
        );
        const householdId = hhResult.id;

        // 3. Create Admin User
        const passwordHash = bcrypt.hashSync(password, 8);
        const userResult = await dbRun(globalDb,
            `INSERT INTO users (email, password_hash, first_name, last_name, system_role, default_household_id) VALUES (?, ?, ?, ?, 'user', ?)`,
            [email, passwordHash, firstName || 'Admin', lastName || '', householdId]
        );
        const userId = userResult.id;

        // 4. Link User to Household as Admin
        await dbRun(globalDb,
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')`,
            [userId, householdId]
        );

        // 5. Initialize Household DB (Trigger creation)
        const hhDb = getHouseholdDb(householdId);
        hhDb.close();

        // 6. Return Success (Login required next, or auto-login)
        res.status(201).json({ message: "Registration successful. Please login." });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Registration failed: " + err.message });
    }
});

/**
 * POST /login
 * Authenticate against Global Users and return Context
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE email = ? COLLATE NOCASE`, [email]);
        if (!user) return res.status(404).json({ error: "Invalid credentials" });

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        // Determine Household Context
        // 1. Use default_household_id
        // 2. Or query user_households for the first one
        let householdId = user.default_household_id;
        let userRole = 'member'; // Default fallback

        if (!householdId) {
            // Fallback: Find any household
            const link = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? LIMIT 1`, [user.id]);
            if (link) {
                householdId = link.household_id;
                userRole = link.role;
            }
        } else {
            // Verify role for default household
            const link = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND household_id = ?`, [user.id, householdId]);
            if (link) userRole = link.role;
            else householdId = null; // Invalid default
        }

        // Fetch Household Data if applicable
        let householdData = null;
        if (householdId) {
            householdData = await dbGet(globalDb, `SELECT * FROM households WHERE id = ?`, [householdId]);
        }

        // Generate Token
        const tokenPayload = {
            id: user.id,
            email: user.email,
            system_role: user.system_role,
            householdId: householdId,
            role: userRole // Role within the current household
        };

        const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '24h' });

        res.json({
            token,
            role: userRole,
            system_role: user.system_role,
            context: householdId ? 'household' : 'global',
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar: user.avatar,
                dashboard_layout: user.dashboard_layout,
                sticky_note: user.sticky_note
            },
            household: householdData
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Login failed" });
    }
});

/**
 * PUT /profile
 * Update Global User Profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
    const { email, password, firstName, lastName, avatar, dashboard_layout, sticky_note } = req.body;
    
    let fields = [];
    let values = [];

    if (email) { fields.push('email = ?'); values.push(email); }
    if (password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 8)); }
    if (firstName) { fields.push('first_name = ?'); values.push(firstName); }
    if (lastName) { fields.push('last_name = ?'); values.push(lastName); }
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    if (sticky_note !== undefined) { fields.push('sticky_note = ?'); values.push(sticky_note); }
    if (dashboard_layout !== undefined) { 
        fields.push('dashboard_layout = ?'); 
        values.push(typeof dashboard_layout === 'string' ? dashboard_layout : JSON.stringify(dashboard_layout)); 
    }

    if (fields.length === 0) return res.status(400).json({ error: "Nothing to update" });

    values.push(req.user.id);

    try {
        await dbRun(globalDb, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ message: "Profile updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;