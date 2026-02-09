const jwt = require('jsonwebtoken');
const { globalDb } = require('../db');
const { SECRET_KEY } = require('../config');
const pkg = require('../package.json');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Always attach version header for client checks
    res.setHeader('x-api-version', pkg.version);
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            if (process.env.NODE_ENV === 'test') console.error(`JWT Verify Error on ${req.path}:`, err.message, "Key Length:", SECRET_KEY.length);
            return res.status(403).json({ error: "Invalid or expired token." }); 
        }

        globalDb.get("SELECT is_active, system_role, last_household_id FROM users WHERE id = ?", [user.id], (err, row) => {
            if (err || !row || !row.is_active) {
                return res.status(403).json({ error: "Account is inactive or not found." });
            }

            // Verify Session if SID is present
            const verifySession = () => {
                return new Promise((resolve) => {
                    if (!user.sid) return resolve(true);
                    globalDb.get("SELECT is_revoked FROM user_sessions WHERE id = ?", [user.sid], (sErr, session) => {
                        if (sErr || !session || session.is_revoked) return resolve(false);
                        resolve(true);
                    });
                });
            };

            verifySession().then(isValidSession => {
                if (!isValidSession) {
                    return res.status(401).json({ error: "Session has been revoked or expired." });
                }

                // Update Last Active (Fire and Forget)
                if (user.sid) {
                    globalDb.run("UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE id = ?", [user.sid]);
                }

                req.user = { ...user, systemRole: row.system_role };
                const effectiveHhId = user.householdId || row.last_household_id;

                // Always try to fetch household role to ensure req.user.role is populated
                if (effectiveHhId) {
                    globalDb.get("SELECT role, is_active FROM user_households WHERE user_id = ? AND household_id = ?", [user.id, effectiveHhId], (err, link) => {
                        if (!err && link && link.is_active) {
                            req.user.role = link.role;
                            req.user.householdId = effectiveHhId;
                        }
                        next();
                    });
                } else {
                    next();
                }
            });
        });
    });
}

/**
 * RBAC Enforcement
 * @param {string} requiredRole - 'viewer', 'member', 'admin'
 */
function requireHouseholdRole(requiredRole) {
    return (req, res, next) => {
        // PRIORITIZE path parameters to prevent IDOR via body/query
        let targetIdRaw = req.params.id || req.params.hhId;
        if (!targetIdRaw) {
            targetIdRaw = req.body.householdId || req.query.id || req.query.hhId;
        }
        
        const targetHouseholdId = targetIdRaw ? parseInt(targetIdRaw) : null;
        const userHouseholdId = req.user.householdId ? parseInt(req.user.householdId) : null;
        const roles = ['viewer', 'member', 'admin'];
        const requiredRoleIndex = roles.indexOf(requiredRole);

        // helper to check role hierarchy
        const hasPermission = (actualRole) => {
            const actualRoleIndex = roles.indexOf(actualRole || 'viewer');
            return actualRoleIndex >= requiredRoleIndex;
        };

        // 1. If context matches, we can use the role already on the request
        if (targetHouseholdId && userHouseholdId === targetHouseholdId) {
            if (hasPermission(req.user.role)) {
                return next();
            } else {
                return res.status(403).json({ error: `Access denied: Required role ${requiredRole}, you are ${req.user.role}` });
            }
        }

        // 2. If context doesn't match OR is missing, we MUST check the database for the target household
        if (targetHouseholdId) {
            // Check if it's a cross-household access attempt
            if (userHouseholdId && userHouseholdId !== targetHouseholdId && req.user.systemRole !== 'admin') {
                if (process.env.NODE_ENV === 'test') console.log(`RBAC: Blocked cross-household access attempt from HH ${userHouseholdId} to HH ${targetHouseholdId}`);
                return res.status(403).json({ error: "Access denied: You do not have access to this household" });
            }

            globalDb.get(
                "SELECT id, name FROM households WHERE id = ?",
                [targetHouseholdId],
                (hErr, household) => {
                    if (!household) {
                        if (process.env.NODE_ENV === 'test') console.log(`RBAC: Household ${targetHouseholdId} not found in globalDb`);
                        return res.status(404).json({ error: `Household #${targetHouseholdId} no longer exists. It may have been purged during cleanup.` });
                    }

                    globalDb.get(
                        "SELECT role, is_active FROM user_households WHERE user_id = ? AND household_id = ?",
                        [req.user.id, targetHouseholdId],
                        (err, link) => {
                            if (err) return res.status(500).json({ error: "Database error during RBAC check" });
                            
                            // SYSTEM ADMIN BYPASS: If no link exists, system admins get virtual 'admin' role
                            if (!link || !link.is_active) {
                                if (req.user.systemRole === 'admin') {
                                    req.user.role = 'admin';
                                    return next();
                                }
                                return res.status(403).json({ error: "Access denied: No active link to this household" });
                            }

                            if (hasPermission(link.role)) {
                                req.user.role = link.role; // Update role for this request
                                next();
                            } else {
                                // SYSTEM ADMIN OVERRIDE: Even if link exists with lower role, system admin can override to 'admin'
                                if (req.user.systemRole === 'admin') {
                                    req.user.role = 'admin';
                                    return next();
                                }
                                res.status(403).json({ error: `Access denied: Required role ${requiredRole}, you have ${link.role} in this household` });
                            }
                        }
                    );
                }
            );
        } else {
            // No target household ID provided at all
            res.status(400).json({ error: "Household context required for this operation" });
        }
    };
}

/**
 * System-wide Role check (for creating households, etc.)
 */
function requireSystemRole(role) {
    return (req, res, next) => {
        if (req.user && req.user.systemRole === role) {
            next();
        } else {
            res.status(403).json({ error: "Access denied: System administrator required" });
        }
    };
}

module.exports = { authenticateToken, requireHouseholdRole, requireSystemRole, SECRET_KEY };