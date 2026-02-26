const axios = require('axios');
const crypto = require('crypto');
const { dbAll, getHouseholdDb } = require('../db');
const logger = require('../utils/logger');
const { addJob } = require('./queue');

/**
 * WEBHOOK DISPATCHER SERVICE
 * Item 238: External service triggers
 */

async function dispatchWebhook(householdId, eventName, payload) {
  const db = getHouseholdDb(householdId);

  try {
    const webhooks = await dbAll(
      db,
      'SELECT * FROM webhooks WHERE household_id = ? AND is_active = 1 AND deleted_at IS NULL',
      [householdId]
    );

    for (const hook of webhooks) {
      const subscribedEvents = JSON.parse(hook.events || '[]');
      if (subscribedEvents.includes(eventName) || subscribedEvents.includes('*')) {
        // Use BullMQ for actual delivery to handle retries and timeouts
        await addJob('WEBHOOK_DELIVERY', {
          url: hook.url,
          secret: hook.secret,
          eventName,
          payload,
          householdId,
        });
      }
    }
  } catch (err) {
    logger.error(`[WEBHOOK-DISPATCH] Failed for HH:${householdId}, Event:${eventName}:`, err);
  }
}

async function deliverWebhook(url, secret, eventName, payload) {
  const timestamp = Date.now();
  const body = JSON.stringify({
    event: eventName,
    timestamp,
    data: payload,
  });

  const headers = {
    'Content-Type': 'application/json',
    'X-Hearthstone-Event': eventName,
    'X-Hearthstone-Timestamp': timestamp,
  };

  if (secret) {
    headers['X-Hearthstone-Signature'] = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
  }

  try {
    await axios.post(url, body, { headers, timeout: 5000 });
    logger.info(`[WEBHOOK-DELIVERY] Success: ${eventName} -> ${url}`);
  } catch (err) {
    logger.error(`[WEBHOOK-DELIVERY] Failed: ${eventName} -> ${url} | ${err.message}`);
    throw err; // Re-throw for BullMQ retry
  }
}

module.exports = { dispatchWebhook, deliverWebhook };
