const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { auditLog } = require('../services/audit');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * GET /api/households/:id/finance/recurring-costs
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res, next) => {
  try {
    const rows = await dbAll(
      req.tenantDb,
      'SELECT * FROM recurring_costs WHERE household_id = ? AND deleted_at IS NULL',
      [req.hhId]
    );
    response.success(res, rows || []);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/households/:id/finance/recurring-costs/:itemId
 */
router.get(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const row = await dbGet(
        req.tenantDb,
        'SELECT * FROM recurring_costs WHERE id = ? AND household_id = ? AND deleted_at IS NULL',
        [req.params.itemId, req.hhId]
      );
      if (!row) throw new NotFoundError('Recurring cost not found');
      response.success(res, row);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/finance/recurring-costs
 */
router.post('/', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res, next) => {
  try {
    if (req.isDryRun) {
      return response.success(res, { message: 'Dry run successful', data: req.body });
    }

    const {
      name,
      amount,
      category_id,
      frequency,
      day_of_month,
      object_type,
      object_id,
      bank_account_id,
      financial_profile_id,
      metadata,
    } = req.body;

    const { id: newId } = await dbRun(
      req.tenantDb,
      `INSERT INTO recurring_costs (household_id, name, amount, category_id, frequency, day_of_month, object_type, object_id, bank_account_id, financial_profile_id, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.hhId,
        name,
        amount,
        category_id,
        frequency,
        day_of_month,
        object_type,
        object_id,
        bank_account_id,
        financial_profile_id,
        JSON.stringify(metadata || {}),
      ]
    );

    await auditLog(req.hhId, req.user.id, 'RECURRING_COST_CREATE', 'recurring_cost', newId, { name }, req);
    response.success(res, { id: newId, ...req.body }, null, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/households/:id/finance/recurring-costs/:itemId
 */
router.put(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      if (req.isDryRun) {
        return response.success(res, { message: 'Dry run successful', updates: req.body });
      }

      const updates = { ...req.body };
      delete updates.id;
      delete updates.household_id;

      const fields = Object.keys(updates).map(k => `${k} = ?`);
      if (fields.length === 0) throw new AppError('Nothing to update', 400);

      const result = await dbRun(
        req.tenantDb,
        `UPDATE recurring_costs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ? AND deleted_at IS NULL`,
        [...Object.values(updates), req.params.itemId, req.hhId]
      );

      if (result.changes === 0) throw new NotFoundError('Recurring cost not found');

      await auditLog(
        req.hhId,
        req.user.id,
        'RECURRING_COST_UPDATE',
        'recurring_cost',
        parseInt(req.params.itemId),
        { updates: Object.keys(updates) },
        req
      );
      response.success(res, { message: 'Updated' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:id/finance/recurring-costs/:itemId
 */
router.delete(
  '/:itemId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const result = await dbRun(
        req.tenantDb,
        'UPDATE recurring_costs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
        [req.params.itemId, req.hhId]
      );

      if (result.changes === 0) throw new NotFoundError('Recurring cost not found');

      await auditLog(
        req.hhId,
        req.user.id,
        'RECURRING_COST_DELETE',
        'recurring_cost',
        parseInt(req.params.itemId),
        null,
        req
      );
      response.success(res, { message: 'Deleted (soft)' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

