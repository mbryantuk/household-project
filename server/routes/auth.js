const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateSecret, generateURI, verify } = require('otplib');
const qrcode = require('qrcode');
const { db } = require('../db/index');
const { users, userSessions, userHouseholds, households } = require('../db/schema');
const { eq, and, or, ilike, sql } = require('drizzle-orm');
const { SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { finalizeLogin } = require('../services/auth');

/**
 * POST /register
 */
router.post('/register', async (req, res) => {
  const { householdName, email, password, firstName, lastName, is_test } = req.body;

  if (!householdName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (process.env.NODE_ENV !== 'test') {
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and include at least one number and one special character.',
      });
    }
  }

  try {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    let finalIsTest = is_test || process.env.NODE_ENV === 'test' ? 1 : 0;
    if (email.startsWith('smoke_') || email.startsWith('routing_') || email.startsWith('test_')) {
      finalIsTest = 1;
    }

    const passwordHash = bcrypt.hashSync(password, 8);

    // Atomic transaction for registration
    const result = await db.transaction(async (tx) => {
      const [hh] = await tx
        .insert(households)
        .values({
          name: householdName,
          isTest: finalIsTest,
        })
        .returning();

      const [user] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName: firstName || 'Admin',
          lastName: lastName || '',
          defaultHouseholdId: hh.id,
          isTest: finalIsTest,
        })
        .returning();

      await tx.insert(userHouseholds).values({
        userId: user.id,
        householdId: hh.id,
        role: 'admin',
      });

      return { user, hh };
    });

    res.status(201).json({ message: 'Registration successful. Please login.' });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

/**
 * POST /lookup
 */
router.post('/lookup', async (req, res) => {
  const { email, username } = req.body;
  const identifier = email || username;
  if (!identifier) return res.status(400).json({ error: 'Identifier required' });

  try {
    const results = await db
      .select({
        first_name: users.firstName,
        avatar: users.avatar,
      })
      .from(users)
      .where(or(ilike(users.email, identifier), eq(users.username, identifier)))
      .limit(1);

    if (results.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: 'Lookup failed' });
  }
});

/**
 * POST /login
 */
router.post('/login', async (req, res) => {
  const { email, password, username, rememberMe } = req.body;
  const identifier = email || username;

  try {
    const results = await db
      .select()
      .from(users)
      .where(or(ilike(users.email, identifier), eq(users.username, identifier)))
      .limit(1);

    if (results.length === 0) return res.status(404).json({ error: 'Invalid credentials' });
    const user = results[0];

    if (!user.isActive) {
      return res
        .status(403)
        .json({ error: 'Your account is deactivated. Please contact support.' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.mfaEnabled) {
      const preAuthToken = jwt.sign(
        { preAuthId: user.id, type: 'mfa_pending', rememberMe },
        SECRET_KEY,
        { expiresIn: '5m' }
      );
      return res.json({ mfa_required: true, preAuthToken });
    }

    // Adapt user object for finalizeLogin
    const compatUser = {
      ...user,
      first_name: user.firstName,
      last_name: user.lastName,
      last_household_id: user.lastHouseholdId,
      default_household_id: user.defaultHouseholdId,
      system_role: user.systemRole,
      dashboard_layout: user.dashboardLayout,
      sticky_note: user.stickyNote,
      custom_theme: user.customTheme,
      customTheme: user.customTheme,
      mfa_enabled: user.mfaEnabled,
    };

    await finalizeLogin(compatUser, req, res, rememberMe);
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * MFA SETUPS
 */
router.post('/mfa/setup', authenticateToken, async (req, res) => {
  try {
    const secret = generateSecret();
    const otpauth = generateURI({ secret, label: req.user.email, issuer: 'Hearth Household' });
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    await db.update(users).set({ mfaSecret: secret }).where(eq(users.id, req.user.id));
    res.json({ secret, qrCodeUrl });
  } catch (err) {
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

router.post('/mfa/verify', authenticateToken, async (req, res) => {
  const { code } = req.body;
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user || !user.mfaSecret) return res.status(400).json({ error: 'MFA not initiated' });

    const isValid = verify({ token: code, secret: user.mfaSecret });
    if (!isValid) return res.status(400).json({ error: 'Invalid code' });

    await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, req.user.id));
    res.json({ message: 'MFA Enabled' });
  } catch (err) {
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

router.post('/mfa/disable', authenticateToken, async (req, res) => {
  const { password } = req.body;
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) return res.status(403).json({ error: 'Invalid password' });

    await db
      .update(users)
      .set({ mfaEnabled: false, mfaSecret: null })
      .where(eq(users.id, req.user.id));
    res.json({ message: 'MFA Disabled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

router.post('/mfa/login', async (req, res) => {
  const { preAuthToken, code } = req.body;
  try {
    const decoded = jwt.verify(preAuthToken, SECRET_KEY);
    const [user] = await db.select().from(users).where(eq(users.id, decoded.preAuthId)).limit(1);
    if (!user || !user.isActive) return res.status(403).json({ error: 'User inactive' });

    const isValid = verify({ token: code, secret: user.mfaSecret });
    if (!isValid) return res.status(401).json({ error: 'Invalid 2FA code' });

    const compatUser = {
      ...user,
      first_name: user.firstName,
      last_name: user.lastName,
      last_household_id: user.lastHouseholdId,
      default_household_id: user.defaultHouseholdId,
      system_role: user.systemRole,
      dashboard_layout: user.dashboardLayout,
      sticky_note: user.stickyNote,
      custom_theme: user.customTheme,
      customTheme: user.customTheme,
      mfa_enabled: user.mfaEnabled,
    };

    await finalizeLogin(compatUser, req, res, decoded.rememberMe);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired pre-auth token' });
  }
});

/**
 * SESSION MANAGEMENT
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.userId, req.user.id), sql`${userSessions.expiresAt} > now()`))
      .orderBy(sql`${userSessions.lastActive} desc`);

    res.json(
      rows.map((s) => ({
        ...s,
        current: s.id === req.user.sid,
        created_at: s.createdAt,
        last_active: s.lastActive,
        expires_at: s.expiresAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.delete('/sessions', authenticateToken, async (req, res) => {
  try {
    await db
      .delete(userSessions)
      .where(and(eq(userSessions.userId, req.user.id), sql`${userSessions.id} != ${req.user.sid}`));
    res.json({ message: 'All other sessions logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to logout other sessions' });
  }
});

router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    await db
      .delete(userSessions)
      .where(and(eq(userSessions.id, req.params.id), eq(userSessions.userId, req.user.id)));
    res.json({ message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

/**
 * PROFILE
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      theme: user.theme,
      mode: user.mode || 'system',
      custom_theme: user.customTheme,
      customTheme: user.customTheme,
      dashboard_layout: user.dashboardLayout,
      dashboardLayout: user.dashboardLayout,
      sticky_note: user.stickyNote,
      stickyNote: user.stickyNote,
      mfa_enabled: !!user.mfaEnabled,
      mfaEnabled: !!user.mfaEnabled,
      default_household_id: user.defaultHouseholdId,
      defaultHouseholdId: user.defaultHouseholdId,
      system_role: user.systemRole,
      systemRole: user.systemRole,
      last_household_id: user.lastHouseholdId,
      lastHouseholdId: user.lastHouseholdId,
      budget_settings: user.budgetSettings,
      budgetSettings: user.budgetSettings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  const b = req.body;
  const updateObj = {};

  if (b.email !== undefined) updateObj.email = b.email;
  if (b.password) updateObj.passwordHash = bcrypt.hashSync(b.password, 8);
  if (b.firstName !== undefined) updateObj.firstName = b.firstName;
  if (b.first_name !== undefined) updateObj.firstName = b.first_name;
  if (b.lastName !== undefined) updateObj.lastName = b.lastName;
  if (b.last_name !== undefined) updateObj.lastName = b.last_name;
  if (b.avatar !== undefined) updateObj.avatar = b.avatar;
  if (b.theme !== undefined) updateObj.theme = b.theme;
  if (b.mode !== undefined) updateObj.mode = b.mode;

  const ct = b.customTheme !== undefined ? b.customTheme : b.custom_theme;
  if (ct !== undefined) updateObj.customTheme = typeof ct === 'string' ? ct : JSON.stringify(ct);

  const sn = b.stickyNote !== undefined ? b.stickyNote : b.sticky_note;
  if (sn !== undefined) updateObj.stickyNote = typeof sn === 'string' ? sn : JSON.stringify(sn);

  if (b.defaultHouseholdId !== undefined) updateObj.defaultHouseholdId = b.defaultHouseholdId;
  if (b.default_household_id !== undefined) updateObj.defaultHouseholdId = b.default_household_id;

  const dl = b.dashboardLayout !== undefined ? b.dashboardLayout : b.dashboard_layout;
  if (dl !== undefined)
    updateObj.dashboardLayout = typeof dl === 'string' ? dl : JSON.stringify(dl);

  const bs = b.budgetSettings !== undefined ? b.budgetSettings : b.budget_settings;
  if (bs !== undefined) updateObj.budgetSettings = typeof bs === 'string' ? bs : JSON.stringify(bs);

  if (Object.keys(updateObj).length === 0)
    return res.status(400).json({ error: 'Nothing to update' });

  try {
    await db.update(users).set(updateObj).where(eq(users.id, req.user.id));
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('[AUTH] Profile Update Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-households', authenticateToken, async (req, res) => {
  try {
    const results = await db
      .select({
        id: households.id,
        name: households.name,
        avatar: households.avatar,
        currency: households.currency,
        role: userHouseholds.role,
        is_active: userHouseholds.isActive,
      })
      .from(households)
      .innerJoin(userHouseholds, eq(households.id, userHouseholds.householdId))
      .where(eq(userHouseholds.userId, req.user.id));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/token', authenticateToken, async (req, res) => {
  const { householdId } = req.body;
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user || !user.isActive) return res.status(403).json({ error: 'User inactive' });

    let userRole = 'member';
    if (householdId) {
      const [link] = await db
        .select()
        .from(userHouseholds)
        .where(
          and(
            eq(userHouseholds.userId, user.id),
            eq(userHouseholds.householdId, householdId),
            eq(userHouseholds.isActive, true)
          )
        )
        .limit(1);
      if (!link) return res.status(403).json({ error: 'Access denied to this household' });
      userRole = link.role;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        system_role: user.systemRole,
        householdId,
        role: userRole,
      },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({ token, role: userRole });
  } catch (err) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;
