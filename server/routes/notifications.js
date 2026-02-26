const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { dbAll, dbRun } = require('../db');
const { NotFoundError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * GET /api/households/:id/notifications
 * Pattern: DI, Category Filtering
 */
router.get(
  '/',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM notifications WHERE household_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
        [req.hhId]
      );

      // Grouping by type for UI consumption
      const categorized = {
        urgent: rows.filter((n) => n.type === 'urgent' && !n.is_read),
        upcoming: rows.filter((n) => n.type === 'upcoming' && !n.is_read),
        info: rows.filter((n) => (n.type === 'info' || !n.type) && !n.is_read),
      };

      response.success(res, categorized);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/notifications/all
 * Item 242: Full history
 */
router.get(
  '/all',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM notifications WHERE household_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200',
        [req.hhId]
      );
      response.success(res, rows);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/notifications/:nid/read
 */
router.post(
  '/:nid/read',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const result = await dbRun(
        req.tenantDb,
        'UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
        [req.params.nid, req.hhId]
      );
      if (result.changes === 0) throw new NotFoundError('Notification not found');
      response.success(res, { message: 'Marked as read' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/notifications/dismiss-all
 */
router.post(
  '/dismiss-all',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      await dbRun(
        req.tenantDb,
        'UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE household_id = ? AND is_read = 0',
        [req.hhId]
      );
      response.success(res, { message: 'All notifications dismissed' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/notifications/stream
 * Item 163: Server-Sent Events (SSE)
 */
router.get('/stream', authenticateToken, requireHouseholdRole('viewer'), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const hhId = req.params.hhId || req.params.id;

  const onActivity = (data) => {
    if (String(data.householdId) === String(hhId)) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  const { EventEmitter } = require('events');
  if (!global.activityEmitter) global.activityEmitter = new EventEmitter();

  global.activityEmitter.on('activity', onActivity);

  req.on('close', () => {
    global.activityEmitter.removeListener('activity', onActivity);
    res.end();
  });
});

module.exports = router;
