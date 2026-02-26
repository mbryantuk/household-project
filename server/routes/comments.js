const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { dbAll, dbRun } = require('../db');
const { NotFoundError, AppError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * GET /api/households/:hhId/comments/:entityType/:entityId
 */
router.get(
  '/:entityType/:entityId',
  authenticateToken,
  requireHouseholdRole('viewer'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const rows = await dbAll(
        req.tenantDb,
        'SELECT * FROM comments WHERE household_id = ? AND entity_type = ? AND entity_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
        [req.hhId, req.params.entityType, req.params.entityId]
      );

      // Enrich with user info from global DB
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      const users = await req.ctx.loaders.getUsersLoader().loadMany(userIds);
      const userMap = {};
      users.forEach((u) => {
        if (u && !u.error) userMap[u.id] = u;
      });

      const enriched = rows.map((r) => ({
        ...r,
        user: userMap[r.user_id] || { firstName: 'System', avatar: '🤖' },
      }));

      response.success(res, enriched);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:hhId/comments/:entityType/:entityId
 */
router.post(
  '/:entityType/:entityId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const { content } = req.body;
      if (!content) throw new AppError('Comment content required', 400);

      const { id: newId } = await dbRun(
        req.tenantDb,
        'INSERT INTO comments (household_id, entity_type, entity_id, user_id, content) VALUES (?, ?, ?, ?, ?)',
        [req.hhId, req.params.entityType, req.params.entityId, req.user.id, content]
      );

      response.success(
        res,
        { id: newId, content, user_id: req.user.id, created_at: new Date() },
        null,
        201
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:hhId/comments/:id
 */
router.delete(
  '/:id',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const result = await dbRun(
        req.tenantDb,
        'UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ? AND user_id = ?',
        [req.params.id, req.hhId, req.user.id]
      );
      if (result.changes === 0) throw new NotFoundError('Comment not found or unauthorized');
      response.success(res, { message: 'Comment deleted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
