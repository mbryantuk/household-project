const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const { db: defaultDb } = require('../db/index');
const { users, userProfiles, userSessions, userHouseholds, households } = require('../db/schema');
const { eq, and, lt } = require('drizzle-orm');
const { SECRET_KEY } = require('../config');

/**
 * Helper to finalize login and create session
 */
async function finalizeLogin(user, req, res, rememberMe = false, dbInstance = null) {
  const db = dbInstance || defaultDb;
  
  try {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);

    let householdId = user.lastHouseholdId || user.defaultHouseholdId;
    let userRole = 'member';

    if (!householdId) {
      const links = await db
        .select()
        .from(userHouseholds)
        .where(and(eq(userHouseholds.userId, user.id), eq(userHouseholds.isActive, true)))
        .limit(1);
      if (links.length > 0) {
        householdId = links[0].householdId;
        userRole = links[0].role;
      }
    } else {
      const links = await db
        .select()
        .from(userHouseholds)
        .where(
          and(
            eq(userHouseholds.userId, user.id),
            eq(userHouseholds.householdId, householdId),
            eq(userHouseholds.isActive, true)
          )
        );

      if (links.length > 0) {
        userRole = links[0].role;
      } else {
        householdId = null;
        const altLinks = await db
          .select()
          .from(userHouseholds)
          .where(and(eq(userHouseholds.userId, user.id), eq(userHouseholds.isActive, true)))
          .limit(1);
        if (altLinks.length > 0) {
          householdId = altLinks[0].householdId;
          userRole = altLinks[0].role;
        }
      }
    }

    let householdData = null;
    if (householdId) {
      const hh = await db.select().from(households).where(eq(households.id, householdId));
      if (hh.length > 0) householdData = hh[0];
    }

    // Clean up old sessions
    await db
      .delete(userSessions)
      .where(and(eq(userSessions.userId, user.id), lt(userSessions.expiresAt, new Date())));

    const parser = new UAParser(req.headers['user-agent']);
    const device = parser.getDevice();
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const deviceInfo = `${browser.name || 'Unknown'} on ${os.name || 'Unknown'} (${device.model || 'Desktop'})`;

    const sessionId = crypto.randomBytes(16).toString('hex');
    const duration = (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + duration);

    await db.insert(userSessions).values({
      id: sessionId,
      userId: user.id,
      deviceInfo,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt,
    });

    const tokenPayload = {
      id: user.id,
      sid: sessionId,
      email: user.email,
      system_role: user.systemRole,
      householdId: householdId,
      role: userRole,
    };

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign(tokenPayload, SECRET_KEY, { expiresIn });

    // Item 130: Set HttpOnly, Secure Cookie
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    res.cookie('hearth_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !isLocal,
      sameSite: 'strict',
      maxAge: duration,
    });

    if (process.env.NODE_ENV !== 'test') {
      const logger = req.ctx?.logger || console;
      logger.info(`🔑 [AUTH] Login Successful: ${user.email} (SID: ${sessionId.substring(0, 8)}...)`);
    }

    const { success } = require('../utils/response');
    return success(res, {
      token,
      role: userRole,
      system_role: user.systemRole,
      context: householdId ? 'household' : 'global',
      user: {
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
      },
      household: householdData,
    });
  } catch (err) {
    const logger = req.ctx?.logger || console;
    logger.error({ msg: '❌ finalizeLogin Failed', err: err.message, stack: err.stack });
    throw err;
  }
}

module.exports = { finalizeLogin };
