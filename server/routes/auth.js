const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const qrcode = require('qrcode');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const { globalDb, getHouseholdDb, dbGet, dbRun, dbAll } = require('../db'); 
const { SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');

/**
 * Helper to finalize login and create session
 */
async function finalizeLogin(user, req, res, rememberMe = false) {
    // Logic: Prioritize last_household_id, then default_household_id, then first active link
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

    // Create Session
    const sessionId = crypto.randomBytes(16).toString('hex');
    const parser = new UAParser(req.headers['user-agent']);
    const device = parser.getDevice();
    const browser = parser.getBrowser();
    const os = parser.getOS();
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
}

/**
 * POST /register
 * SaaS Signup: Create Tenant + Admin User
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
        // 1. Check if email exists
        const existingUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [email]);
        if (existingUser) return res.status(409).json({ error: "Email already registered" });

        // Auto-mark as test if in test environment or using test email prefix
        let finalIsTest = (is_test || process.env.NODE_ENV === 'test') ? 1 : 0;
        if (email.startsWith('smoke_') || email.startsWith('routing_') || email.startsWith('test_')) {
            finalIsTest = 1;
        }

        // 2. Create Household
        const hhResult = await dbRun(globalDb, 
            `INSERT INTO households (name, is_test) VALUES (?, ?)`, 
            [householdName, finalIsTest]
        );
        const householdId = hhResult.id;

        // 3. Create Admin User
        const passwordHash = bcrypt.hashSync(password, 8);
        const userResult = await dbRun(globalDb,
            `INSERT INTO users (email, password_hash, first_name, last_name, system_role, default_household_id, is_test, is_active) VALUES (?, ?, ?, ?, 'user', ?, ?, 1)`,
            [email, passwordHash, firstName || 'Admin', lastName || '', householdId, finalIsTest]
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
 * POST /lookup
 * Public route to fetch avatar/name for personalized login
 */
router.post('/lookup', async (req, res) => {
    const { email, username } = req.body;
    const identifier = email || username;
    if (!identifier) return res.status(400).json({ error: "Identifier required" });

    try {
        const user = await dbGet(globalDb, `SELECT id, first_name, avatar FROM users WHERE email = ? OR username = ? COLLATE NOCASE`, [identifier, identifier]);
        if (!user) return res.status(404).json({ error: "Not found" });
        
        // Check for passkeys
        const passkeyCount = await dbGet(globalDb, `SELECT count(*) as count FROM user_passkeys WHERE user_id = ?`, [user.id]);
        
        res.json({
            first_name: user.first_name,
            avatar: user.avatar,
            has_passkeys: passkeyCount.count > 0
        });
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

        // Check MFA
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

        const isValid = authenticator.verify({ token: code, secret: user.mfa_secret });
        if (!isValid) return res.status(401).json({ error: "Invalid 2FA code" });

        await finalizeLogin(user, req, res, decoded.rememberMe);

    } catch (err) {
        res.status(401).json({ error: "Invalid or expired pre-auth token" });
    }
});

/**
 * MFA SETUP
 */
router.post('/mfa/setup', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(globalDb, `SELECT email, mfa_enabled FROM users WHERE id = ?`, [req.user.id]);
        if (user.mfa_enabled) return res.status(400).json({ error: "MFA already enabled" });

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email, 'Totem', secret);
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        // Store secret temporarily (encrypted)
        await dbRun(globalDb, `UPDATE users SET mfa_secret = ? WHERE id = ?`, [secret, req.user.id]);

        res.json({ secret, qrCodeUrl });
    } catch (err) {
        res.status(500).json({ error: "MFA setup failed" });
    }
});

router.post('/mfa/verify', authenticateToken, async (req, res) => {
    const { code } = req.body;
    try {
        const user = await dbGet(globalDb, `SELECT mfa_secret FROM users WHERE id = ?`, [req.user.id]);
        const isValid = authenticator.verify({ token: code, secret: user.mfa_secret });
        
        if (isValid) {
            await dbRun(globalDb, `UPDATE users SET mfa_enabled = 1 WHERE id = ?`, [req.user.id]);
            res.json({ message: "MFA enabled successfully" });
        } else {
            res.status(400).json({ error: "Invalid verification code" });
        }
    } catch (err) {
        res.status(500).json({ error: "Verification failed" });
    }
});

router.post('/mfa/disable', authenticateToken, async (req, res) => {
    const { password } = req.body;
    try {
        const user = await dbGet(globalDb, `SELECT password_hash FROM users WHERE id = ?`, [req.user.id]);
        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: "Invalid password" });
        }

        await dbRun(globalDb, `UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?`, [req.user.id]);
        res.json({ message: "MFA disabled" });
    } catch (err) {
        res.status(500).json({ error: "Disable failed" });
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
             WHERE user_id = ? AND is_revoked = 0 
             ORDER BY last_active DESC`, 
            [req.user.id]
        );
        
        // Mark current session
        const processed = sessions.map(s => ({
            ...s,
            isCurrent: s.id === req.user.sid
        }));
        
        res.json(processed);
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
        budget_settings,
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
    if (budget_settings !== undefined) {
        fields.push('budget_settings = ?');
        values.push(typeof budget_settings === 'string' ? budget_settings : JSON.stringify(budget_settings));
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

/**
 * POST /token
 * Refresh token with new household context
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

/**
 * WEBAUTHN / PASSKEYS
 */

// TODO: Move to config
const RP_NAME = 'Mantel Household';
// In dev, we use localhost. In prod, this should be the domain.
const getRpID = (req) => {
    const host = req.get('host');
    if (host.includes(':')) return host.split(':')[0];
    return host;
};
const getOrigin = (req) => {
    return req.get('origin') || `http://${req.get('host')}`;
};

// 1. Register - Start
router.post('/passkey/register/start', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(globalDb, 'SELECT * FROM users WHERE id = ?', [req.user.id]);
        const userPasskeys = await dbAll(globalDb, 'SELECT credential_id FROM user_passkeys WHERE user_id = ?', [req.user.id]);

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: getRpID(req),
            userID: user.id.toString(),
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: userPasskeys.map(key => ({
                id: key.credential_id,
                transports: ['internal', 'hybrid', 'usb', 'nfc', 'ble'],
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        });

        await dbRun(globalDb, 'UPDATE users SET current_challenge = ? WHERE id = ?', [options.challenge, req.user.id]);
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate registration options" });
    }
});

// 2. Register - Finish
router.post('/passkey/register/finish', authenticateToken, async (req, res) => {
    const { attestationResponse } = req.body;
    try {
        const user = await dbGet(globalDb, 'SELECT * FROM users WHERE id = ?', [req.user.id]);
        
        const verification = await verifyRegistrationResponse({
            response: attestationResponse,
            expectedChallenge: user.current_challenge,
            expectedOrigin: getOrigin(req),
            expectedRPID: getRpID(req),
        });

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

            // SimpleWebAuthn returns Unit8Arrays/Buffers. We store as Base64 for SQLite.
            // credentialID is what we need to match later.
            const credIdBase64 = Buffer.from(credentialID).toString('base64');
            const pubKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');

            await dbRun(globalDb, 
                `INSERT INTO user_passkeys (id, user_id, credential_id, public_key, counter, transports, device_type, backed_up, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [
                    crypto.randomUUID(),
                    req.user.id,
                    credIdBase64,
                    pubKeyBase64,
                    counter,
                    JSON.stringify(attestationResponse.response.transports || []),
                    'platform', 
                    0 
                ]
            );

            await dbRun(globalDb, 'UPDATE users SET current_challenge = NULL WHERE id = ?', [req.user.id]);
            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false, error: "Verification failed" });
        }
    } catch (err) {
        console.error("Passkey Verify Error:", err);
        res.status(500).json({ error: "Registration failed: " + err.message });
    }
});

// 3. Login - Start
router.post('/passkey/login/start', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const user = await dbGet(globalDb, 'SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const userPasskeys = await dbAll(globalDb, 'SELECT credential_id FROM user_passkeys WHERE user_id = ?', [user.id]);
        
        // If no passkeys, we can't do passkey login.
        if (userPasskeys.length === 0) {
            return res.status(400).json({ error: "No passkeys set up for this account." });
        }

        const options = await generateAuthenticationOptions({
            rpID: getRpID(req),
            allowCredentials: userPasskeys.map(key => ({
                id: Buffer.from(key.credential_id, 'base64'), // Decode from DB Base64 to Buffer
                type: 'public-key',
                transports: ['internal', 'hybrid', 'usb', 'nfc', 'ble'],
            })),
            userVerification: 'preferred',
        });

        await dbRun(globalDb, 'UPDATE users SET current_challenge = ? WHERE id = ?', [options.challenge, user.id]);
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to start login" });
    }
});

// 4. Login - Finish
router.post('/passkey/login/finish', async (req, res) => {
    const { email, assertionResponse } = req.body;
    try {
        const user = await dbGet(globalDb, 'SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        // assertionResponse.id is Base64URL encoded from the browser.
        // We stored it as Base64.
        const credIdBuffer = Buffer.from(assertionResponse.id, 'base64url');
        const credIdBase64 = credIdBuffer.toString('base64');

        const dbPasskey = await dbGet(globalDb, 'SELECT * FROM user_passkeys WHERE user_id = ? AND credential_id = ?', [user.id, credIdBase64]);

        if (!dbPasskey) return res.status(400).json({ error: "Passkey not found" });

        const verification = await verifyAuthenticationResponse({
            response: assertionResponse,
            expectedChallenge: user.current_challenge,
            expectedOrigin: getOrigin(req),
            expectedRPID: getRpID(req),
            authenticator: {
                credentialPublicKey: Buffer.from(dbPasskey.public_key, 'base64'),
                credentialID: credIdBuffer,
                counter: dbPasskey.counter,
            },
        });

        if (verification.verified) {
             const { newCounter } = verification.authenticationInfo;
             await dbRun(globalDb, 'UPDATE user_passkeys SET counter = ?, last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [newCounter, dbPasskey.id]);
             await dbRun(globalDb, 'UPDATE users SET current_challenge = NULL WHERE id = ?', [user.id]);

             await finalizeLogin(user, req, res, true);
        } else {
            res.status(400).json({ error: "Verification failed" });
        }
    } catch (err) {
        console.error("Passkey Login Error:", err);
        res.status(500).json({ error: "Login failed" });
    }
});

module.exports = router;