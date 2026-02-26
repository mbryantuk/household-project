const express = require('express');
const router = express.Router();
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { db } = require('../db/index');
const { users, passkeys } = require('../db/schema');
const { eq, and } = require('drizzle-orm');
const { authenticateToken } = require('../middleware/auth');
const base64url = require('base64url');
const { finalizeLogin } = require('../services/auth');
const redis = require('../services/redis');
const logger = require('../utils/logger');
const response = require('../utils/response');

const RP_NAME = 'Hearthstone';

// Helper to determine RP_ID and Origin dynamically
const getRpConfig = (req) => {
  const rpID = process.env.RP_ID || req.hostname;
  let origin = req.get('Origin') || req.get('Referer');
  if (origin) {
    try {
      const url = new URL(origin);
      origin = url.origin;
    } catch (e) {
      origin = null;
    }
  }

  if (!origin) {
    const protocol = req.secure || req.get('X-Forwarded-Proto') === 'https' ? 'https' : 'http';
    origin = `${protocol}://${rpID}`;
  }

  return { rpID, origin };
};

// --- CHALLENGE STORAGE (Using Redis) ---

const saveChallenge = async ({ challenge, userId = null, email = null }) => {
  const key = userId ? `webauthn:challenge:user:${userId}` : `webauthn:challenge:email:${email}`;
  await redis.set(key, challenge, 'EX', 600); // 10 mins
};

const verifyAndConsumeChallenge = async ({ challenge, userId = null, email = null }) => {
  const key = userId ? `webauthn:challenge:user:${userId}` : `webauthn:challenge:email:${email}`;
  const saved = await redis.get(key);
  if (saved === challenge) {
    await redis.del(key);
    return true;
  }
  return false;
};

// Extract challenge from WebAuthn response clientDataJSON
const extractChallenge = (payload) => {
  try {
    if (!payload || !payload.response || !payload.response.clientDataJSON) {
      return null;
    }
    const clientDataJSON = payload.response.clientDataJSON;
    const decoded = JSON.parse(base64url.decode(clientDataJSON));
    return decoded.challenge;
  } catch (err) {
    logger.error('❌ [AUTH_PASSKEYS] Challenge extraction error:', err.message);
    return null;
  }
};

// --- REGISTRATION ---

/**
 * GET /api/passkeys/register/options
 * Generates options for creating a new passkey.
 */
router.get('/register/options', authenticateToken, async (req, res, next) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userPasskeys = await db.select().from(passkeys).where(eq(passkeys.userId, user.id));
    const { rpID } = getRpConfig(req);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: Buffer.from(String(user.id)),
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: userPasskeys.map((pk) => ({
        id: pk.id,
        transports: pk.transports ? JSON.parse(pk.transports) : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await saveChallenge({ challenge: options.challenge, userId: user.id });
    res.json(options);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/passkeys/register/verify
 * Verifies the response from the authenticator and saves the new passkey.
 */
router.post('/register/verify', authenticateToken, async (req, res, next) => {
  try {
    const challenge = extractChallenge(req.body);

    if (!challenge || !(await verifyAndConsumeChallenge({ challenge, userId: req.user.id }))) {
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
        'https://hearthstone.mbryantuk.uk',
      ],
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;
      const { publicKey, id, counter } = credential;

      await db.insert(passkeys).values({
        id,
        userId: req.user.id,
        webauthnUserId: String(req.user.id),
        publicKey: Buffer.from(publicKey).toString('base64'),
        counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: JSON.stringify(req.body.response.transports || []),
      });

      response.success(res, { verified: true });
    } else {
      res.status(400).json({ verified: false, error: 'Verification failed' });
    }
  } catch (err) {
    next(err);
  }
});

// --- AUTHENTICATION ---

/**
 * GET /api/passkeys/login/options
 * Generates options for logging in with a passkey.
 */
router.get('/login/options', async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userPasskeys = await db.select().from(passkeys).where(eq(passkeys.userId, user.id));
    if (userPasskeys.length === 0)
      return res.status(400).json({ error: 'No passkeys found for this user' });

    const { rpID } = getRpConfig(req);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userPasskeys.map((pk) => ({
        id: pk.id,
        transports: pk.transports ? JSON.parse(pk.transports) : undefined,
      })),
      userVerification: 'preferred',
    });

    await saveChallenge({ challenge: options.challenge, email: user.email });
    res.json(options);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/passkeys/login/verify
 * Verifies the passkey login response.
 */
router.post('/login/verify', async (req, res, next) => {
  try {
    const { email } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const challenge = extractChallenge(req.body);
    if (!challenge || !(await verifyAndConsumeChallenge({ challenge, email: user.email }))) {
      return res.status(400).json({ verified: false, error: 'Challenge expired or invalid' });
    }

    const [passkey] = await db
      .select()
      .from(passkeys)
      .where(and(eq(passkeys.id, req.body.id), eq(passkeys.userId, user.id)))
      .limit(1);

    if (!passkey) {
      return res.status(400).json({ error: 'Passkey not matched' });
    }

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
        'https://hearthstone.mbryantuk.uk',
      ],
      expectedRPID: rpID,
      credential: {
        id: passkey.id,
        publicKey: Buffer.from(passkey.publicKey, 'base64'),
        counter: passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      },
    });

    if (verification.verified) {
      const { newCounter } = verification.authenticationInfo;
      await db
        .update(passkeys)
        .set({ counter: newCounter, lastUsedAt: new Date() })
        .where(eq(passkeys.id, passkey.id));

      await finalizeLogin(user, req, res, req.body.rememberMe || false);
    } else {
      res.status(400).json({ verified: false, error: 'Verification failed' });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/passkeys
 * Lists all passkeys for the current user.
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const results = await db.select().from(passkeys).where(eq(passkeys.userId, req.user.id));
    response.success(
      res,
      results.map((pk) => ({
        id: pk.id,
        createdAt: pk.createdAt,
        lastUsedAt: pk.lastUsedAt,
        deviceType: pk.deviceType,
      }))
    );
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/passkeys/:id
 * Deletes a passkey.
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db
      .delete(passkeys)
      .where(and(eq(passkeys.id, id), eq(passkeys.userId, req.user.id)));

    if (result.rowCount === 0) return res.status(404).json({ error: 'Passkey not found' });
    response.success(res, { success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
