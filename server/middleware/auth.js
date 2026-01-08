const jwt = require('jsonwebtoken');
const { globalDb } = require('../db');
const { SECRET_KEY } = require('../config'); // 💡 FIX: Import the shared key

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        // If keys don't match here, it returns 403 immediately
        if (err) return res.sendStatus(403); 
        req.user = user;
        next();
    });
}

function requireHouseholdRole(requiredRole) {
    return (req, res, next) => {
        // SysAdmins bypass checks
        if (req.user && req.user.system_role === 'sysadmin') return next();

        // 1. Check if user is logged into the target household
        const targetIdRaw = req.params.id || req.body.householdId;
        const targetHouseholdId = targetIdRaw ? parseInt(targetIdRaw) : null;
        const userHouseholdId = req.user.householdId ? parseInt(req.user.householdId) : null;

        if (targetHouseholdId && userHouseholdId !== targetHouseholdId) {
            console.log(`🚫 Context Mismatch: User ${req.user.username} belongs to ${userHouseholdId}, requested ${targetHouseholdId}`);
            return res.status(403).json({ error: "Access denied: Wrong household context" });
        }

        // 2. Check Role Hierarchy
        const roles = ['viewer', 'member', 'admin'];
        const userRoleIndex = roles.indexOf(req.user.role);
        const requiredRoleIndex = roles.indexOf(requiredRole);

        if (userRoleIndex >= requiredRoleIndex) {
            next();
        } else {
            console.log(`🚫 Insufficient Role: User ${req.user.username} is ${req.user.role}, required ${requiredRole}`);
            res.status(403).json({ error: "Access denied: Insufficient permissions" });
        }
    };
}

module.exports = { authenticateToken, requireHouseholdRole, SECRET_KEY };