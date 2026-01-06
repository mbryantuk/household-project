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
        const householdId = req.params.id || req.body.householdId;
        
        // This bypass is correct, but only works if jwt.verify succeeds first
        if (req.user && req.user.system_role === 'sysadmin') return next();

        const sql = `SELECT role FROM user_households WHERE user_id = ? AND household_id = ?`;
        globalDb.get(sql, [req.user.id, householdId], (err, row) => {
            if (err || !row) return res.sendStatus(403);
            
            const roles = ['viewer', 'member', 'admin'];
            if (roles.indexOf(row.role) >= roles.indexOf(requiredRole)) {
                next();
            } else {
                res.sendStatus(403);
            }
        });
    };
}

module.exports = { authenticateToken, requireHouseholdRole, SECRET_KEY };