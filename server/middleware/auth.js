const jwt = require('jsonwebtoken');
const { db } = require('../db/index');
const { users, userSessions, userHouseholds, households } = require('../db/schema');
const { eq, and, sql } = require('drizzle-orm');
const { SECRET_KEY } = require('../config');
const pkg = require('../package.json');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Always attach version header for client checks
  res.setHeader('x-api-version', pkg.version);

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, async (err, decodedUser) => {
    if (err) {
      if (process.env.NODE_ENV === 'test')
        console.error(
          `JWT Verify Error on ${req.path}:`,
          err.message,
          'Key Length:',
          SECRET_KEY.length
        );
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

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

      if (!row || !row.isActive) {
        return res.status(403).json({ error: 'Account is inactive or not found.' });
      }

      // Verify Session if SID is present
      if (decodedUser.sid) {
        const [session] = await db
          .select({ isRevoked: userSessions.isRevoked })
          .from(userSessions)
          .where(eq(userSessions.id, decodedUser.sid))
          .limit(1);

        if (!session || session.isRevoked) {
          console.warn(
            `[AUTH] Session Invalid/Revoked for User ${decodedUser.id} (SID: ${decodedUser.sid})`
          );
          return res.status(401).json({ error: 'Session has been revoked or expired.' });
        }

        // Update Last Active (Fire and Forget)
        db.update(userSessions)
          .set({ lastActive: new Date() })
          .where(eq(userSessions.id, decodedUser.sid))
          .execute();
      }

      req.user = { ...decodedUser, systemRole: row.systemRole };
      const effectiveHhId = decodedUser.householdId || row.lastHouseholdId;

      // Always try to fetch household role to ensure req.user.role is populated
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
          req.user.debugMode = results[0].debugMode === 1;

          if (req.user.debugMode) {
            console.log(`\n🐛 [DEBUG] ${req.method} ${req.path}`);
            console.log('   Headers:', JSON.stringify(req.headers, null, 2));
            console.log('   Body:', JSON.stringify(req.body, null, 2));
            console.log('   User:', `${req.user.email} (${req.user.id})`);
          }
        }
      }
      next();
    } catch (dbErr) {
      console.error('Auth Middleware DB Error:', dbErr);
      res.status(500).json({ error: 'Internal server error during authentication' });
    }
  });
}

/**
 * RBAC Enforcement
 * @param {string} requiredRole - 'viewer', 'member', 'admin'
 */
function requireHouseholdRole(requiredRole) {
  return async (req, res, next) => {
    // PRIORITIZE path parameters to prevent IDOR via body/query
    let targetIdRaw = req.params.id || req.params.hhId;
    if (!targetIdRaw) {
      targetIdRaw = req.body.householdId || req.query.id || req.query.hhId;
    }

    const targetHouseholdId = targetIdRaw ? parseInt(targetIdRaw) : null;
    const userHouseholdId = req.user.householdId ? parseInt(req.user.householdId) : null;
    const roles = ['viewer', 'member', 'admin'];
    const requiredRoleIndex = roles.indexOf(requiredRole);

    const hasPermission = (actualRole) => {
      const actualRoleIndex = roles.indexOf(actualRole || 'viewer');
      return actualRoleIndex >= requiredRoleIndex;
    };

    if (targetHouseholdId && userHouseholdId === targetHouseholdId) {
      if (hasPermission(req.user.role)) {
        return next();
      } else {
        return res.status(403).json({
          error: `Access denied: Required role ${requiredRole}, you are ${req.user.role}`,
        });
      }
    }

    if (targetHouseholdId) {
      if (
        userHouseholdId &&
        userHouseholdId !== targetHouseholdId &&
        req.user.systemRole !== 'admin'
      ) {
        if (process.env.NODE_ENV === 'test')
          console.log(
            `RBAC: Blocked cross-household access attempt from HH ${userHouseholdId} to HH ${targetHouseholdId}`
          );
        return res
          .status(403)
          .json({ error: 'Access denied: You do not have access to this household' });
      }

      try {
        const [household] = await db
          .select({ id: households.id, name: households.name })
          .from(households)
          .where(eq(households.id, targetHouseholdId))
          .limit(1);

        if (!household) {
          if (process.env.NODE_ENV === 'test')
            console.log(`RBAC: Household ${targetHouseholdId} not found`);
          return res.status(404).json({
            error: `Household #${targetHouseholdId} no longer exists. It may have been purged during cleanup.`,
          });
        }

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
          return res.status(403).json({ error: 'Access denied: No active link to this household' });
        }

        if (hasPermission(link.role)) {
          req.user.role = link.role;
          next();
        } else {
          if (req.user.systemRole === 'admin') {
            req.user.role = 'admin';
            return next();
          }
          res.status(403).json({
            error: `Access denied: Required role ${requiredRole}, you have ${link.role} in this household`,
          });
        }
      } catch (err) {
        res.status(500).json({ error: 'Database error during RBAC check' });
      }
    } else {
      res.status(400).json({ error: 'Household context required for this operation' });
    }
  };
}

function requireSystemRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.systemRole === role) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied: System administrator required' });
    }
  };
}

module.exports = { authenticateToken, requireHouseholdRole, requireSystemRole, SECRET_KEY };
