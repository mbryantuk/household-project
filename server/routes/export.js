const express = require('express');
const router = express.Router();
const { getHouseholdDb, dbAll } = require('../db');
const { db } = require('../db/index');
const { households, users, userHouseholds } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');

/**
 * GET /api/export/:household_id
 * Exports all data for a household as a single JSON object.
 * Accessible by Household Admins or System Admins.
 */
router.get('/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  const householdId = parseInt(req.params.id);

  try {
    // 1. Fetch Global Metadata from Postgres
    const [hh] = await db.select().from(households).where(eq(households.id, householdId)).limit(1);
    if (!hh) return res.status(404).json({ error: 'Household not found' });

    const hhUsers = await db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: userHouseholds.role,
        joinedAt: userHouseholds.joinedAt,
      })
      .from(users)
      .innerJoin(userHouseholds, eq(users.id, userHouseholds.userId))
      .where(eq(userHouseholds.householdId, householdId));

    // 2. Fetch all data from the tenant database (SQLite)
    const hhDb = getHouseholdDb(householdId);

    // Get all tables
    const tables = await new Promise((resolve, reject) => {
      hhDb.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const tenantData = {};
    for (const table of tables) {
      const tableName = table.name;
      tenantData[tableName] = await new Promise((resolve, reject) => {
        hhDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }

    hhDb.close();

    // 3. Assemble the package
    const exportPackage = {
      metadata: {
        version: '1.0',
        exported_at: new Date().toISOString(),
        household_id: householdId,
        source: 'Hearth Tenant Export',
      },
      household: hh,
      users: hhUsers,
      data: tenantData,
    };

    // 4. Send response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=hearth-export-hh${householdId}-${new Date().toISOString().split('T')[0]}.json`
    );
    res.json(exportPackage);
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ error: 'Failed to export household data: ' + error.message });
  }
});

module.exports = router;
