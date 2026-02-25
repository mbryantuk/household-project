const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { auditLog } = require('../services/audit');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * GET /api/households/:id/details
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res, next) => {
  try {
    const row = await dbGet(req.tenantDb, 'SELECT * FROM house_details WHERE household_id = ?', [req.hhId]);
    response.success(res, decryptData('house_details', row) || {});
  } catch (err) { next(err); }
});

/**
 * PUT /api/households/:id/details
 */
router.put(
  '/',
  authenticateToken,
  requireHouseholdRole('admin'),
  useTenantDb,
  autoEncrypt('house_details'),
  async (req, res, next) => {
    try {
      if (req.isDryRun) return response.success(res, { message: 'Dry run', updates: req.body });

      const cols = await dbAll(req.tenantDb, 'PRAGMA table_info(house_details)', []);
      const validColumns = cols.map(c => c.name);
      
      const updates = {};
      Object.keys(req.body).forEach(k => {
        if (validColumns.includes(k) && k !== 'household_id') updates[k] = req.body[k];
      });

      if (Object.keys(updates).length === 0) {
        return response.success(res, { message: 'No changes needed' });
      }

      const keys = Object.keys(updates);
      const placeholders = keys.map(() => '?').join(', ');
      const setClause = keys.map(k => `${k} = excluded.${k}`).join(', ');

      await dbRun(
        req.tenantDb,
        `INSERT INTO house_details (household_id, ${keys.join(', ')}) 
         VALUES (?, ${placeholders})
         ON CONFLICT(household_id) DO UPDATE SET ${setClause}`,
        [req.hhId, ...Object.values(updates)]
      );

      await auditLog(req.hhId, req.user.id, 'HOUSE_DETAILS_UPDATE', 'house_details', null, { updates: keys }, req);
      response.success(res, { message: 'Updated' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
