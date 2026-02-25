const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { useTenantDb } = require('../middleware/tenant');
const { autoEncrypt, decryptData } = require('../middleware/encryption');
const { auditLog } = require('../services/audit');
const { dbAll, dbGet, dbRun } = require('../db');
const { NotFoundError, AppError, ConflictError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * GET /api/households/:id/members
 */
router.get('/', authenticateToken, requireHouseholdRole('viewer'), useTenantDb, async (req, res, next) => {
  try {
    req.ctx.logger.info({ msg: 'Fetching members', hhId: req.hhId });
    const rows = await dbAll(req.tenantDb, 'SELECT * FROM members WHERE household_id = ? AND deleted_at IS NULL', [req.hhId]);
    response.success(res, decryptData('members', rows || []));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/households/:id/members
 */
router.post(
  '/',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('members'),
  async (req, res, next) => {
    try {
      const { first_name, last_name, name, type, emoji, color, dob, species } = req.body;
      const finalName = name || first_name || 'New Member';

      if (req.isDryRun) {
        return response.success(res, { message: 'Dry run successful', data: { name: finalName, type } });
      }

      const { id: newId } = await dbRun(
        req.tenantDb,
        `INSERT INTO members (household_id, first_name, last_name, name, type, emoji, color, dob, species, version) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [req.hhId, first_name, last_name, finalName, type || 'adult', emoji, color, dob, species]
      );

      await auditLog(req.hhId, req.user.id, 'MEMBER_CREATE', 'member', newId, { name: finalName }, req);
      response.success(res, { id: newId, version: 1, ...req.body }, null, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/households/:id/members/:memberId
 * Item 181: Optimistic Locking
 */
router.put(
  '/:memberId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  autoEncrypt('members'),
  async (req, res, next) => {
    try {
      if (req.isDryRun) {
        return response.success(res, { message: 'Dry run successful', updates: req.body });
      }

      const { first_name, last_name, name, type, emoji, color, dob, species, alias } = req.body;
      const clientVersion = req.headers['x-version'] ? parseInt(req.headers['x-version']) : null;
      
      const updates = [];
      const params = [];

      if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
      if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
      if (name !== undefined) { updates.push('name = ?'); params.push(name); }
      if (type !== undefined) { updates.push('type = ?'); params.push(type); }
      if (emoji !== undefined) { updates.push('emoji = ?'); params.push(emoji); }
      if (color !== undefined) { updates.push('color = ?'); params.push(color); }
      if (dob !== undefined) { updates.push('dob = ?'); params.push(dob); }
      if (species !== undefined) { updates.push('species = ?'); params.push(species); }
      if (alias !== undefined) { updates.push('alias = ?'); params.push(alias); }

      if (updates.length === 0) throw new AppError('Nothing to update', 400);

      let sql = `UPDATE members SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND household_id = ? AND deleted_at IS NULL`;
      const queryParams = [...params, req.params.memberId, req.hhId];

      if (clientVersion !== null) {
        sql += ` AND version = ?`;
        queryParams.push(clientVersion);
      }

      const result = await dbRun(req.tenantDb, sql, queryParams);

      if (result.changes === 0) {
        const check = await dbGet(req.tenantDb, 'SELECT id FROM members WHERE id = ? AND household_id = ?', [req.params.memberId, req.hhId]);
        if (!check) throw new NotFoundError('Member not found');
        throw new ConflictError('The record has been modified by another user. Please refresh.');
      }

      await auditLog(req.hhId, req.user.id, 'MEMBER_UPDATE', 'member', parseInt(req.params.memberId), { updates: updates.map(u => u.split(' =')[0]) }, req);
      response.success(res, { message: 'Member updated' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/households/:id/members/:memberId
 */
router.delete(
  '/:memberId',
  authenticateToken,
  requireHouseholdRole('member'),
  useTenantDb,
  async (req, res, next) => {
    try {
      const result = await dbRun(
        req.tenantDb,
        'UPDATE members SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?',
        [req.params.memberId, req.hhId]
      );

      if (result.changes === 0) throw new NotFoundError('Member not found');

      await auditLog(req.hhId, req.user.id, 'MEMBER_DELETE', 'member', parseInt(req.params.memberId), null, req);
      response.success(res, { message: 'Member deleted (soft)' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
