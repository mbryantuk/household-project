const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { auditLog } = require('../services/audit');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * UTILITY & COMPLIANCE ROUTER
 * Item 212: CRUD for Energy, Water, Waste, and Council Tax.
 */

const UTILITY_TYPES = ['energy', 'water', 'waste', 'council'];

UTILITY_TYPES.forEach((type) => {
  const table = `${type}_accounts`;

  // GET /api/households/:hhId/:type
  router.get(
    `/${type}`,
    authenticateToken,
    requireHouseholdRole('viewer'),
    useTenantDb,
    async (req, res, next) => {
      try {
        const rows = await dbAll(
          req.tenantDb,
          `SELECT * FROM ${table} WHERE household_id = ? AND deleted_at IS NULL`,
          [req.hhId]
        );
        response.success(res, rows || []);
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /api/households/:hhId/:type
  router.post(
    `/${type}`,
    authenticateToken,
    requireHouseholdRole('member'),
    useTenantDb,
    async (req, res, next) => {
      try {
        if (req.isDryRun) return response.success(res, { message: 'Dry run', data: req.body });

        const cols = await dbAll(req.tenantDb, `PRAGMA table_info(${table})`, []);
        const validColumns = cols.map((c) => c.name);

        const insertData = { household_id: req.hhId, version: 1 };
        Object.keys(req.body).forEach((key) => {
          if (validColumns.includes(key) && key !== 'id' && key !== 'household_id') {
            insertData[key] = req.body[key];
          }
        });

        const fields = Object.keys(insertData);
        const placeholders = fields.map(() => '?').join(', ');

        const { id: newId } = await dbRun(
          req.tenantDb,
          `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`,
          Object.values(insertData)
        );

        await auditLog(
          req.hhId,
          req.user.id,
          `UTILITY_${type.toUpperCase()}_CREATE`,
          table,
          newId,
          { provider: req.body.provider || req.body.authority_name || req.body.waste_type },
          req
        );
        response.success(res, { id: newId, ...insertData }, null, 201);
      } catch (err) {
        next(err);
      }
    }
  );

  // PUT /api/households/:hhId/:type/:id
  router.put(
    `/${type}/:id`,
    authenticateToken,
    requireHouseholdRole('member'),
    useTenantDb,
    async (req, res, next) => {
      try {
        if (req.isDryRun) return response.success(res, { message: 'Dry run', updates: req.body });

        const cols = await dbAll(req.tenantDb, `PRAGMA table_info(${table})`, []);
        const validColumns = cols.map((c) => c.name);

        const updates = {};
        Object.keys(req.body).forEach((key) => {
          if (validColumns.includes(key) && !['id', 'household_id', 'version'].includes(key)) {
            updates[key] = req.body[key];
          }
        });

        if (Object.keys(updates).length === 0) throw new AppError('Nothing to update', 400);

        const fields = Object.keys(updates).map((k) => `${k} = ?`);
        const result = await dbRun(
          req.tenantDb,
          `UPDATE ${table} SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND household_id = ? AND deleted_at IS NULL`,
          [...Object.values(updates), req.params.id, req.hhId]
        );

        if (result.changes === 0) throw new NotFoundError('Account not found');

        await auditLog(
          req.hhId,
          req.user.id,
          `UTILITY_${type.toUpperCase()}_UPDATE`,
          table,
          parseInt(req.params.id),
          { updates: Object.keys(updates) },
          req
        );
        response.success(res, { message: 'Updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  // DELETE /api/households/:hhId/:type/:id
  router.delete(
    `/${type}/:id`,
    authenticateToken,
    requireHouseholdRole('member'),
    useTenantDb,
    async (req, res, next) => {
      try {
        const result = await dbRun(
          req.tenantDb,
          `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?`,
          [req.params.id, req.hhId]
        );

        if (result.changes === 0) throw new NotFoundError('Account not found');

        await auditLog(
          req.hhId,
          req.user.id,
          `UTILITY_${type.toUpperCase()}_DELETE`,
          table,
          parseInt(req.params.id),
          null,
          req
        );
        response.success(res, { message: 'Deleted (soft)' });
      } catch (err) {
        next(err);
      }
    }
  );
});

/**
 * UTILITY READINGS (Meter Logs)
 * Item 262: Advanced Usage Analytics
 */
router.get(
  '/:type/readings',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM utility_readings WHERE utility_type = ? AND household_id = ? AND deleted_at IS NULL ORDER BY reading_date DESC',
        [req.params.type, req.hhId]
      );
      response.success(res, rows || []);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:type/readings',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const { account_id, reading_date, value, unit, notes } = req.body;
      const { id: newId } = await dbRun(
        req.tenantDb,
        'INSERT INTO utility_readings (household_id, utility_type, account_id, reading_date, value, unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          req.hhId,
          req.params.type,
          account_id,
          reading_date || new Date().toISOString().split('T')[0],
          value,
          unit,
          notes,
        ]
      );
      response.success(res, { id: newId, ...req.body }, null, 201);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
