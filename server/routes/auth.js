const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateSecret, generateURI, verify, generate } = require('otplib');
const qrcode = require('qrcode');
const { globalDb, getHouseholdDb, dbGet, dbRun, dbAll } = require('../db'); 
const { SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { finalizeLogin } = require('../services/auth');

/**
 * POST /register
 */
router.post('/register', async (req, res) => {
    const { householdName, email, password, firstName, lastName, is_test } = req.body;

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
        const existingUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        if (existingUser) return res.status(409).json({ error: "Email already registered" });

        let finalIsTest = (is_test || process.env.NODE_ENV === 'test') ? 1 : 0;
        if (email.startsWith('smoke_') || email.startsWith('routing_') || email.startsWith('test_')) {
            finalIsTest = 1;
        }

        const hhResult = await dbRun(globalDb, 
            `INSERT INTO households (name, is_test) VALUES (?, ?)`, 
            [householdName, finalIsTest]
        );
        const householdId = hhResult.id;

        const passwordHash = bcrypt.hashSync(password, 8);
        const userResult = await dbRun(globalDb,
            `INSERT INTO users (email, password_hash, first_name, last_name, system_role, default_household_id, is_test, is_active) VALUES (?, ?, ?, ?, 'user', ?, ?, 1)`,
            [email, passwordHash, firstName || 'Admin', lastName || '', householdId, finalIsTest]
        );
        const userId = userResult.id;

        await dbRun(globalDb,
            `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')`,
            [userId, householdId]
        );

        const hhDb = getHouseholdDb(householdId);
        hhDb.close();

        res.status(201).json({ message: "Registration successful. Please login." });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Registration failed: " + err.message });
    }
});

/**
 * POST /lookup
 */
router.post('/lookup', async (req, res) => {
    const { email, username } = req.body;
    const identifier = email || username;
    if (!identifier) return res.status(400).json({ error: "Identifier required" });

    try {
        const user = await dbGet(globalDb, `SELECT first_name, avatar FROM users WHERE email = ? OR username = ? COLLATE NOCASE`, [identifier, identifier]);
        if (!user) return res.status(404).json({ error: "Not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Lookup failed" });
    }
});

/**
 * POST /login
 */
router.post('/login', async (req, res) => {
    const { email, password, username, rememberMe } = req.body;
    const identifier = email || username;

    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE email = ? OR username = ? COLLATE NOCASE`, [identifier, identifier]);
        if (!user) return res.status(404).json({ error: "Invalid credentials" });

        if (!user.is_active) {
            return res.status(403).json({ error: "Your account is deactivated. Please contact support." });
        }

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        if (user.mfa_enabled) {
            if (process.env.NODE_ENV !== 'test') {
                console.log(`🔐 [AUTH] MFA Required for: ${user.email}`);
            }
            const preAuthToken = jwt.sign({ preAuthId: user.id, type: 'mfa_pending', rememberMe }, SECRET_KEY, { expiresIn: '5m' });
            return res.json({ mfa_required: true, preAuthToken });
        }

        await finalizeLogin(user, req, res, rememberMe);

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Login failed" });
    }
});

/**
 * POST /mfa/setup
 */
router.post('/mfa/setup', authenticateToken, async (req, res) => {
    try {
        const secret = generateSecret();
        const otpauth = generateURI({
            secret,
            label: req.user.email,
            issuer: 'Hearth Household'
        });
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        // Store secret but do NOT enable MFA yet
        await dbRun(globalDb, `UPDATE users SET mfa_secret = ? WHERE id = ?`, [secret, req.user.id]);

        res.json({ secret, qrCodeUrl });
    } catch (err) {
        console.error("MFA Setup Error:", err);
        res.status(500).json({ error: "MFA setup failed" });
    }
});

/**
 * POST /mfa/verify
 */
router.post('/mfa/verify', authenticateToken, async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code required" });

    try {
        const user = await dbGet(globalDb, `SELECT mfa_secret FROM users WHERE id = ?`, [req.user.id]);
        if (!user || !user.mfa_secret) return res.status(400).json({ error: "MFA not initiated" });

        const result = await verify({ token: code, secret: user.mfa_secret });
        if (!result.valid) return res.status(400).json({ error: "Invalid code" });

        await dbRun(globalDb, `UPDATE users SET mfa_enabled = 1 WHERE id = ?`, [req.user.id]);
        res.json({ message: "MFA Enabled" });
    } catch (err) {
        res.status(500).json({ error: "MFA verification failed" });
    }
});

/**
 * POST /mfa/disable
 */
router.post('/mfa/disable', authenticateToken, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });

    try {
        const user = await dbGet(globalDb, `SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(403).json({ error: "Invalid password" });

        await dbRun(globalDb, `UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?`, [req.user.id]);
        res.json({ message: "MFA Disabled" });
    } catch (err) {
        res.status(500).json({ error: "Failed to disable MFA" });
    }
});

/**
 * POST /mfa/login
 */
router.post('/mfa/login', async (req, res) => {
    const { preAuthToken, code } = req.body;
    if (!preAuthToken || !code) return res.status(400).json({ error: "Code and pre-auth token required" });

    try {
        const decoded = jwt.verify(preAuthToken, SECRET_KEY);
        if (decoded.type !== 'mfa_pending') throw new Error("Invalid token type");

        const user = await dbGet(globalDb, `SELECT * FROM users WHERE id = ?`, [decoded.preAuthId]);
        if (!user || !user.is_active) return res.status(403).json({ error: "User inactive" });

        const result = await verify({ token: code, secret: user.mfa_secret });
        if (!result.valid) return res.status(401).json({ error: "Invalid 2FA code" });

        await finalizeLogin(user, req, res, decoded.rememberMe);

    } catch (err) {
        res.status(401).json({ error: "Invalid or expired pre-auth token" });
    }
});

/**
 * SESSION MANAGEMENT
 */
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await dbAll(globalDb, 
            `SELECT id, device_info, ip_address, last_active, created_at, expires_at 
             FROM user_sessions 
             WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
             ORDER BY last_active DESC`, 
            [req.user.id]
        );
        
        const processed = sessions.map(s => ({
            ...s,
            current: s.id === req.user.sid
        }));
        
        res.json(processed);
    } catch (err) {
        console.error("Fetch sessions error:", err);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});

/**
 * DELETE /sessions
 * Log out of all sessions except the current one
 */
router.delete('/sessions', authenticateToken, async (req, res) => {
    try {
        await dbRun(globalDb, 
            `DELETE FROM user_sessions WHERE user_id = ? AND id != ?`, 
            [req.user.id, req.user.sid]
        );
        res.json({ message: "All other sessions logged out" });
    } catch (err) {
        res.status(500).json({ error: "Failed to logout other sessions" });
    }
});

router.delete('/sessions/:id', authenticateToken, async (req, res) => {
    try {
        await dbRun(globalDb, `DELETE FROM user_sessions WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
        res.json({ message: "Session revoked" });
    } catch (err) {
        res.status(500).json({ error: "Failed to revoke session" });
    }
});

/**
 * GET /profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(globalDb, `SELECT id, email, username, first_name, last_name, avatar, system_role, dashboard_layout, sticky_note, theme, mode, custom_theme, default_household_id FROM users WHERE id = ?`, [req.user.id]);
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
        budget_settings,
        theme, mode, custom_theme, default_household_id
    } = req.body;
    
    let fields = [];
    let values = [];

    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (password !== undefined && password !== '') { fields.push('password_hash = ?'); values.push(bcrypt.hashSync(password, 8)); }
    
    const fName = first_name !== undefined ? first_name : firstName;
    const lName = last_name !== undefined ? last_name : lastName;
    
    if (fName !== undefined) { fields.push('first_name = ?'); values.push(fName); }
    if (lName !== undefined) { fields.push('last_name = ?'); values.push(lName); }
    
    if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }
    if (theme !== undefined) { fields.push('theme = ?'); values.push(theme); }
    if (mode !== undefined) { fields.push('mode = ?'); values.push(mode); }
    if (custom_theme !== undefined) { fields.push('custom_theme = ?'); values.push(custom_theme); }
    if (sticky_note !== undefined) { fields.push('sticky_note = ?'); values.push(sticky_note); }
    if (default_household_id !== undefined) { fields.push('default_household_id = ?'); values.push(default_household_id); }
    
    if (dashboard_layout !== undefined) { 
        fields.push('dashboard_layout = ?'); 
        values.push(typeof dashboard_layout === 'string' ? dashboard_layout : JSON.stringify(dashboard_layout)); 
    }
    if (budget_settings !== undefined) {
        fields.push('budget_settings = ?');
        values.push(typeof budget_settings === 'string' ? budget_settings : JSON.stringify(budget_settings));
    }

    if (fields.length === 0) {
        console.error("Update Profile Error: Nothing to update. Body:", req.body);
        return res.status(400).json({ error: "Nothing to update" });
    }

    values.push(req.user.id);

    try {
        await dbRun(globalDb, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ message: "Profile updated" });
    } catch (err) {
        console.error("Update Profile SQL Error:", err);
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

/**
 * POST /token
 */
router.post('/token', authenticateToken, async (req, res) => {
    const { householdId } = req.body;
    
    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE id = ?`, [req.user.id]);
        if (!user || !user.is_active) return res.status(403).json({ error: "User inactive" });

        let userRole = 'member';
        let targetHouseholdId = householdId;

        if (targetHouseholdId) {
            const link = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND household_id = ? AND is_active = 1`, [user.id, targetHouseholdId]);
            if (!link) return res.status(403).json({ error: "Access denied to this household" });
            userRole = link.role;
        }

        const tokenPayload = {
            id: user.id,
            email: user.email,
            system_role: user.system_role,
            householdId: targetHouseholdId,
            role: userRole
        };

        const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: userRole });

    } catch (err) {
        res.status(500).json({ error: "Token refresh failed" });
    }
});

module.exports = router;