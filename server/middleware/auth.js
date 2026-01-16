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
                        return res.status(403).json({ error: "Access to this household is inactive or denied." });
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
        // 1. Context Check
        const targetIdRaw = req.params.id || req.params.hhId || req.body.householdId;
        const targetHouseholdId = targetIdRaw ? parseInt(targetIdRaw) : null;
        const userHouseholdId = req.user.householdId ? parseInt(req.user.householdId) : null;

        if (targetHouseholdId && userHouseholdId !== targetHouseholdId) {
            return res.status(403).json({ error: "Access denied: Wrong household context" });
        }

        // 2. Role Hierarchy
        const roles = ['viewer', 'member', 'admin'];
        const userRoleIndex = roles.indexOf(req.user.role || 'viewer');
        const requiredRoleIndex = roles.indexOf(requiredRole);

        if (userRoleIndex >= requiredRoleIndex) {
            next();
        } else {
            res.status(403).json({ error: `Access denied: Required role ${requiredRole}, you are ${req.user.role}` });
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