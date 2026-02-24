const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const { db } = require('../db/index');
const { users, userSessions, userHouseholds, households } = require('../db/schema');
const { eq, and, lt } = require('drizzle-orm');
const { SECRET_KEY } = require('../config');

/**
 * Helper to finalize login and create session
 */
async function finalizeLogin(user, req, res, rememberMe = false) {
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

  // CLEANUP: Remove expired sessions for this user
  await db
    .delete(userSessions)
    .where(and(eq(userSessions.userId, user.id), lt(userSessions.expiresAt, new Date())));

  const parser = new UAParser(req.headers['user-agent']);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const deviceInfo = `${browser.name || 'Unknown'} on ${os.name || 'Unknown'} (${device.model || 'Desktop'})`;

  // Create Session
  const sessionId = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);

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

  if (process.env.NODE_ENV !== 'test') {
    console.log(`🔑 [AUTH] Login Successful: ${user.email} (SID: ${sessionId.substring(0, 8)}...)`);
  }

  res.json({
    token,
    role: userRole,
    system_role: user.systemRole,
    context: householdId ? 'household' : 'global',
    user: {
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
    },
    household: householdData,
  });
}

module.exports = { finalizeLogin };
