const express = require('express');
const router = express.Router();
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { globalDb } = require('../db');
const jwt = require('jsonwebtoken');
const { SECRET_KEY, authenticateToken } = require('../middleware/auth');

const RP_NAME = 'Hearth Household';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || `http://${RP_ID}:5173`; // Default to Vite dev server

// Helper to get user by ID
const getUser = (id) => {
    return new Promise((resolve, reject) => {
        globalDb.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Helper to get user by Email
const getUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        globalDb.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Helper to update user challenge
const setUserChallenge = (id, challenge) => {
    return new Promise((resolve, reject) => {
        globalDb.run("UPDATE users SET current_challenge = ? WHERE id = ?", [challenge, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Helper to get user passkeys
const getUserPasskeys = (userId) => {
    return new Promise((resolve, reject) => {
        globalDb.all("SELECT * FROM passkeys WHERE user_id = ?", [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
};

// Helper to save passkey
const savePasskey = (passkey) => {
    return new Promise((resolve, reject) => {
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
        globalDb.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Helper to update passkey counter
const updatePasskeyCounter = (id, counter) => {
    return new Promise((resolve, reject) => {
        globalDb.run("UPDATE passkeys SET counter = ?, last_used_at = CURRENT_TIMESTAMP WHERE id = ?", [counter, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// --- REGISTRATION ---

router.get('/register/options', authenticateToken, async (req, res) => {
    try {
        const user = await getUser(req.user.id);
        const userPasskeys = await getUserPasskeys(user.id);

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            userID: new Uint8Array(Buffer.from(String(user.id))),
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: userPasskeys.map(pk => ({
                id: pk.id,
                transports: pk.transports ? JSON.parse(pk.transports) : undefined,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform', // Prefer platform (TouchID/FaceID)
            },
        });

        await setUserChallenge(user.id, options.challenge);
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/register/verify', authenticateToken, async (req, res) => {
    try {
        const user = await getUser(req.user.id);
        const expectedChallenge = user.current_challenge;

        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin: (origin) => {
                // Allow matching against env ORIGIN or localhost variants
                if (origin === ORIGIN) return true;
                if (origin === 'http://localhost:5173') return true;
                if (origin === 'http://127.0.0.1:5173') return true;
                return false; 
            },
            expectedRPID: RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

            await savePasskey({
                id: credentialID,
                userID: user.id,
                webAuthnUserID: user.id, // Simple mapping
                publicKey: Buffer.from(credentialPublicKey).toString('base64'),
                counter,
                deviceType: credentialDeviceType,
                backedUp: credentialBackedUp,
                transports: req.body.response.transports,
            });

            await setUserChallenge(user.id, null); // Clear challenge
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

        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            allowCredentials: userPasskeys.map(pk => ({
                id: pk.id,
                transports: pk.transports ? JSON.parse(pk.transports) : undefined,
            })),
            userVerification: 'preferred',
        });

        await setUserChallenge(user.id, options.challenge);
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/login/verify', async (req, res) => {
    try {
        const { email } = req.body; // Pass email in body alongside credential
        const user = await getUserByEmail(email);
        if (!user) return res.status(404).json({ error: "User not found" });

        const expectedChallenge = user.current_challenge;
        const userPasskeys = await getUserPasskeys(user.id);
        
        // Find the passkey used
        const passkey = userPasskeys.find(pk => pk.id === req.body.id);
        if (!passkey) return res.status(400).json({ error: "Passkey not matched" });

        const verification = await verifyAuthenticationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin: (origin) => {
                if (origin === ORIGIN) return true;
                if (origin === 'http://localhost:5173') return true;
                if (origin === 'http://127.0.0.1:5173') return true;
                return false;
            },
            expectedRPID: RP_ID,
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
            await setUserChallenge(user.id, null);

            // Issue JWT
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
