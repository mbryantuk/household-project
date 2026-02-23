const jwt = require('jsonwebtoken');
const { db } = require('../db/index');
const { users, userSessions, userHouseholds, households } = require('../db/schema');
const { eq, and, sql } = require('drizzle-orm');
const { SECRET_KEY, CLERK_SECRET_KEY } = require('../config');
const pkg = require('../package.json');
const { createClerkClient } = require('@clerk/clerk-sdk-node');

let clerkClient = null;
if (CLERK_SECRET_KEY) {
  clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
}

/**
 * SYNC CLERK USER
 */
async function syncClerkUser(clerkUser) {
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error('Clerk user missing email');

  let [localUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!localUser) {
    [localUser] = await db
      .insert(users)
      .values({
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        avatar: clerkUser.imageUrl,
        passwordHash: 'CLERK_MANAGED',
      })
      .returning();
  } else {
    await db
      .update(users)
      .set({
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        avatar: clerkUser.imageUrl,
      })
      .where(eq(users.id, localUser.id));
  }

  return localUser;
}

/**
 * UNIFIED AUTHENTICATOR
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  res.setHeader('x-api-version', pkg.version);
  if (!token) return res.sendStatus(401);

  // 1. Try Clerk
  if (clerkClient) {
    try {
      const { sessionId } = await clerkClient.verifyToken(token);
      if (sessionId) {
        const session = await clerkClient.sessions.getSession(sessionId);
        const clerkUser = await clerkClient.users.getUser(session.userId);
        const localUser = await syncClerkUser(clerkUser);

        req.user = {
          id: localUser.id,
          email: localUser.email,
          systemRole: localUser.systemRole,
          clerkId: clerkUser.id,
        };
        const effectiveHhId =
          req.headers['x-household-id'] ||
          localUser.lastHouseholdId ||
          localUser.defaultHouseholdId;
        if (effectiveHhId) {
          const results = await db
            .select({
              role: userHouseholds.role,
              isActive: userHouseholds.isActive,
              debugMode: households.debugMode,
            })
            .from(userHouseholds)
            .innerJoin(households, eq(userHouseholds.householdId, households.id))
            .where(
              and(
                eq(userHouseholds.userId, localUser.id),
                eq(userHouseholds.householdId, parseInt(effectiveHhId))
              )
            )
            .limit(1);
          if (results.length > 0 && results[0].isActive) {
            req.user.role = results[0].role;
            req.user.householdId = parseInt(effectiveHhId);
          }
        }
        return next();
      }
    } catch (err) {
      /* fallback */
    }
  }

  // 2. Fallback JWT
  jwt.verify(token, SECRET_KEY, async (err, decodedUser) => {
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
      const effectiveHhId = decodedUser.householdId || row.lastHouseholdId;

      if (effectiveHhId) {
        const results = await db
          .select({
            role: userHouseholds.role,
            isActive: userHouseholds.isActive,
            debugMode: households.debugMode,
          })
          .from(userHouseholds)
          .innerJoin(households, eq(userHouseholds.householdId, households.id))
          .where(
            and(
              eq(userHouseholds.userId, decodedUser.id),
              eq(userHouseholds.householdId, effectiveHhId)
            )
          )
          .limit(1);

        if (results.length > 0 && results[0].isActive) {
          req.user.role = results[0].role;
          req.user.householdId = effectiveHhId;
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
    const userHouseholdId = req.user.householdId ? parseInt(req.user.householdId) : null;
    const roles = ['viewer', 'member', 'admin'];
    const requiredRoleIndex = roles.indexOf(requiredRole);

    const hasPermission = (actualRole) => {
      const actualRoleIndex = roles.indexOf(actualRole || 'viewer');
      return actualRoleIndex >= requiredRoleIndex;
    };

    if (targetHouseholdId && userHouseholdId === targetHouseholdId) {
      if (hasPermission(req.user.role)) return next();
      return res.status(403).json({ error: `Required: ${requiredRole}` });
    }

    if (targetHouseholdId) {
      if (
        userHouseholdId &&
        userHouseholdId !== targetHouseholdId &&
        req.user.systemRole !== 'admin'
      ) {
        return res.status(403).json({ error: 'Access denied' });
      }

      try {
        const [household] = await db
          .select({ id: households.id, name: households.name })
          .from(households)
          .where(eq(households.id, targetHouseholdId))
          .limit(1);

        if (!household) return res.status(404).json({ error: 'Household not found' });

        const [link] = await db
          .select({ role: userHouseholds.role, isActive: userHouseholds.isActive })
          .from(userHouseholds)
          .where(
            and(
              eq(userHouseholds.userId, req.user.id),
              eq(userHouseholds.householdId, targetHouseholdId)
            )
          )
          .limit(1);

        if (!link || !link.isActive) {
          if (req.user.systemRole === 'admin') {
            req.user.role = 'admin';
            return next();
          }
          return res.status(403).json({ error: 'No active link' });
        }

        if (hasPermission(link.role)) {
          req.user.role = link.role;
          next();
        } else {
          if (req.user.systemRole === 'admin') {
            req.user.role = 'admin';
            return next();
          }
          res.status(403).json({ error: `Required: ${requiredRole}` });
        }
      } catch (err) {
        console.error('[RBAC] Error:', err);
        res.status(500).json({ error: 'Authorization failure' });
      }
    } else {
      res.status(400).json({ error: 'Household context required' });
    }
  };
}

function requireSystemRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.systemRole === role) next();
    else res.status(403).json({ error: 'System admin required' });
  };
}

module.exports = { authenticateToken, requireHouseholdRole, requireSystemRole, SECRET_KEY };
