const express = require('express');
const router = express.Router();
const { 
    generateRegistrationOptions, 
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { globalDb, dbGet, dbRun, dbAll } = require('../db');
const { RP_ID, RP_NAME, SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');

// Helper to finalize login (re-used from auth.js or shared service)
// Since I can't easily share the function from auth.js without refactoring, I'll copy it for this POC
// or better, I should have put it in a service. 
// For now, I'll implement a simplified version or try to import it if I refactor auth.js later.
// Actually, I'll just copy the core logic for now to keep the POC self-contained.

async function finalizeLogin(user, req, res, rememberMe = false) {
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
 * Registration: Generate Options
 */
router.get('/register-options', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE id = ?`, [req.user.id]);
        const userAuthenticators = await dbAll(globalDb, `SELECT credential_id FROM user_authenticators WHERE user_id = ?`, [user.id]);

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            userID: user.id.toString(),
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: userAuthenticators.map(auth => ({
                id: auth.credential_id,
                type: 'public-key',
                transports: ['internal', 'usb', 'ble', 'nfc'],
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        });

        // Store challenge
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
        await dbRun(globalDb, `INSERT INTO webauthn_challenges (challenge, user_id, expires_at) VALUES (?, ?, ?)`, [options.challenge, user.id, expiresAt]);

        res.json(options);
    } catch (err) {
        console.error("WebAuthn Registration Options Error:", err);
        res.status(500).json({ error: "Failed to generate registration options" });
    }
});

/**
 * Registration: Verify
 */
router.post('/register-verify', authenticateToken, async (req, res) => {
    const { body } = req;
    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE id = ?`, [req.user.id]);
        
        // Find challenge
        const challengeRow = await dbGet(globalDb, `SELECT * FROM webauthn_challenges WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1`, [user.id]);
        if (!challengeRow) {
            return res.status(400).json({ error: "Challenge not found or expired" });
        }

        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: challengeRow.challenge,
            expectedOrigin: `https://${RP_ID}`, // Adjust if using http
            expectedRPID: RP_ID,
        });

        if (verification.verified) {
            const { registrationInfo } = verification;
            const { credentialPublicKey, credentialID, counter } = registrationInfo;

            // Save to DB
            await dbRun(globalDb, 
                `INSERT INTO user_authenticators (id, user_id, credential_id, public_key, counter, device_type, backed_up, transports) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    crypto.randomUUID(),
                    user.id,
                    Buffer.from(credentialID).toString('base64url'),
                    Buffer.from(credentialPublicKey).toString('base64url'),
                    counter,
                    registrationInfo.credentialDeviceType,
                    registrationInfo.credentialBackedUp ? 1 : 0,
                    JSON.stringify(body.response.transports || [])
                ]
            );

            // Cleanup challenge
            await dbRun(globalDb, `DELETE FROM webauthn_challenges WHERE challenge = ?`, [challengeRow.challenge]);

            res.json({ verified: true });
        } else {
            res.status(400).json({ error: "Verification failed" });
        }
    } catch (err) {
        console.error("WebAuthn Registration Verify Error:", err);
        res.status(500).json({ error: "Failed to verify registration" });
    }
});

/**
 * Authentication: Generate Options
 */
router.post('/login-options', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE email = ? COLLATE NOCASE`, [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const userAuthenticators = await dbAll(globalDb, `SELECT credential_id FROM user_authenticators WHERE user_id = ?`, [user.id]);
        if (userAuthenticators.length === 0) {
            return res.status(400).json({ error: "No passkeys registered for this user" });
        }

        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            allowCredentials: userAuthenticators.map(auth => ({
                id: auth.credential_id,
                type: 'public-key',
                transports: ['internal', 'usb', 'ble', 'nfc'],
            })),
            userVerification: 'preferred',
        });

        // Store challenge
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await dbRun(globalDb, `INSERT INTO webauthn_challenges (challenge, user_id, expires_at) VALUES (?, ?, ?)`, [options.challenge, user.id, expiresAt]);

        res.json(options);
    } catch (err) {
        console.error("WebAuthn Login Options Error:", err);
        res.status(500).json({ error: "Failed to generate login options" });
    }
});

/**
 * Authentication: Verify
 */
router.post('/login-verify', async (req, res) => {
    const { body, email, rememberMe } = req.body;
    try {
        const user = await dbGet(globalDb, `SELECT * FROM users WHERE email = ? COLLATE NOCASE`, [email]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const dbAuthenticator = await dbGet(globalDb, `SELECT * FROM user_authenticators WHERE credential_id = ? AND user_id = ?`, [body.id, user.id]);
        if (!dbAuthenticator) {
            return res.status(400).json({ error: "Authenticator not found" });
        }

        // Find challenge
        const challengeRow = await dbGet(globalDb, `SELECT * FROM webauthn_challenges WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1`, [user.id]);
        if (!challengeRow) {
            return res.status(400).json({ error: "Challenge not found or expired" });
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challengeRow.challenge,
            expectedOrigin: `https://${RP_ID}`, // Adjust if using http
            expectedRPID: RP_ID,
            authenticator: {
                credentialID: dbAuthenticator.credential_id,
                credentialPublicKey: Buffer.from(dbAuthenticator.public_key, 'base64url'),
                counter: dbAuthenticator.counter,
            },
        });

        if (verification.verified) {
            const { authenticationInfo } = verification;
            const { newCounter } = authenticationInfo;

            // Update counter
            await dbRun(globalDb, `UPDATE user_authenticators SET counter = ? WHERE credential_id = ?`, [newCounter, dbAuthenticator.credential_id]);

            // Cleanup challenge
            await dbRun(globalDb, `DELETE FROM webauthn_challenges WHERE challenge = ?`, [challengeRow.challenge]);

            // Finalize login
            await finalizeLogin(user, req, res, rememberMe);
        } else {
            res.status(400).json({ error: "Verification failed" });
        }
    } catch (err) {
        console.error("WebAuthn Login Verify Error:", err);
        res.status(500).json({ error: "Failed to verify login" });
    }
});

module.exports = router;
