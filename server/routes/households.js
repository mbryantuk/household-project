const express = require('express');
const router = express.Router();
const { db } = require('../db/index');
const { households, userHouseholds, users } = require('../db/schema');
const { eq, and, ilike } = require('drizzle-orm');
const {
  authenticateToken,
  requireHouseholdRole,
  requireSystemRole,
} = require('../middleware/auth');
const { auditLog } = require('../services/audit');

/**
 * POST /api/households
 * Create a new household. Creator becomes admin.
 */
router.post('/', authenticateToken, async (req, res) => {
  const { name, currency, is_test } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    const result = await db.transaction(async (tx) => {
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

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/households/:id
 */
router.get('/:id', authenticateToken, requireHouseholdRole('viewer'), async (req, res) => {
  try {
    const [hh] = await db
      .select()
      .from(households)
      .where(eq(households.id, parseInt(req.params.id)))
      .limit(1);
    if (!hh) return res.status(404).json({ error: 'Household not found' });
    res.json(hh);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/households/:id
 */
router.put('/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  const { name, currency } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (currency !== undefined) updates.currency = currency;

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'Nothing to update' });

  try {
    const hhId = parseInt(req.params.id);
    await db.update(households).set(updates).where(eq(households.id, hhId));
    res.json({ message: 'Household updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/households/:id/backups (List)
 */
router.get('/:id/backups', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  try {
    const { listBackups } = require('../services/backup');
    const backups = await listBackups(req.params.id);
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/households/:id/backups (Create)
 */
router.post('/:id/backups', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  try {
    const { createBackup } = require('../services/backup');
    const filename = await createBackup(req.params.id, {
      source: 'User Triggered',
      created_by: req.user.id,
      exported_at: new Date().toISOString(),
    });
    res.json({ message: 'Backup created', filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/households/:id
 */
router.delete('/:id', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  const householdId = parseInt(req.params.id);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(userHouseholds).where(eq(userHouseholds.householdId, householdId));
      await tx.delete(households).where(eq(households.id, householdId));
    });
    res.json({ message: 'Household deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/households/:id/select
 */
router.post('/:id/select', authenticateToken, requireHouseholdRole('viewer'), async (req, res) => {
  try {
    const hhId = parseInt(req.params.id);
    await db.update(users).set({ lastHouseholdId: hhId }).where(eq(users.id, req.user.id));
    res.json({ message: 'Household selected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/households/:id/details (Global Metadata)
 */
router.get('/:id/details', authenticateToken, requireHouseholdRole('viewer'), async (req, res) => {
  try {
    const [hh] = await db
      .select()
      .from(households)
      .where(eq(households.id, parseInt(req.params.id)))
      .limit(1);
    res.json(hh);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/households/:id/details (Global Metadata)
 */
router.put('/:id/details', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  const updates = { ...req.body };

  // Strip non-global fields that might have leaked from old tenant schema
  const allowed = [
    'name',
    'addressStreet',
    'addressCity',
    'addressZip',
    'avatar',
    'dateFormat',
    'currency',
    'decimals',
    'enabledModules',
    'autoBackup',
    'backupRetention',
    'debugMode',
    'nightlyVersionFilter',
  ];

  const filtered = {};
  allowed.forEach((k) => {
    if (updates[k] !== undefined) filtered[k] = updates[k];
  });

  try {
    const hhId = parseInt(req.params.id);
    if (Object.keys(filtered).length > 0) {
      await db.update(households).set(filtered).where(eq(households.id, hhId));
    }

    await auditLog(
      hhId,
      req.user.id,
      'HOUSE_DETAILS_UPDATE',
      'households',
      null,
      {
        updates: Object.keys(filtered),
      },
      req
    );

    res.json({ message: 'Household details updated' });
  } catch (err) {
    console.error('[HOUSEHOLDS] Update Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/households/:id/users
 */
router.post('/:id/users', authenticateToken, requireHouseholdRole('admin'), async (req, res) => {
  const { email, role } = req.body;
  const householdId = parseInt(req.params.id);

  try {
    const [user] = await db.select().from(users).where(ilike(users.email, email)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db
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

    res.json({ message: 'User added/updated in household' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
