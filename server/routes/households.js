const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { households, userHouseholds, users } = require('../db/schema');
const { eq, ilike, and, sql } = require('drizzle-orm');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { auditLog } = require('../services/audit');
const { NotFoundError, AppError, ConflictError } = require('@hearth/shared');
const response = require('../utils/response');

/**
 * POST /api/households
 * Create a new household. Creator becomes admin.
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, currency, is_test } = req.body;
    if (!name) throw new AppError('Name required', 400);

    if (req.isDryRun) {
      return response.success(res, { message: 'Dry run successful', data: { name, currency, is_test } });
    }

    const result = await req.ctx.db.transaction(async (tx) => {
      const [hh] = await tx
        .insert(households)
        .values({
          name,
          currency: currency || 'GBP',
          isTest: is_test ? 1 : 0,
        })
        .returning();

      await tx.insert(userHouseholds).values({
        userId: req.user.id,
        householdId: hh.id,
        role: 'admin',
      });

      return hh;
    });

    response.success(res, result, null, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/households/:id
 */
router.get('/:id', authenticateToken, requireHouseholdRole('viewer'), async (req, res, next) => {
  try {
    const [hh] = await req.ctx.db
      .select()
      .from(households)
      .where(eq(households.id, parseInt(req.params.id)))
      .limit(1);
    if (!hh) throw new NotFoundError('Household not found');
    response.success(res, hh);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/households/:id
 */
router.put('/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res, next) => {
  try {
    const { name, currency } = req.body;
    const clientVersion = req.headers['x-version'] ? parseInt(req.headers['x-version']) : null;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (currency !== undefined) updates.currency = currency;

    if (Object.keys(updates).length === 0) throw new AppError('Nothing to update', 400);

    const hhId = parseInt(req.params.id);

    // Item 181: Optimistic Locking
    if (clientVersion !== null) {
      const result = await req.ctx.db
        .update(households)
        .set({ ...updates, version: sql`version + 1`, updatedAt: new Date() })
        .where(and(eq(households.id, hhId), eq(households.version, clientVersion)));

      if (result.rowCount === 0) {
        throw new ConflictError('The record has been modified by another user. Please refresh.');
      }
    } else {
      await req.ctx.db
        .update(households)
        .set({ ...updates, version: sql`version + 1`, updatedAt: new Date() })
        .where(eq(households.id, hhId));
    }

    response.success(res, { message: 'Household updated' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/households/:id/backups (List)
 */
router.get('/:id/backups', authenticateToken, requireHouseholdRole('admin'), async (req, res, next) => {
  try {
    const { listBackups } = require('../services/backup');
    const backups = await listBackups(req.params.id);
    response.success(res, backups);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/households/:id/backups (Create)
 */
router.post('/:id/backups', authenticateToken, requireHouseholdRole('admin'), async (req, res, next) => {
  try {
    const { createBackup } = require('../services/backup');
    const filename = await createBackup(req.params.id, {
      source: 'User Triggered',
      created_by: req.user.id,
      exported_at: new Date().toISOString(),
    });
    response.success(res, { message: 'Backup created', filename });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/households/:id
 */
router.delete('/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res, next) => {
  try {
    const householdId = parseInt(req.params.id);
    await req.ctx.db.transaction(async (tx) => {
      await tx.delete(userHouseholds).where(eq(userHouseholds.householdId, householdId));
      await tx.delete(households).where(eq(households.id, householdId));
    });

    // Cleanup SQLite file
    const dbPath = path.join(__dirname, '../data', `household_${householdId}.db`);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    response.success(res, { message: 'Household deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/households/:id/select
 */
router.post('/:id/select', authenticateToken, requireHouseholdRole('viewer'), async (req, res, next) => {
  try {
    const hhId = parseInt(req.params.id);
    await req.ctx.db.update(users).set({ lastHouseholdId: hhId }).where(eq(users.id, req.user.id));
    response.success(res, { message: 'Household selected' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/households/:id/users
 * Item 161: Using DataLoader for batching.
 */
router.get('/:id/users', authenticateToken, requireHouseholdRole('viewer'), async (req, res, next) => {
  try {
    const hhId = parseInt(req.params.id);

    const links = await req.ctx.db
      .select({
        userId: userHouseholds.userId,
        role: userHouseholds.role,
        isActive: userHouseholds.isActive,
        joinedAt: userHouseholds.joinedAt,
      })
      .from(userHouseholds)
      .where(eq(userHouseholds.householdId, hhId));

    const userIds = links.map((l) => l.userId);
    const userDatas = await req.ctx.loaders.getUsersLoader().loadMany(userIds);

    const results = links.map((link, idx) => ({
      ...link,
      user: userDatas[idx],
    }));

    response.success(res, results);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/households/:id/users
 */
router.post('/:id/users', authenticateToken, requireHouseholdRole('admin'), async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const householdId = parseInt(req.params.id);

    const [user] = await req.ctx.db.select().from(users).where(ilike(users.email, email)).limit(1);
    if (!user) throw new NotFoundError('User not found');

    await req.ctx.db
      .insert(userHouseholds)
      .values({
        userId: user.id,
        householdId: householdId,
        role: role || 'member',
      })
      .onConflictDoUpdate({
        target: [userHouseholds.userId, userHouseholds.householdId],
        set: { role: role || 'member', isActive: true },
      });

    response.success(res, { message: 'User added/updated in household' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

