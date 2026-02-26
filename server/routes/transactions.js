const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { auditLog } = require('../services/audit');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * TRANSACTION LEDGER ROUTER
 * Item 231: Inline Batch Editing support
 */

// GET /api/households/:id/transactions
router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM transactions WHERE household_id = ? AND deleted_at IS NULL ORDER BY date DESC',
        [req.hhId]
      );
      response.success(res, rows || []);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/households/:id/transactions (Single or Batch)
router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const items = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];

      for (const item of items) {
        const { account_id, date, description, amount, category, tags, notes } = item;
        const { id: newId } = await dbRun(
          req.tenantDb,
          'INSERT INTO transactions (household_id, account_id, date, description, amount, category, tags, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [req.hhId, account_id, date, description, amount, category, tags, notes]
        );
        results.push({ id: newId, ...item });
      }

      await auditLog(
        req.hhId,
        req.user.id,
        'TRANSACTION_CREATE',
        'transactions',
        null,
        { count: items.length },
        req
      );
      response.success(res, Array.isArray(req.body) ? results : results[0], null, 201);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/households/:id/transactions/batch (Batch Update)
router.patch(
  '/batch',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const { ids, updates } = req.body;
      if (!ids || !Array.isArray(ids) || !updates)
        throw new AppError('Invalid batch update payload', 400);

      const fields = Object.keys(updates).map((k) => `${k} = ?`);
      const values = Object.values(updates);

      const sql = `UPDATE transactions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE household_id = ? AND id IN (${ids.map(() => '?').join(',')})`;

      await dbRun(req.tenantDb, sql, [...values, req.hhId, ...ids]);

      await auditLog(
        req.hhId,
        req.user.id,
        'TRANSACTION_BATCH_UPDATE',
        'transactions',
        null,
        { ids, updates: Object.keys(updates) },
        req
      );
      response.success(res, { message: 'Batch update successful' });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/households/:id/transactions/:id
router.put(
  '/:id',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const updates = { ...req.body };
      delete updates.id;
      delete updates.household_id;

      const fields = Object.keys(updates).map((k) => `${k} = ?`);
      const result = await dbRun(
        req.tenantDb,
        `UPDATE transactions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND household_id = ? AND deleted_at IS NULL`,
        [...Object.values(updates), req.params.id, req.hhId]
      );

      if (result.changes === 0) throw new NotFoundError('Transaction not found');
      response.success(res, { message: 'Updated' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
