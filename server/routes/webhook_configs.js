const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { dbAll, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');
const crypto = require('crypto');

/**
 * GET /api/households/:hhId/webhooks
 */
router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('admin'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM webhooks WHERE household_id = ? AND deleted_at IS NULL',
        [req.hhId]
      );
      response.success(res, rows);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:hhId/webhooks
 */
router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('admin'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const { url, events } = req.body;
      if (!url) throw new AppError('URL required', 400);

      const secret = `whs_${crypto.randomBytes(24).toString('hex')}`;
      const eventsJson = JSON.stringify(events || ['*']);

      const { id: newId } = await dbRun(
        req.tenantDb,
        'INSERT INTO webhooks (household_id, url, events, secret) VALUES (?, ?, ?, ?)',
        [req.hhId, url, eventsJson, secret]
      );

      response.success(res, { id: newId, url, secret, events: events || ['*'] }, null, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:hhId/webhooks/:id
 */
router.delete(
  '/:id',
  authenticateToken,
  requireHouseholdRole('admin'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const result = await dbRun(
        req.tenantDb,
        'UPDATE webhooks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
        [req.params.id, req.hhId]
      );
      if (result.changes === 0) throw new NotFoundError('Webhook not found');
      response.success(res, { message: 'Webhook deleted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
