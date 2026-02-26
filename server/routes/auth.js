const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateSecret, generateURI, verify } = require('otplib');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { users, userProfiles, userSessions, userHouseholds, households } = require('../db/schema');
const { eq, and, or, ilike, sql } = require('drizzle-orm');
const { SECRET_KEY } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { finalizeLogin } = require('../services/auth');
const notificationRouter = require('../services/notification_router');
const {
  StrictEmailSchema,
  AppError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ForbiddenError,
} = require('@hearth/shared');
const response = require('../utils/response');

/**
 * POST /forgot-password
 */
router.post('/forgot-password', async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Email required', 400));

  try {
    const [user] = await req.ctx.db.select().from(users).where(eq(users.email, email)).limit(1);

    // Security: Always return success even if user not found to prevent email enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await req.ctx.db
        .update(users)
        .set({ resetToken: token, resetTokenExpires: expires })
        .where(eq(users.id, user.id));

      await notificationRouter.notify({
        householdId: user.defaultHouseholdId || 0,
        userId: user.id,
        title: 'Password Reset Request',
        message: `You requested a password reset. Use this token: ${token}`,
        channels: ['email'],
        metadata: { token, type: 'password_reset' },
      });
    }

    response.success(res, {
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /reset-password
 */
router.post('/reset-password', async (req, res, next) => {
  const { token, password } = req.body;
  if (!token || !password) return next(new AppError('Token and password required', 400));

  try {
    const [user] = await req.ctx.db
      .select()
      .from(users)
      .where(and(eq(users.resetToken, token), sql`reset_token_expires > now()`))
      .limit(1);

    if (!user) throw new AppError('Invalid or expired reset token', 400);

    const passwordHash = bcrypt.hashSync(password, 8);
    await req.ctx.db
      .update(users)
      .set({
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
        version: sql`version + 1`,
      })
      .where(eq(users.id, user.id));

    response.success(res, { message: 'Password reset successful. Please login.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /register
 */
router.post('/register', async (req, res, next) => {
  const { householdName, email, password, firstName, lastName, is_test } = req.body;

  if (!householdName || !email || !password) {
    return next(new AppError('Missing required fields', 400));
  }

  try {
    StrictEmailSchema.parse(email);
  } catch (err) {
    return next(new AppError('Email invalid or disposable domain not allowed', 400));
  }

  if (process.env.NODE_ENV !== 'test') {
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return next(
        new AppError(
          'Password must be at least 8 characters long and include at least one number and one special character.',
          400
        )
      );
    }
  }

  try {
    const existing = await req.ctx.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) throw new ConflictError('Email already registered');

    let finalIsTest = is_test || process.env.NODE_ENV === 'test' ? 1 : 0;
    if (email.startsWith('smoke_') || email.startsWith('routing_') || email.startsWith('test_')) {
      finalIsTest = 1;
    }

    const passwordHash = bcrypt.hashSync(password, 8);

    await req.ctx.db.transaction(async (tx) => {
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
          defaultHouseholdId: hh.id,
          isTest: finalIsTest,
        })
        .returning();

      await tx.insert(userProfiles).values({
        userId: user.id,
        firstName: firstName || 'Admin',
        lastName: lastName || '',
      });

      await tx.insert(userHouseholds).values({
        userId: user.id,
        householdId: hh.id,
        role: 'admin',
      });
    });

    response.success(res, { message: 'Registration successful. Please login.' }, null, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /lookup
 */
router.post('/lookup', async (req, res, next) => {
  const { email, username } = req.body;
  const identifier = email || username;
  if (!identifier) return next(new AppError('Identifier required', 400));

  try {
    const results = await req.ctx.db
      .select({
        first_name: userProfiles.firstName,
        avatar: userProfiles.avatar,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(or(ilike(users.email, identifier), eq(users.username, identifier)))
      .limit(1);

    if (results.length === 0) throw new NotFoundError('User not found');
    response.success(res, results[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /login
 */
router.post('/login', async (req, res, next) => {
  const { email, password, username, rememberMe } = req.body;
  const identifier = email || username;

  try {
    const results = await req.ctx.db
      .select()
      .from(users)
      .where(or(ilike(users.email, identifier), eq(users.username, identifier)))
      .limit(1);

    if (results.length === 0) throw new UnauthorizedError('Invalid credentials');
    const user = results[0];

    if (!user.isActive) {
      throw new AppError('Your account is deactivated. Please contact support.', 403);
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedError('Invalid credentials');

    if (user.mfaEnabled) {
      const preAuthToken = jwt.sign(
        { preAuthId: user.id, type: 'mfa_pending', rememberMe },
        SECRET_KEY,
        { expiresIn: '5m' }
      );
      return response.success(res, { mfa_required: true, preAuthToken });
    }

    await finalizeLogin(user, req, res, rememberMe, req.ctx.db);
  } catch (err) {
    next(err);
  }
});

/**
 * MFA SETUPS
 */
router.post('/mfa/setup', authenticateToken, async (req, res, next) => {
  try {
    const secret = generateSecret();
    const otpauth = generateURI({ secret, label: req.user.email, issuer: 'Hearth Household' });
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    await req.ctx.db.update(users).set({ mfaSecret: secret }).where(eq(users.id, req.user.id));
    response.success(res, { secret, qrCodeUrl });
  } catch (err) {
    next(err);
  }
});

router.post('/mfa/verify', authenticateToken, async (req, res, next) => {
  const { code } = req.body;
  try {
    const [user] = await req.ctx.db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user || !user.mfaSecret) throw new AppError('MFA not initiated', 400);

    const isValid = verify({ token: code, secret: user.mfaSecret });
    if (!isValid) throw new AppError('Invalid code', 400);

    await req.ctx.db.update(users).set({ mfaEnabled: true }).where(eq(users.id, req.user.id));
    response.success(res, { message: 'MFA Enabled' });
  } catch (err) {
    next(err);
  }
});

router.post('/mfa/disable', authenticateToken, async (req, res, next) => {
  const { password } = req.body;
  try {
    const [user] = await req.ctx.db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedError('Invalid password');

    await req.ctx.db
      .update(users)
      .set({ mfaEnabled: false, mfaSecret: null })
      .where(eq(users.id, user.id));
    response.success(res, { message: 'MFA Disabled' });
  } catch (err) {
    next(err);
  }
});

/**
 * PROFILE
 */
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const results = await req.ctx.db
      .select()
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (results.length === 0) throw new NotFoundError('User not found');
    const { users: user, user_profiles: profile } = results[0];

    response.success(res, {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      avatar: profile?.avatar,
      theme: profile?.theme,
      mode: profile?.mode || 'system',
      customTheme: profile?.customTheme,
      dashboardLayout: profile?.dashboardLayout,
      stickyNote: profile?.stickyNote,
      mfaEnabled: !!user.mfaEnabled,
      defaultHouseholdId: user.defaultHouseholdId,
      systemRole: user.systemRole,
      lastHouseholdId: user.lastHouseholdId,
      budgetSettings: profile?.budgetSettings,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authenticateToken, async (req, res, next) => {
  const b = req.body;
  const userUpdate = {};
  const profileUpdate = {};

  try {
    const [user] = await req.ctx.db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    if (b.email !== undefined) userUpdate.email = b.email;
    if (b.password) {
      // If changing password, must provide current password
      if (!b.currentPassword)
        throw new AppError('Current password required to set new password', 400);
      const isValid = bcrypt.compareSync(b.currentPassword, user.passwordHash);
      if (!isValid) throw new AppError('Current password incorrect', 400);

      userUpdate.passwordHash = bcrypt.hashSync(b.password, 8);
      userUpdate.version = sql`version + 1`;
    }
    if (b.defaultHouseholdId !== undefined) userUpdate.defaultHouseholdId = b.defaultHouseholdId;

    if (b.firstName !== undefined) profileUpdate.firstName = b.firstName;
    if (b.lastName !== undefined) profileUpdate.lastName = b.lastName;
    if (b.avatar !== undefined) profileUpdate.avatar = b.avatar;
    if (b.theme !== undefined) profileUpdate.theme = b.theme;
    if (b.mode !== undefined) profileUpdate.mode = b.mode;
    if (b.customTheme !== undefined) profileUpdate.customTheme = b.customTheme;
    if (b.stickyNote !== undefined) profileUpdate.stickyNote = b.stickyNote;
    if (b.dashboardLayout !== undefined) profileUpdate.dashboardLayout = b.dashboardLayout;
    if (b.budgetSettings !== undefined) profileUpdate.budgetSettings = b.budgetSettings;

    if (Object.keys(userUpdate).length === 0 && Object.keys(profileUpdate).length === 0)
      return next(new AppError('Nothing to update', 400));

    await req.ctx.db.transaction(async (tx) => {
      if (Object.keys(userUpdate).length > 0) {
        await tx.update(users).set(userUpdate).where(eq(users.id, req.user.id));
      }
      if (Object.keys(profileUpdate).length > 0) {
        await tx
          .insert(userProfiles)
          .values({ userId: req.user.id, ...profileUpdate })
          .onConflictDoUpdate({
            target: userProfiles.userId,
            set: profileUpdate,
          });
      }
    });
    response.success(res, { message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
});

/**
 * HOUSEHOLDS & TOKENS
 */
router.get('/my-households', authenticateToken, async (req, res, next) => {
  try {
    const results = await req.ctx.db
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

    response.success(res, results);
  } catch (err) {
    next(err);
  }
});

router.post('/token', authenticateToken, async (req, res, next) => {
  const { householdId } = req.body;
  try {
    const [user] = await req.ctx.db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user || !user.isActive) throw new UnauthorizedError('User inactive');

    let userRole = 'member';
    if (householdId) {
      const [link] = await req.ctx.db
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
      if (!link) throw new ForbiddenError('Access denied to this household');
      userRole = link.role;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, system_role: user.systemRole, householdId, role: userRole },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    response.success(res, { token, role: userRole });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', authenticateToken, async (req, res, next) => {
  try {
    const [user] = await req.ctx.db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user || !user.isActive) throw new UnauthorizedError('User inactive');

    const [session] = await req.ctx.db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.id, req.user.sid), eq(userSessions.isRevoked, false)))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      res.clearCookie('hearth_auth');
      throw new UnauthorizedError('Session expired');
    }

    // Issue new token
    const tokenPayload = {
      id: user.id,
      sid: session.id,
      email: user.email,
      system_role: user.systemRole,
      householdId: req.user.householdId,
      role: req.user.role,
    };

    const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn: '24h' });

    // Set HttpOnly Cookie
    res.cookie('hearth_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: session.expiresAt - Date.now(),
    });

    response.success(res, { token });
  } catch (err) {
    next(err);
  }
});

/**
 * SESSIONS
 */
router.get('/sessions', authenticateToken, async (req, res, next) => {
  try {
    const results = await req.ctx.db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.userId, req.user.id), eq(userSessions.isRevoked, false)));

    response.success(
      res,
      results.map((s) => ({
        id: s.id,
        device_info: s.deviceInfo,
        ip_address: s.ipAddress,
        last_active: s.lastActive,
        expires_at: s.expiresAt,
        isCurrent: s.id === req.user.sid,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.delete('/sessions/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    await req.ctx.db
      .update(userSessions)
      .set({ isRevoked: true })
      .where(and(eq(userSessions.id, id), eq(userSessions.userId, req.user.id)));

    response.success(res, { success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/sessions', authenticateToken, async (req, res, next) => {
  try {
    await req.ctx.db
      .update(userSessions)
      .set({ isRevoked: true })
      .where(and(eq(userSessions.userId, req.user.id), sql`id != ${req.user.sid}`));

    response.success(res, { success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('hearth_auth');
  response.success(res, { message: 'Logged out' });
});

module.exports = router;
