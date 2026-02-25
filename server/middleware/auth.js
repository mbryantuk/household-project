const jwt = require('jsonwebtoken');
const { db } = require('../db/index');
const { users, userSessions, userHouseholds } = require('../db/schema');
const { eq, and } = require('drizzle-orm');
const config = require('../config');
const pkg = require('../package.json');
const { createClerkClient } = require('@clerk/clerk-sdk-node');

let _clerkClient = null;

function getClerkClient() {
  if (_clerkClient) return _clerkClient;
  if (config.CLERK_SECRET_KEY) {
    _clerkClient = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
    return _clerkClient;
  }
  return null;
}

async function syncClerkUser(clerkUser) {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error('Clerk user missing email');

  let [localUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!localUser) {
    [localUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash: 'CLERK_MANAGED',
      })
      .returning();
  }

  return localUser;
}

/**
 * UNIFIED AUTHENTICATOR
 * Item 130: Checks for HttpOnly Cookie 'hearth_auth' if header is missing.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Item 130: Read from header or cookie
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.hearth_auth;

  res.setHeader('x-api-version', pkg.version);
  if (!token) return res.sendStatus(401);

  // 1. Try Clerk
  const clerkClient = getClerkClient();
  if (clerkClient) {
    try {
      const auth = await clerkClient.authenticateRequest(req);
      if (auth.isSignedIn) {
        const clerkUser = await clerkClient.users.getUser(auth.userId);
        const localUser = await syncClerkUser(clerkUser);

        req.user = {
          id: localUser.id,
          email: localUser.email,
          systemRole: localUser.systemRole,
          clerkId: clerkUser.id,
        };
        // ... tenancy logic ...
        return next();
      }
    } catch (err) {}
  }

  // 2. Fallback JWT
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
      const effectiveHhId = req.headers['x-household-id'] || decodedUser.householdId || row.lastHouseholdId;

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
    let targetIdRaw = req.params.id || req.params.hhId || req.headers['x-household-id'];
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
