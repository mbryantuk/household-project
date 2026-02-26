const jwt = require('jsonwebtoken');
const { db } = require('../db/index');
const { users, userSessions, userHouseholds, apiKeys } = require('../db/schema');
const { eq, and } = require('drizzle-orm');
const config = require('../config');
const pkg = require('../package.json');

/**
 * UNIFIED AUTHENTICATOR
 * Item 130: Checks for HttpOnly Cookie 'hearth_auth' if header is missing.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  // Item 237: Support API Key
  if (apiKeyHeader) {
    try {
      const keyHash = require('crypto').createHash('sha256').update(apiKeyHeader).digest('hex');
      const [keyData] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
        .limit(1);

      if (keyData) {
        if (keyData.expiresAt && keyData.expiresAt < new Date()) {
          return res.status(403).json({ error: 'API Key expired' });
        }

        // Update last used
        db.update(apiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiKeys.id, keyData.id))
          .execute();

        req.user = {
          id: keyData.userId,
          householdId: keyData.householdId,
          role: 'admin',
          isApiKey: true,
        };
        return next();
      }
    } catch (err) {
      console.error('[AUTH] API Key verification failed:', err);
    }
  }

  // Item 130: Read from header or cookie
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.hearth_auth;

  res.setHeader('x-api-version', pkg.version);
  if (!token) return res.sendStatus(401);

  // Fallback JWT
  jwt.verify(token, config.SECRET_KEY, async (err, decodedUser) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });

    try {
      const [row] = await db
        .select({
          isActive: users.isActive,
          systemRole: users.systemRole,
          lastHouseholdId: users.lastHouseholdId,
        })
        .from(users)
        .where(eq(users.id, decodedUser.id))
        .limit(1);

      if (!row || !row.isActive) return res.status(403).json({ error: 'Account inactive' });

      if (decodedUser.sid) {
        const [session] = await db
          .select({ isRevoked: userSessions.isRevoked })
          .from(userSessions)
          .where(eq(userSessions.id, decodedUser.sid))
          .limit(1);
        if (!session || session.isRevoked)
          return res.status(401).json({ error: 'Session revoked' });

        db.update(userSessions)
          .set({ lastActive: new Date() })
          .where(eq(userSessions.id, decodedUser.sid))
          .execute();
      }

      req.user = { ...decodedUser, systemRole: row.systemRole };
      const effectiveHhId =
        req.headers['x-household-id'] || decodedUser.householdId || row.lastHouseholdId;

      if (effectiveHhId) {
        const results = await db
          .select({
            role: userHouseholds.role,
            isActive: userHouseholds.isActive,
          })
          .from(userHouseholds)
          .where(
            and(
              eq(userHouseholds.userId, decodedUser.id),
              eq(userHouseholds.householdId, parseInt(effectiveHhId)),
              eq(userHouseholds.isActive, true)
            )
          )
          .limit(1);

        if (results.length > 0) {
          req.user.role = results[0].role;
          req.user.householdId = parseInt(effectiveHhId);
        }
      }
      next();
    } catch (dbErr) {
      console.error('[AUTH-MIDDLEWARE] DB Error:', dbErr);
      res.status(500).json({ error: 'Auth service failure' });
    }
  });
}

/**
 * RBAC Enforcement
 */
function requireHouseholdRole(requiredRole) {
  return async (req, res, next) => {
    let targetIdRaw = req.params.hhId || req.params.id || req.headers['x-household-id'];
    if (!targetIdRaw) targetIdRaw = req.body.householdId || req.query.id || req.query.hhId;

    const targetHouseholdId = targetIdRaw ? parseInt(targetIdRaw) : null;
    const roles = ['viewer', 'member', 'admin'];
    const requiredRoleIndex = roles.indexOf(requiredRole);

    const hasPermission = (actualRole) => {
      const actualRoleIndex = roles.indexOf(actualRole || 'viewer');
      return actualRoleIndex >= requiredRoleIndex;
    };

    if (targetHouseholdId) {
      if (req.user.householdId === targetHouseholdId && req.user.role) {
        if (hasPermission(req.user.role)) return next();
      }

      if (req.user.systemRole === 'admin') {
        req.user.role = 'admin';
        req.user.householdId = targetHouseholdId;
        return next();
      }

      try {
        const [link] = await db
          .select({ role: userHouseholds.role, isActive: userHouseholds.isActive })
          .from(userHouseholds)
          .where(
            and(
              eq(userHouseholds.userId, req.user.id),
              eq(userHouseholds.householdId, targetHouseholdId),
              eq(userHouseholds.isActive, true)
            )
          )
          .limit(1);

        if (!link) return res.status(403).json({ error: 'No active link to this household' });

        if (hasPermission(link.role)) {
          req.user.role = link.role;
          req.user.householdId = targetHouseholdId;
          return next();
        } else {
          return res.status(403).json({ error: `Required: ${requiredRole}` });
        }
      } catch (err) {
        return res.status(500).json({ error: 'Authorization failure' });
      }
    } else {
      return res.status(400).json({ error: 'Household context required' });
    }
  };
}

function requireSystemRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.systemRole === role) next();
    else res.status(403).json({ error: 'System admin required' });
  };
}

module.exports = {
  authenticateToken,
  requireHouseholdRole,
  requireSystemRole,
  SECRET_KEY: config.SECRET_KEY,
};
