const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otplib = require('otplib');
const crypto = require('crypto');
const qrcode = require('qrcode');
const uap = require('ua-parser-js');
const UAParser = uap.UAParser || uap;
const { globalDb, getHouseholdDb, dbGet, dbRun, dbAll } = require('../db'); 
const { SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');

/**
 * Helper to finalize login and create session
 */
async function finalizeLogin(user, req, res, rememberMe = false) {
    try {
        let householdId = user.last_household_id || user.default_household_id;
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

        const sessionId = crypto.randomBytes(16).toString('hex');
        const parser = new UAParser(req.headers['user-agent']);
        const device = parser.getDevice() || {};
        const browser = parser.getBrowser() || {};
        const os = parser.getOS() || {};
        const deviceInfo = `${browser.name || 'Unknown'} on ${os.name || 'Unknown'} (${device.model || 'Desktop'})`;

        const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000).toISOString();
        
        await dbRun(globalDb, 
            `INSERT INTO user_sessions (id, user_id, device_info, ip_address, user_agent, expires_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sessionId, user.id, deviceInfo, req.ip, req.headers['user-agent'], expiresAt]
        );

        const tokenPayload = {
            id: user.id,
            sid: sessionId,
            email: user.email,
            system_role: user.system_role,
            householdId: householdId,
            role: userRole
        };

        const expiresIn = rememberMe ? '30d' : '24h';
        const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn });

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
                sticky_note: user.sticky_note,
                mfa_enabled: !!user.mfa_enabled
            },
            household: householdData
        });
    } catch (err) {
        console.error("Finalize Login Error:", err);
        throw err;
    }
}

router.post('/register', async (req, res) => {
    const { householdName, email, password, firstName, lastName, is_test } = req.body;
    if (!householdName || !email || !password) return res.status(400).json({ error: "Missing required fields" });

    if (process.env.NODE_ENV !== 'test') {
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(password)) return res.status(400).json({ error: "Password too weak" });
    }

    try {
        const existingUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        if (existingUser) return res.status(409).json({ error: "Email already registered" });

        let finalIsTest = (is_test || process.env.NODE_ENV === 'test') ? 1 : 0;
        const hhResult = await dbRun(globalDb, `INSERT INTO households (name, is_test) VALUES (?, ?)`, [householdName, finalIsTest]);
        const householdId = hhResult.id;

        const passwordHash = bcrypt.hashSync(password, 8);
        const userResult = await dbRun(globalDb,
            `INSERT INTO users (email, password_hash, first_name, last_name, system_role, default_household_id, is_test, is_active) VALUES (?, ?, ?, ?, 'user', ?, ?, 1)`,
            [email, passwordHash, firstName || 'Admin', lastName || '', householdId, finalIsTest]
        );
        const userId = userResult.id;

        await dbRun(globalDb, `INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')`, [userId, householdId]);
        getHouseholdDb(householdId).close();

        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Registration failed: " + err.message });
    }
});

router.post('/lookup', async (req, res) => {
    const identifier = req.body.email || req.body.username;
    if (!identifier) return res.status(400).json({ error: "Identifier required" });
    try {
        const user = await dbGet(globalDb, `SELECT first_name, avatar FROM users WHERE email = ? OR username = ? COLLATE NOCASE`, [identifier, identifier]);
        if (!user) return res.status(404).json({ error: "Not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Lookup failed" });
    }
});

router.post('/login', async (req, res) => {
    const { email, password, username, rememberMe } = req.body;
    const identifier = email || username;
    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE email = ? OR username = ? COLLATE NOCASE`, [identifier, identifier]);
        if (!user) return res.status(404).json({ error: "Invalid credentials" });
        if (!user.is_active) return res.status(403).json({ error: "Account deactivated" });

        if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "Invalid credentials" });

        if (user.mfa_enabled) {
            const preAuthToken = jwt.sign({ preAuthId: user.id, type: 'mfa_pending', rememberMe }, SECRET_KEY, { expiresIn: '5m' });
            return res.json({ mfa_required: true, preAuthToken });
        }
        await finalizeLogin(user, req, res, rememberMe);
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Login failed" });
    }
});

router.post('/mfa/login', async (req, res) => {
    const { preAuthToken, code } = req.body;
    if (!preAuthToken || !code) return res.status(400).json({ error: "Code and pre-auth token required" });
    try {
        const decoded = jwt.verify(preAuthToken, SECRET_KEY);
        if (decoded.type !== 'mfa_pending') throw new Error("Invalid token type");

        const user = await dbGet(globalDb, `SELECT * FROM users WHERE id = ?`, [decoded.preAuthId]);
        if (!user || !user.is_active) return res.status(403).json({ error: "User inactive" });

        const secret = decrypt(user.mfa_secret);
        if (!secret) throw new Error("MFA secret missing");
        
        const verifyResult = await otplib.verify({ token: code, secret });
        if (!verifyResult || !verifyResult.valid) return res.status(401).json({ error: "Invalid 2FA code" });

        await finalizeLogin(user, req, res, decoded.rememberMe);
    } catch (err) {
        console.error("MFA Login Error:", err);
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Invalid or expired pre-auth token" });
        }
        res.status(500).json({ error: "MFA login failed: " + err.message });
    }
});

router.post('/mfa/setup', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(globalDb, `SELECT email, mfa_enabled FROM users WHERE id = ?`, [req.user.id]);
        if (user.mfa_enabled) return res.status(400).json({ error: "MFA already enabled" });

        const secret = otplib.generateSecret();
        const otpauth = otplib.generateURI({ label: user.email, issuer: 'Mantel', secret });
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        await dbRun(globalDb, `UPDATE users SET mfa_secret = ? WHERE id = ?`, [encrypt(secret), req.user.id]);
        res.json({ secret, qrCodeUrl });
    } catch (err) {
        console.error("MFA Setup Error:", err);
        res.status(500).json({ error: "MFA setup failed: " + err.message });
    }
});

router.post('/mfa/verify', authenticateToken, async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Verification code required" });
    
    try {
        const user = await dbGet(globalDb, `SELECT mfa_secret FROM users WHERE id = ?`, [req.user.id]);
        const secret = decrypt(user.mfa_secret);
        if (!secret) throw new Error("MFA secret not set");

        const verifyResult = await otplib.verify({ token: code, secret });
        if (verifyResult && verifyResult.valid) {
            await dbRun(globalDb, `UPDATE users SET mfa_enabled = 1 WHERE id = ?`, [req.user.id]);
            res.json({ message: "MFA enabled successfully" });
        } else {
            res.status(400).json({ error: "Invalid verification code" });
        }
    } catch (err) {
        console.error("MFA Verify Error:", err);
        res.status(500).json({ error: "Verification failed: " + err.message });
    }
});

router.post('/mfa/disable', authenticateToken, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });
    
    try {
        const user = await dbGet(globalDb, `SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
        if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "Invalid password" });
        await dbRun(globalDb, `UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?`, [req.user.id]);
        res.json({ message: "MFA disabled" });
    } catch (err) {
        console.error("MFA Disable Error:", err);
        res.status(500).json({ error: "Disable failed: " + err.message });
    }
});

router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await dbAll(globalDb, `SELECT id, device_info, ip_address, last_active, created_at, expires_at FROM user_sessions WHERE user_id = ? AND is_revoked = 0 ORDER BY last_active DESC`, [req.user.id]);
        res.json(sessions.map(s => ({ ...s, isCurrent: s.id === req.user.sid })));
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});

router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        await dbRun(globalDb, `UPDATE user_sessions SET is_revoked = 1 WHERE id = ? AND user_id = ?`, [req.params.sessionId, req.user.id]);
        res.json({ message: "Session revoked" });
    } catch (err) {
        res.status(500).json({ error: "Failed to revoke session" });
    }
});

router.delete('/sessions', authenticateToken, async (req, res) => {
    try {
        await dbRun(globalDb, `UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND id != ?`, [req.user.id, req.user.sid]);
        res.json({ message: "All other sessions revoked" });
    } catch (err) {
        res.status(500).json({ error: "Failed to revoke sessions" });
    }
});

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(globalDb, `SELECT id, email, username, first_name, last_name, avatar, system_role, dashboard_layout, sticky_note, theme, default_household_id FROM users WHERE id = ?`, [req.user.id]);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/profile', authenticateToken, async (req, res) => {
    const { email, password, firstName, lastName, first_name, last_name, avatar, dashboard_layout, sticky_note, budget_settings, theme, default_household_id } = req.body;
    let fields = [], values = [];
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
    if (dashboard_layout !== undefined) { fields.push('dashboard_layout = ?'); values.push(typeof dashboard_layout === 'string' ? dashboard_layout : JSON.stringify(dashboard_layout)); }
    if (budget_settings !== undefined) { fields.push('budget_settings = ?'); values.push(typeof budget_settings === 'string' ? budget_settings : JSON.stringify(budget_settings)); }
    if (fields.length === 0) return res.status(400).json({ error: "Nothing to update" });
    values.push(req.user.id);
    try {
        await dbRun(globalDb, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ message: "Profile updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/my-households', authenticateToken, async (req, res) => {
    try {
        const rows = await dbAll(globalDb, `SELECT h.*, uh.role, uh.is_active as link_active FROM households h JOIN user_households uh ON h.id = uh.household_id WHERE uh.user_id = ?`, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/token', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE id = ?`, [req.user.id]);
        if (!user || !user.is_active) return res.status(403).json({ error: "User inactive" });
        let userRole = 'member', targetHouseholdId = req.body.householdId;
        if (targetHouseholdId) {
            const link = await dbGet(globalDb, `SELECT * FROM user_households WHERE user_id = ? AND household_id = ? AND is_active = 1`, [user.id, targetHouseholdId]);
            if (!link) return res.status(403).json({ error: "Access denied" });
            userRole = link.role;
        }
        const token = jwt.sign({ id: user.id, sid: req.user.sid, email: user.email, system_role: user.system_role, householdId: targetHouseholdId, role: userRole }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: userRole });
    } catch (err) {
        res.status(500).json({ error: "Token refresh failed" });
    }
});

module.exports = router;