const express = require('express');
const router = express.Router();
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { globalDb, dbRun, dbGet, dbAll } = require('../db');
const jwt = require('jsonwebtoken');
const { SECRET_KEY, authenticateToken } = require('../middleware/auth');
const base64url = require('base64url');

const RP_NAME = 'Hearth Household';

// Helper to determine RP_ID and Origin dynamically
const getRpConfig = (req) => {
    const rpID = process.env.RP_ID || req.hostname;
    const origin = req.get('Origin') || `https://${rpID}`; 
    return { rpID, origin };
};

// --- CHALLENGE STORAGE (Multi-instance safe) ---

const saveChallenge = async ({ challenge, userId = null, email = null }) => {
    await dbRun(globalDb, 
        `INSERT INTO user_challenges (challenge, user_id, email, expires_at) 
         VALUES (?, ?, ?, datetime('now', '+10 minutes'))`,
        [challenge, userId, email]
    );
};

const verifyAndConsumeChallenge = async ({ challenge, userId = null, email = null }) => {
    const sql = userId 
        ? `SELECT * FROM user_challenges WHERE challenge = ? AND user_id = ? AND expires_at > datetime('now')`
        : `SELECT * FROM user_challenges WHERE challenge = ? AND email = ? AND expires_at > datetime('now')`;
    const params = userId ? [challenge, userId] : [challenge, email];
    
    const row = await dbGet(globalDb, sql, params);
    if (row) {
        await dbRun(globalDb, `DELETE FROM user_challenges WHERE challenge = ?`, [challenge]);
        return true;
    }
    return false;
};

// Extract challenge from WebAuthn response clientDataJSON
const extractChallenge = (payload) => {
    try {
        if (!payload || !payload.response || !payload.response.clientDataJSON) {
            console.error("❌ [AUTH_PASSKEYS] Missing clientDataJSON in payload:", JSON.stringify(payload));
            return null;
        }
        const clientDataJSON = payload.response.clientDataJSON;
        const decoded = JSON.parse(base64url.decode(clientDataJSON));
        return decoded.challenge;
    } catch (err) {
        console.error("❌ [AUTH_PASSKEYS] Challenge extraction error:", err.message);
        return null;
    }
};

// Helper to get user by ID
const getUser = (id) => dbGet(globalDb, "SELECT * FROM users WHERE id = ?", [id]);

// Helper to get user by Email
const getUserByEmail = (email) => dbGet(globalDb, "SELECT * FROM users WHERE email = ?", [email]);

// Helper to get user passkeys
const getUserPasskeys = (userId) => dbAll(globalDb, "SELECT * FROM passkeys WHERE user_id = ?", [userId]);

// Helper to save passkey
const savePasskey = (passkey) => {
    const sql = `INSERT INTO passkeys (id, user_id, webauthn_user_id, public_key, counter, device_type, backed_up, transports) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        passkey.id,
        passkey.userID,
        passkey.webAuthnUserID,
        passkey.publicKey,
        passkey.counter,
        passkey.deviceType,
        passkey.backedUp ? 1 : 0,
        JSON.stringify(passkey.transports)
    ];
    return dbRun(globalDb, sql, params);
};

// Helper to update passkey counter
const updatePasskeyCounter = (id, counter) => {
    return dbRun(globalDb, "UPDATE passkeys SET counter = ?, last_used_at = CURRENT_TIMESTAMP WHERE id = ?", [counter, id]);
};

// --- REGISTRATION ---

router.get('/register/options', authenticateToken, async (req, res) => {
    try {
        const user = await getUser(req.user.id);
        const userPasskeys = await getUserPasskeys(user.id);
        const { rpID } = getRpConfig(req);

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID,
            userID: Buffer.from(String(user.id)), // v13 handles Buffer/Uint8Array
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: userPasskeys.map(pk => ({
                id: pk.id,
                transports: pk.transports ? JSON.parse(pk.transports) : undefined,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform', 
            },
        });

        await saveChallenge({ challenge: options.challenge, userId: user.id });
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/register/verify', authenticateToken, async (req, res) => {
    try {
        const user = await getUser(req.user.id);
        const challenge = extractChallenge(req.body);
        
        if (!challenge || !(await verifyAndConsumeChallenge({ challenge, userId: user.id }))) {
            return res.status(400).json({ verified: false, error: 'Challenge expired or invalid' });
        }

        const { rpID, origin } = getRpConfig(req);

        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge: challenge,
            expectedOrigin: [
                origin,
                'http://localhost:3000',
                'http://localhost:5173',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:5173',
                'https://hearthstone.mbryantuk.uk'
            ],
            expectedRPID: rpID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

            if (!credentialPublicKey) {
                return res.status(400).json({ verified: false, error: 'Registration info missing public key' });
            }

            await savePasskey({
                id: credentialID,
                userID: user.id,
                webAuthnUserID: user.id, 
                publicKey: Buffer.from(credentialPublicKey).toString('base64'),
                counter,
                deviceType: credentialDeviceType,
                backedUp: credentialBackedUp,
                transports: req.body.response.transports,
            });

            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false, error: 'Verification failed' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- AUTHENTICATION ---

router.get('/login/options', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: "Email required" });

        const user = await getUserByEmail(email);
        if (!user) return res.status(404).json({ error: "User not found" });

        const userPasskeys = await getUserPasskeys(user.id);
        if (userPasskeys.length === 0) return res.status(400).json({ error: "No passkeys found for this user" });

        const { rpID } = getRpConfig(req);

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: userPasskeys.map(pk => ({
                id: pk.id,
                transports: pk.transports ? JSON.parse(pk.transports) : undefined,
            })),
            userVerification: 'preferred',
        });

        await saveChallenge({ challenge: options.challenge, email: user.email });
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/login/verify', async (req, res) => {
    try {
        const { email } = req.body; 
        const user = await getUserByEmail(email);
        if (!user) return res.status(404).json({ error: "User not found" });

        const challenge = extractChallenge(req.body);
        if (!challenge || !(await verifyAndConsumeChallenge({ challenge, email: user.email }))) {
            return res.status(400).json({ verified: false, error: 'Challenge expired or invalid' });
        }

        const userPasskeys = await getUserPasskeys(user.id);
        const passkey = userPasskeys.find(pk => pk.id === req.body.id);
        if (!passkey) return res.status(400).json({ error: "Passkey not matched" });

        const { rpID, origin } = getRpConfig(req);

        const verification = await verifyAuthenticationResponse({
            response: req.body,
            expectedChallenge: challenge,
            expectedOrigin: [
                origin,
                'http://localhost:3000',
                'http://localhost:5173',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:5173',
                'https://hearthstone.mbryantuk.uk'
            ],
            expectedRPID: rpID,
            authenticator: {
                credentialID: passkey.id,
                credentialPublicKey: Buffer.from(passkey.public_key, 'base64'),
                counter: passkey.counter,
                transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
            },
        });

        if (verification.verified) {
            const { newCounter } = verification.authenticationInfo;
            await updatePasskeyCounter(passkey.id, newCounter);

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.system_role },
                SECRET_KEY,
                { expiresIn: '7d' }
            );

            res.json({ verified: true, token, user });
        } else {
            res.status(400).json({ verified: false, error: 'Verification failed' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// List passkeys
router.get('/', authenticateToken, async (req, res) => {
    try {
        const passkeys = await getUserPasskeys(req.user.id);
        res.json(passkeys.map(pk => ({
            id: pk.id,
            created_at: pk.created_at,
            last_used_at: pk.last_used_at,
            device_type: pk.device_type
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete passkey
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        globalDb.run("DELETE FROM passkeys WHERE id = ? AND user_id = ?", [id, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Passkey not found" });
            res.json({ success: true });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
