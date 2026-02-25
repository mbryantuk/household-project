const logger = require('../utils/logger');
const { initWorker, addJob } = require('./queue');

/**
 * Notification Router (Item 113)
 * Unified service for Email, Push, and In-App notifications.
 */
class NotificationRouter {
  constructor() {
    this.socketServer = null;
  }

  setSocketServer(io) {
    this.socketServer = io;
  }

  /**
   * Send a notification to a specific user or household.
   * @param {Object} options
   * @param {number} options.householdId - Required for scoped push
   * @param {number} [options.userId] - Optional: specific user
   * @param {string} options.title - Notification title
   * @param {string} options.message - Notification body
   * @param {string} [options.type] - info, warning, success, error
   * @param {Array<string>} [options.channels] - ['email', 'push', 'in_app']
   * @param {Object} [options.metadata] - Extra data
   */
  async notify(options) {
    const {
      householdId,
      userId,
      title,
      message,
      type = 'info',
      channels = ['in_app'],
      metadata = {},
    } = options;

    if (!householdId) {
      logger.error('[NOTIFY] Missing householdId in notification request');
      return;
    }

    logger.info(
      `[NOTIFY] Routing notification: "${title}" to HH:${householdId} via [${channels.join(', ')}]`
    );

    // Item 163: Emit for SSE
    if (global.activityEmitter) {
      global.activityEmitter.emit('activity', { householdId, title, message, type, metadata });
    }

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'in_app':
          case 'push':
            await this.sendPush(householdId, userId, { title, message, type, metadata });
            break;

          case 'email':
            await this.sendEmail(householdId, userId, { title, message, metadata });
            break;

          default:
            logger.warn(`[NOTIFY] Unsupported channel: ${channel}`);
        }
      } catch (err) {
        logger.error(`[NOTIFY] Failed to send via ${channel}:`, err);
      }
    }
  }

  /**
   * Internal: Send real-time push via Socket.io
   */
  async sendPush(householdId, userId, payload) {
    if (!this.socketServer) {
      logger.warn('[NOTIFY] Socket server not initialized. Skipping push.');
      return;
    }

    const room = userId ? `user:${userId}` : `household:${householdId}`;
    this.socketServer.to(room).emit('notification', payload);
    logger.debug(`[NOTIFY] Emitted socket event to ${room}`);
  }

  /**
   * Internal: Queue email for background processing
   */
  async sendEmail(householdId, userId, payload) {
    // We use the background queue to handle email delivery (retries, rate limits)
    await addJob('SEND_EMAIL', {
      householdId,
      userId,
      subject: payload.title,
      text: payload.message,
      metadata: payload.metadata,
    });
  }
}

module.exports = new NotificationRouter();
