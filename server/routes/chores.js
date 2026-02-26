const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { auditLog } = require('../services/audit');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError, ConflictError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * GET /api/households/:id/chores
 */
router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      req.ctx.logger.info({ msg: 'Fetching chores', hhId: req.hhId });
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM chores WHERE household_id = ? AND deleted_at IS NULL',
        [req.hhId]
      );
      response.success(res, rows || []);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/chores/stats
 * Item 108: Enhanced stats for gamification UI.
 */
router.get(
  '/stats',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const stats = await dbAll(
        req.tenantDb,
        `SELECT m.id, m.name, m.emoji, 
              COUNT(cc.id) as tasks_completed, 
              SUM(COALESCE(cc.value_earned, 0)) as total_earned
       FROM members m
       LEFT JOIN chore_completions cc ON m.id = cc.member_id AND cc.household_id = ?
       WHERE m.household_id = ? AND m.deleted_at IS NULL
       GROUP BY m.id`,
        [req.hhId, req.hhId]
      );
      response.success(res, stats || []);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/chores
 */
router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      if (req.isDryRun) {
        return response.success(res, { message: 'Dry run successful', data: req.body });
      }

      const { name, description, assigned_member_id, frequency, value, next_due_date, emoji } =
        req.body;
      const { id: newId } = await dbRun(
        req.tenantDb,
        `INSERT INTO chores (household_id, name, description, assigned_member_id, frequency, value, next_due_date, emoji, version) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [req.hhId, name, description, assigned_member_id, frequency, value, next_due_date, emoji]
      );

      await auditLog(req.hhId, req.user.id, 'CHORE_CREATE', 'chore', newId, { name }, req);
      response.success(res, { id: newId, version: 1, ...req.body }, null, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/households/:id/chores/:itemId
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
      const clientVersion = req.headers['x-version'] ? parseInt(req.headers['x-version']) : null;

      delete updates.id;
      delete updates.household_id;
      delete updates.version;

      const keys = Object.keys(updates);
      if (keys.length === 0) throw new AppError('Nothing to update', 400);

      const fields = keys.map((k) => `${k} = ?`);
      let sql = `UPDATE chores SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND household_id = ? AND deleted_at IS NULL`;
      const queryParams = [...Object.values(updates), req.params.itemId, req.hhId];

      if (clientVersion !== null) {
        sql += ` AND version = ?`;
        queryParams.push(clientVersion);
      }

      const result = await dbRun(req.tenantDb, sql, queryParams);

      if (result.changes === 0) {
        const check = await dbGet(
          req.tenantDb,
          'SELECT id FROM chores WHERE id = ? AND household_id = ?',
          [req.params.itemId, req.hhId]
        );
        if (!check) throw new NotFoundError('Chore not found');
        throw new ConflictError('The record has been modified by another user.');
      }

      await auditLog(
        req.hhId,
        req.user.id,
        'CHORE_UPDATE',
        'chore',
        parseInt(req.params.itemId),
        { updates: keys },
        req
      );
      response.success(res, { message: 'Chore updated' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:id/chores/:itemId
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
        'UPDATE chores SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
        [req.params.itemId, req.hhId]
      );

      if (result.changes === 0) throw new NotFoundError('Chore not found');

      await auditLog(
        req.hhId,
        req.user.id,
        'CHORE_DELETE',
        'chore',
        parseInt(req.params.itemId),
        null,
        req
      );
      response.success(res, { message: 'Chore deleted (soft)' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/chores/:itemId/complete
 */
router.post(
  '/:itemId/complete',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const chore = await dbGet(
        req.tenantDb,
        'SELECT * FROM chores WHERE id = ? AND household_id = ?',
        [req.params.itemId, req.hhId]
      );
      if (!chore) throw new NotFoundError('Chore not found');

      const { id: completionId } = await dbRun(
        req.tenantDb,
        'INSERT INTO chore_completions (household_id, chore_id, member_id, completed_at, value_earned) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)',
        [req.hhId, req.params.itemId, req.user.id, chore.value || 0]
      );

      const { dispatchWebhook } = require('../services/webhook_dispatcher');
      await dispatchWebhook(req.hhId, 'chore.completed', {
        chore_id: chore.id,
        name: chore.name,
        member_id: req.user.id,
        value: chore.value || 0,
      });

      await auditLog(
        req.hhId,
        req.user.id,
        'CHORE_COMPLETE',
        'chore',
        parseInt(req.params.itemId),
        { completionId },
        req
      );
      response.success(res, { message: 'Chore completed', completionId });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
