const { getHouseholdDb, ensureHouseholdSchema } = require('../db');

/**
 * Multi-Tenancy Enforcement Middleware
 * Ensures the household database exists and has the correct schema
 * before passing control to the route handlers.
 */
const useTenantDb = async (req, res, next) => {
    const hhId = req.params.id;
    if (!hhId) return res.status(400).json({ error: "Household ID required" });

    try {
        const db = getHouseholdDb(hhId);
        await ensureHouseholdSchema(db, hhId);
        req.tenantDb = db;
        req.hhId = hhId;
        next();
    } catch (err) {
        console.error(`[TenantDB] Initialization failed for household ${hhId}:`, err);
        res.status(500).json({ error: "Database initialization failed: " + err.message });
    }
};

module.exports = { useTenantDb };
