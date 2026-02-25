const express = require('express');
const router = express.Router();
const { addJob } = require('../services/queue');
const logger = require('../utils/logger');
const response = require('../utils/response');

/**
 * POST /api/webhooks/:provider
 * Item 110: Asynchronous Webhooks
 * Receives external events and pushes them to the queue immediately.
 */
router.post('/:provider', async (req, res) => {
  const { provider } = req.params;
  const payload = req.body;
  const householdId = req.headers['x-household-id'] || payload.household_id;

  logger.info(`[WEBHOOK] Received event from ${provider} for HH:${householdId}`);

  try {
    // 1. Immediate validation (Basic)
    if (!householdId) {
      return response.error(res, 'Missing householdId in payload or headers', null, 400);
    }

    // 2. Queue for background processing
    await addJob('WEBHOOK_PROCESS', {
      provider,
      payload,
      householdId: parseInt(householdId),
      receivedAt: new Date().toISOString(),
    });

    // 3. Return 202 Accepted (Item 110)
    return response.success(res, { message: 'Webhook accepted for processing' }, null, 202);
  } catch (err) {
    logger.error(`[WEBHOOK] Failed to queue event from ${provider}:`, err.message);
    return response.error(res, 'Internal processing error');
  }
});

module.exports = router;
