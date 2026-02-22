const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const { globalDb, dbGet, dbRun } = require('../db');
const { SECRET_KEY } = require('../config');

/**
 * Helper to finalize login and create session
 * @param {object} user - The user object from the database
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {boolean} rememberMe - Whether "Remember Me" was checked
 */
async function finalizeLogin(user, req, res, rememberMe = false) {
  // Logic: Prioritize last_household_id, then default_household_id, then first active link
  let householdId = user.last_household_id || user.default_household_id;
  let userRole = 'member';

  if (!householdId) {
    const link = await dbGet(
      globalDb,
      `SELECT * FROM user_households WHERE user_id = ? AND is_active = 1 LIMIT 1`,
      [user.id]
    );
    if (link) {
      householdId = link.household_id;
      userRole = link.role;
    }
  } else {
    const link = await dbGet(
      globalDb,
      `SELECT * FROM user_households WHERE user_id = ? AND household_id = ? AND is_active = 1`,
      [user.id, householdId]
    );
    if (link) {
      userRole = link.role;
    } else {
      householdId = null;
      const altLink = await dbGet(
        globalDb,
        `SELECT * FROM user_households WHERE user_id = ? AND is_active = 1 LIMIT 1`,
        [user.id]
      );
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

  // CLEANUP: Remove expired sessions for this user
  await dbRun(
    globalDb,
    `DELETE FROM user_sessions WHERE user_id = ? AND expires_at < CURRENT_TIMESTAMP`,
    [user.id]
  );

  const parser = new UAParser(req.headers['user-agent']);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const deviceInfo = `${browser.name || 'Unknown'} on ${os.name || 'Unknown'} (${device.model || 'Desktop'})`;

  // Create Session
  const sessionId = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(
    Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000
  ).toISOString();

  await dbRun(
    globalDb,
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
      mode: user.mode || 'system',
      custom_theme: user.custom_theme,
      dashboard_layout: user.dashboard_layout,
      sticky_note: user.sticky_note,
      mfa_enabled: !!user.mfa_enabled,
    },
    household: householdData,
  });
}

module.exports = { finalizeLogin };
