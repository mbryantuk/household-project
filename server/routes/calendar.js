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
 * GET /api/households/:id/calendar
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res, next) => {
  try {
    const rows = await dbAll(req.tenantDb, 'SELECT * FROM dates WHERE household_id = ? AND deleted_at IS NULL', [req.hhId]);
    response.success(res, decryptData('dates', rows || []));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/households/:id/calendar/:id
 */
router.get('/:id', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res, next) => {
  try {
    const row = await dbGet(
      req.tenantDb,
      'SELECT * FROM dates WHERE id = ? AND household_id = ? AND deleted_at IS NULL',
      [req.params.id, req.hhId]
    );
    if (!row) throw new NotFoundError('Calendar entry not found');
    response.success(res, decryptData('dates', row));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/households/:id/calendar
 */
router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('dates'),
  async (req, res, next) => {
    try {
      if (req.isDryRun) {
        return response.success(res, { message: 'Dry run successful', data: req.body });
      }

      const { title, date, end_date, type, parent_type, parent_id, is_all_day, remind_days, description, emoji, recurrence, recurrence_end_date } = req.body;

      const { id: newId } = await dbRun(
        req.tenantDb,
        `INSERT INTO dates (household_id, title, date, end_date, type, parent_type, parent_id, is_all_day, remind_days, description, emoji, recurrence, recurrence_end_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.hhId, title, date, end_date, type, parent_type, parent_id, is_all_day || 1, remind_days || 0, description, emoji, recurrence || 'none', recurrence_end_date]
      );

      await auditLog(req.hhId, req.user.id, 'CALENDAR_CREATE', 'dates', newId, { title }, req);
      response.success(res, { id: newId, ...req.body }, null, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/households/:id/calendar/:id
 */
router.put(
  '/:id',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('dates'),
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
        `UPDATE dates SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ? AND deleted_at IS NULL`,
        [...Object.values(updates), req.params.id, req.hhId]
      );

      if (result.changes === 0) throw new NotFoundError('Calendar entry not found');

      await auditLog(req.hhId, req.user.id, 'CALENDAR_UPDATE', 'dates', parseInt(req.params.id), { updates: Object.keys(updates) }, req);
      response.success(res, { message: 'Updated' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:id/calendar/:id
 */
router.delete('/:id', authenticateToken, requireHouseholdRole('member'), useTenantDb, async (req, res, next) => {
  try {
    const result = await dbRun(
      req.tenantDb,
      'UPDATE dates SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
      [req.params.id, req.hhId]
    );

    if (result.changes === 0) throw new NotFoundError('Calendar entry not found');

    await auditLog(req.hhId, req.user.id, 'CALENDAR_DELETE', 'dates', parseInt(req.params.id), null, req);
    response.success(res, { message: 'Deleted (soft)' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
