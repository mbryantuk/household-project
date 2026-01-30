const jwt = require('jsonwebtoken');
const { globalDb } = require('../db');
const { SECRET_KEY } = require('../config');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); 
        
        // CRITICAL: Check if user is active globally
        globalDb.get("SELECT is_active, system_role FROM users WHERE id = ?", [user.id], (err, row) => {
            if (err || !row || !row.is_active) {
                return res.status(403).json({ error: "Account is inactive." });
            }

            req.user = { ...user, systemRole: row.system_role };

            // If a household context is present, check if that link is active
            if (user.householdId) {
                globalDb.get("SELECT role, is_active FROM user_households WHERE user_id = ? AND household_id = ?", [user.id, user.householdId], (err, link) => {
                    if (err || !link || !link.is_active) {
                        // Resiliency: If the household context in the token is stale/deleted, 
                        // we null it out but ALLOW the request to proceed. 
                        // Specific RBAC checks (requireHouseholdRole) will still enforce 
                        // access to the actual target resource.
                        req.user.role = null;
                        req.user.householdId = null;
                        return next();
                    }
                    req.user.role = link.role; // Ensure we use the latest role from DB
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
        const targetIdRaw = req.params.id || req.params.hhId || req.body.householdId;
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
