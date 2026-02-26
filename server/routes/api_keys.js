const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { apiKeys } = require('../db/schema');
const { eq, and } = require('drizzle-orm');
const { authenticateToken } = require('../middleware/auth');
const response = require('../utils/response');

router.use(authenticateToken);

/**
 * GET /api/auth/api-keys
 */
router.get('/', async (req, res, next) => {
  try {
    const results = await req.ctx.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.keyPrefix,
        lastUsed: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
        isActive: apiKeys.isActive,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, req.user.id));
    response.success(res, results);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/api-keys
 */
router.post('/', async (req, res, next) => {
  const { name, householdId, expiresAt } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    const rawKey = `hs_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 11); // hs_ + 8 chars
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const [newKey] = await req.ctx.db
      .insert(apiKeys)
      .values({
        userId: req.user.id,
        householdId: householdId || null,
        name,
        keyHash,
        keyPrefix,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    response.success(
      res,
      {
        message: 'API Key generated. Copy it now, it will not be shown again.',
        apiKey: rawKey,
        id: newKey.id,
      },
      null,
      201
    );
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/api-keys/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await req.ctx.db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, parseInt(req.params.id)), eq(apiKeys.userId, req.user.id)));
    response.success(res, { message: 'API Key revoked' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
