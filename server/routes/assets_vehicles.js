const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * GENERIC OBJECT ROUTES (Assets, Vehicles)
 */
const OBJECT_TABLES = ['assets', 'vehicles'];

OBJECT_TABLES.forEach((table) => {
  router.get(
    `/${table}`,
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
        response.success(res, decryptData(table, rows || []));
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    `/${table}/:id`,
    authenticateToken,
    requireHouseholdRole('viewer'),
    useTenantDb,
    async (req, res, next) => {
      try {
        const row = await dbGet(
          req.tenantDb,
          `SELECT * FROM ${table} WHERE id = ? AND household_id = ? AND deleted_at IS NULL`,
          [req.params.id, req.hhId]
        );
        if (!row) throw new NotFoundError(`${table.slice(0, -1)} not found`);
        response.success(res, decryptData(table, row));
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    `/${table}`,
    authenticateToken,
    requireHouseholdRole('member'),
    useTenantDb,
    autoEncrypt(table),
    async (req, res, next) => {
      try {
        if (req.isDryRun) return response.success(res, { message: 'Dry run', data: req.body });
        const keys = Object.keys(req.body);
        const { id: newId } = await dbRun(
          req.tenantDb,
          `INSERT INTO ${table} (household_id, ${keys.join(', ')}, version) VALUES (?, ${keys.map(() => '?').join(', ')}, 1)`,
          [req.hhId, ...Object.values(req.body)]
        );
        response.success(res, { id: newId, version: 1, ...req.body }, null, 201);
      } catch (err) {
        next(err);
      }
    }
  );

  router.put(
    `/${table}/:id`,
    authenticateToken,
    requireHouseholdRole('member'),
    useTenantDb,
    autoEncrypt(table),
    async (req, res, next) => {
      try {
        if (req.isDryRun) return response.success(res, { message: 'Dry run', updates: req.body });
        const updates = { ...req.body };
        delete updates.id;
        delete updates.household_id;
        delete updates.version;

        const keys = Object.keys(updates);
        if (keys.length === 0) throw new AppError('Nothing to update', 400);

        const fields = keys.map((k) => `${k} = ?`);
        const result = await dbRun(
          req.tenantDb,
          `UPDATE ${table} SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND household_id = ? AND deleted_at IS NULL`,
          [...Object.values(updates), req.params.id, req.hhId]
        );
        if (result.changes === 0) throw new NotFoundError(`${table.slice(0, -1)} not found`);
        response.success(res, { message: 'Updated' });
      } catch (err) {
        next(err);
      }
    }
  );

  router.delete(
    `/${table}/:id`,
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
        if (result.changes === 0) throw new NotFoundError(`${table.slice(0, -1)} not found`);
        response.success(res, { message: 'Deleted' });
      } catch (err) {
        next(err);
      }
    }
  );
});

/**
 * GET /api/households/:hhId/vehicles/maintenance-forecast
 * Item 224: Prediction based on mileage
 */
router.get(
  '/vehicles/forecast/maintenance',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const { getVehicleMaintenanceForecast } = require('../services/vehicle_forecasting');
      const result = await getVehicleMaintenanceForecast(req.hhId);
      response.success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
