const jwt = require('jsonwebtoken');
const { globalDb } = require('../db');
const SECRET_KEY = 'super_secret_pi_key';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
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
}

/**
 * RBAC Enforcement
 * @param {string} requiredRole - 'viewer', 'member', 'admin'
 */
function requireHouseholdRole(requiredRole) {
    return (req, res, next) => {
        const targetIdRaw = req.params.id || req.params.hhId || req.body.householdId || req.query.id || req.query.hhId;
        const targetHouseholdId = targetIdRaw ? parseInt(targetIdRaw) : null;
        const userHouseholdId = req.user.householdId ? parseInt(req.user.householdId) : null;
        const roles = ['viewer', 'member', 'admin'];
        const requiredRoleIndex = roles.indexOf(requiredRole);

        // helper to check role hierarchy
        const hasPermission = (actualRole) => {
            const actualRoleIndex = roles.indexOf(actualRole || 'viewer');
            return actualRoleIndex >= requiredRoleIndex;
        };

        // 1. If context matches, we can use the role already on the request (from JWT/DB lookup in authenticateToken)
        if (targetHouseholdId && userHouseholdId === targetHouseholdId) {
            if (hasPermission(req.user.role)) {
                return next();
            } else {
                return res.status(403).json({ error: `Access denied: Required role ${requiredRole}, you are ${req.user.role}` });
            }
        }

        // 2. If context doesn't match OR is missing, we MUST check the database for the target household
        if (targetHouseholdId) {
            globalDb.get(
                "SELECT id, name FROM households WHERE id = ?",
                [targetHouseholdId],
                (hErr, household) => {
                    if (!household) {
                        return res.status(404).json({ error: `Household #${targetHouseholdId} no longer exists. It may have been purged during cleanup.` });
                    }

                    globalDb.get(
                        "SELECT role, is_active FROM user_households WHERE user_id = ? AND household_id = ?",
                        [req.user.id, targetHouseholdId],
                        (err, link) => {
                            if (err) return res.status(500).json({ error: "Database error during RBAC check" });
                            if (!link || !link.is_active) {
                                return res.status(403).json({ error: "Access denied: No active link to this household" });
                            }
                            if (hasPermission(link.role)) {
                                req.user.role = link.role; // Update role for this request
                                next();
                            } else {
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