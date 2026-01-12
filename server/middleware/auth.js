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
        globalDb.get("SELECT is_active FROM users WHERE id = ?", [user.id], (err, row) => {
            if (err || !row || !row.is_active) {
                return res.status(403).json({ error: "Account is inactive." });
            }

            // If a household context is present, check if that link is active
            if (user.householdId) {
                globalDb.get("SELECT is_active FROM user_households WHERE user_id = ? AND household_id = ?", [user.id, user.householdId], (err, link) => {
                    if (err || !link || !link.is_active) {
                        return res.status(403).json({ error: "Access to this household is inactive." });
                    }
                    req.user = user;
                    next();
                });
            } else {
                req.user = user;
                next();
            }
        });
    });
}

function requireHouseholdRole(requiredRole) {
    return (req, res, next) => {
        // 1. Check if user is logged into the target household
        // Support both :id and :hhId parameter names
        const targetIdRaw = req.params.id || req.params.hhId || req.body.householdId;
        const targetHouseholdId = targetIdRaw ? parseInt(targetIdRaw) : null;
        const userHouseholdId = req.user.householdId ? parseInt(req.user.householdId) : null;

        if (targetHouseholdId && userHouseholdId !== targetHouseholdId) {
            console.log(`🚫 Context Mismatch: User ${req.user.email} (HH:${userHouseholdId}) tried to access HH:${targetHouseholdId}`);
            return res.status(403).json({ error: "Access denied: Wrong household context" });
        }

        // 2. Check Role Hierarchy
        const roles = ['viewer', 'member', 'admin'];
        const userRoleIndex = roles.indexOf(req.user.role);
        const requiredRoleIndex = roles.indexOf(requiredRole);

        if (userRoleIndex >= requiredRoleIndex) {
            next();
        } else {
            console.log(`🚫 Insufficient Role: User ${req.user.email} is ${req.user.role}, required ${requiredRole}`);
            res.status(403).json({ error: "Access denied: Insufficient permissions" });
        }
    };
}

module.exports = { authenticateToken, requireHouseholdRole, SECRET_KEY };
