const express = require('express');
const router = express.Router();
const { globalDb, getHouseholdDb, dbAll, dbGet } = require('../db');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

/**
 * GET /api/export/:household_id
 * Exports all data for a household as a single JSON object.
 * Accessible by Household Admins or System Admins.
 */
router.get('/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
    const householdId = req.params.id;

    try {
        // 1. Fetch Global Metadata
        const household = await dbGet(globalDb, "SELECT * FROM households WHERE id = ?", [householdId]);
        if (!household) return res.status(404).json({ error: "Household not found" });

        const users = await dbAll(globalDb, `
            SELECT u.email, u.first_name, u.last_name, uh.role, uh.joined_at
            FROM users u
            JOIN user_households uh ON u.id = uh.user_id
            WHERE uh.household_id = ?
        `, [householdId]);

        // 2. Fetch all data from the tenant database
        const hhDb = getHouseholdDb(householdId);
        
        // Get all tables
        const tables = await dbAll(hhDb, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        
        const tenantData = {};
        for (const table of tables) {
            const tableName = table.name;
            tenantData[tableName] = await dbAll(hhDb, `SELECT * FROM ${tableName}`);
        }

        hhDb.close();

        // 3. Assemble the package
        const exportPackage = {
            metadata: {
                version: "1.0",
                exported_at: new Date().toISOString(),
                household_id: householdId,
                source: "Totem Tenant Export"
            },
            household,
            users,
            data: tenantData
        };

        // 4. Send response
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=totem-export-hh${householdId}-${new Date().toISOString().split('T')[0]}.json`);
        res.json(exportPackage);

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ error: "Failed to export household data: " + error.message });
    }
});

module.exports = router;