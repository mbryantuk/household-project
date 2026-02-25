const express = require('express');
const router = express.Router();
const { getHouseholdDb } = require('../db');
const { households, users, userHouseholds, userProfiles } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const response = require('../utils/response');

/**
 * GET /api/export/:id
 * Exports all data for a household as a single JSON object.
 */
router.get('/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res, next) => {
  const householdId = parseInt(req.params.id);

  try {
    // 1. Fetch Global Metadata from Postgres
    const [hh] = await req.ctx.db.select().from(households).where(eq(households.id, householdId)).limit(1);
    if (!hh) return response.error(res, 'Household not found', null, 404);

    const hhUsers = await req.ctx.db
      .select({
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        role: userHouseholds.role,
        joinedAt: userHouseholds.joinedAt,
      })
      .from(users)
      .innerJoin(userHouseholds, eq(users.id, userHouseholds.userId))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(userHouseholds.householdId, householdId));

    // 2. Fetch all data from the tenant database (SQLite)
    const hhDb = getHouseholdDb(householdId);

    const tables = await new Promise((resolve, reject) => {
      hhDb.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const tenantData = {};
    for (const table of tables) {
      const tableName = table.name;
      tenantData[tableName] = await new Promise((resolve, reject) => {
        hhDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }

    hhDb.close();

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

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=hearth-export-hh${householdId}-${new Date().toISOString().split('T')[0]}.json`
    );
    
    return response.success(res, exportPackage);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
