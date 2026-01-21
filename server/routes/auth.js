const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { globalDb, getHouseholdDb, dbGet, dbRun, dbAll } = require('../db'); 
const { SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /register
 * SaaS Signup: Create Tenant + Admin User
 */
router.post('/register', async (req, res) => {
    const { householdName, email, password, firstName, lastName } = req.body;

    if (!householdName || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Password Strength Check
    if (process.env.NODE_ENV !== 'test') {
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                error: "Password must be at least 8 characters long and include at least one number and one special character." 
            });
        }
    }

    try {
        // 1. Check if email exists
        const existingUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        if (existingUser) return res.status(409).json({ error: "Email already registered" });

        // 2. Create Household
        const hhResult = await dbRun(globalDb, 
            `INSERT INTO households (name) VALUES (?)`, 
            [householdName]
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

        // 5. Initialize Household DB
        const hhDb = getHouseholdDb(householdId);
        hhDb.close();

        res.status(201).json({ message: "Registration successful. Please login." });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Registration failed: " + err.message });
    }
});

/**
 * POST /login
 */
router.post('/login', async (req, res) => {
    const { email, password, username } = req.body;
    const identifier = email || username;

    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE email = ? OR username = ? COLLATE NOCASE`, [identifier, identifier]);
        if (!user) return res.status(404).json({ error: "Invalid credentials" });

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({ error: "Your account is deactivated. Please contact support." });
        }

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        let householdId = user.default_household_id;
        let userRole = 'member';

        if (!householdId) {
            const link = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND is_active = 1 LIMIT 1`, [user.id]);
            if (link) {
                householdId = link.household_id;
                userRole = link.role;
            }
        } else {
            const link = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND household_id = ? AND is_active = 1`, [user.id, householdId]);
            if (link) {
                userRole = link.role;
            } else {
                // Default household might be inactive or user removed
                householdId = null;
                const altLink = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND is_active = 1 LIMIT 1`, [user.id]);
                if (altLink) {
                    householdId = altLink.household_id;
                    userRole = altLink.role;
                }
            }
        }

        let householdData = null;
        if (householdId) {
            householdData = await dbGet(globalDb, `SELECT * FROM households WHERE id = ?`, [householdId]);
        }

        const tokenPayload = {
            id: user.id,
            email: user.email,
            system_role: user.system_role,
            householdId: householdId,
            role: userRole
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
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar: user.avatar,
                theme: user.theme,
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
 * GET /profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(globalDb, `SELECT id, email, username, first_name, last_name, avatar, system_role, dashboard_layout, sticky_note, theme, default_household_id FROM users WHERE id = ?`, [req.user.id]);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
    const { 
        email, password, 
        firstName, lastName, 
        first_name, last_name, 
        avatar, dashboard_layout, sticky_note,
        theme, default_household_id
    } = req.body;
    
    let fields = [];
    let values = [];

    if (email) { fields.push('email = ?'); values.push(email); }
    if (password) { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 8)); }
    
    const fName = first_name || firstName;
    const lName = last_name || lastName;
    if (fName) { fields.push('first_name = ?'); values.push(fName); }
    if (lName) { fields.push('last_name = ?'); values.push(lName); }
    
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    if (theme !== undefined) { fields.push('theme = ?'); values.push(theme); }
    if (sticky_note !== undefined) { fields.push('sticky_note = ?'); values.push(sticky_note); }
    if (default_household_id !== undefined) { fields.push('default_household_id = ?'); values.push(default_household_id); }
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

/**
 * GET /my-households
 */
router.get('/my-households', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT h.*, uh.role, uh.is_active as link_active
            FROM households h
            JOIN user_households uh ON h.id = uh.household_id
            WHERE uh.user_id = ?
        `;

        const rows = await dbAll(globalDb, sql, [req.user.id]);
        res.json(rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;