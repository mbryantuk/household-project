const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { households, userHouseholds, users, userProfiles } = require('../db/schema');
const { eq, ilike, and, sql, gte } = require('drizzle-orm');
const { authenticateToken, requireHouseholdRole } = require('../middleware/auth');
const { auditLog } = require('../services/audit');
const { getActivityHeatmap } = require('../services/activity_analytics');
const { NotFoundError, AppError, ConflictError } = require('@hearth/shared');
const response = require('../utils/response');
const QRCode = require('qrcode');
const { invitations } = require('../db/schema');

/**
 * POST /api/households/:id/guest-token
 * Item 292: Guest Access Token Generation
 */
router.post(
  '/:id/guest-token',
  authenticateToken,
  requireHouseholdRole('admin'),
  async (req, res, next) => {
    try {
      const hhId = parseInt(req.params.id);
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days default

      await req.ctx.db
        .update(households)
        .set({ guestToken: token, guestTokenExpires: expiresAt })
        .where(eq(households.id, hhId));

      response.success(res, { token, expiresAt });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/public/guest-details?token=...
 */
router.get('/public/guest-details', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) throw new AppError('Token required', 400);

    const [hh] = await req.ctx.db
      .select()
      .from(households)
      .where(and(eq(households.guestToken, token), gte(households.guestTokenExpires, new Date())))
      .limit(1);

    if (!hh) throw new AppError('Invalid or expired guest token', 403);

    // Fetch essential details from tenant DB
    const { getTenantDb } = require('../db/index');
    const tenantDb = await getTenantDb(hh.id);
    const { dbGet } = require('../db');
    const { decryptData } = require('../middleware/encryption');

    const rawDetails = await dbGet(
      tenantDb,
      'SELECT broadband_provider, wifi_password, emergency_contacts, notes FROM house_details WHERE household_id = ?',
      [hh.id]
    );
    const details = rawDetails ? decryptData('house_details', rawDetails) : {};

    response.success(res, {
      name: hh.name,
      wifi: {
        ssid: details.broadband_provider || 'Hearthstone Network',
        password: details.wifi_password || 'Not set',
      },
      emergency_contacts: details.emergency_contacts,
      notes: details.notes,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/households/:id/share/invite
 * Item 281: Invite QR Code Generation
 */
router.get(
  '/:id/share/invite',
  authenticateToken,
  requireHouseholdRole('admin'),
  async (req, res, next) => {
    try {
      const hhId = parseInt(req.params.id);
      const token = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24h expiry

      await req.ctx.db.insert(invitations).values({
        householdId: hhId,
        email: 'qr-invite@hearthstone.local', // Placeholder for QR invites
        token,
        role: 'member',
        invitedBy: req.user.id,
        expiresAt,
      });

      const inviteUrl = `${req.protocol}://${req.get('host')}/register?invite=${token}`;
      const qrDataUrl = await QRCode.toDataURL(inviteUrl);

      response.success(res, { qrCode: qrDataUrl, inviteUrl });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/stats/activity
 * Item 265: Activity Heatmap
 */
router.get(
  '/:id/stats/activity',
  authenticateToken,
  requireHouseholdRole('admin'),
  async (req, res, next) => {
    try {
      const stats = await getActivityHeatmap(req.ctx.db, parseInt(req.params.id));
      response.success(res, stats);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households
 * Create a new household. Creator becomes admin.
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, currency, is_test } = req.body;
    if (!name) throw new AppError('Name required', 400);

    if (req.isDryRun) {
      return response.success(res, {
        message: 'Dry run successful',
        data: { name, currency, is_test },
      });
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
router.get(
  '/:id/backups',
  authenticateToken,
  requireHouseholdRole('admin'),
  async (req, res, next) => {
    try {
      const { listBackups } = require('../services/backup');
      const backups = await listBackups(req.params.id);
      response.success(res, backups);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/households/:id/backups (Create)
 */
router.post(
  '/:id/backups',
  authenticateToken,
  requireHouseholdRole('admin'),
  async (req, res, next) => {
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
  }
);

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
router.post(
  '/:id/select',
  authenticateToken,
  requireHouseholdRole('viewer'),
  async (req, res, next) => {
    try {
      const hhId = parseInt(req.params.id);
      await req.ctx.db
        .update(users)
        .set({ lastHouseholdId: hhId })
        .where(eq(users.id, req.user.id));
      response.success(res, { message: 'Household selected' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/households/:id/users
 */
router.get(
  '/:id/users',
  authenticateToken,
  requireHouseholdRole('viewer'),
  async (req, res, next) => {
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
  }
);

/**
 * POST /api/households/:id/users
 * Item 180: Advanced Invite System
 * Support adding existing users or creating new ones with temp passwords.
 */
router.post(
  '/:id/users',
  authenticateToken,
  requireHouseholdRole('admin'),
  async (req, res, next) => {
    try {
      const { email, role, first_name, last_name, password: manualPassword } = req.body;
      const householdId = parseInt(req.params.id);

      if (!email) throw new AppError('Email required', 400);

      let [targetUser] = await req.ctx.db
        .select()
        .from(users)
        .where(ilike(users.email, email))
        .limit(1);
      let generatedPassword = null;

      if (!targetUser) {
        // Create new user if not found
        const tempPass = manualPassword || crypto.randomBytes(6).toString('hex') + '!1A';
        const passwordHash = bcrypt.hashSync(tempPass, 8);
        generatedPassword = tempPass;

        await req.ctx.db.transaction(async (tx) => {
          const [newUser] = await tx
            .insert(users)
            .values({
              email,
              passwordHash,
              defaultHouseholdId: householdId,
              isActive: true,
            })
            .returning();

          await tx.insert(userProfiles).values({
            userId: newUser.id,
            firstName: first_name || 'Member',
            lastName: last_name || '',
          });

          targetUser = newUser;
        });
      }

      await req.ctx.db
        .insert(userHouseholds)
        .values({
          userId: targetUser.id,
          householdId: householdId,
          role: role || 'member',
        })
        .onConflictDoUpdate({
          target: [userHouseholds.userId, userHouseholds.householdId],
          set: { role: role || 'member', isActive: true },
        });

      response.success(res, {
        message: generatedPassword ? 'New user created and invited' : 'Existing user invited',
        generatedPassword,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
