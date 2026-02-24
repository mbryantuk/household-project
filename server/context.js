const { db } = require('./db/index');
const logger = require('./utils/logger').default;
const notificationRouter = require('./services/notification_router');
const featureFlagService = require('./services/featureFlags');
const queue = require('./services/queue');

/**
 * Dependency Injection Context (Item 105)
 * Centralized container for all singleton services.
 */
class AppContext {
  constructor() {
    this.db = db;
    this.logger = logger;
    this.notifications = notificationRouter;
    this.featureFlags = featureFlagService;
    this.queue = queue;
  }

  /**
   * Middleware to inject context into the request object.
   */
  inject() {
    return (req, res, next) => {
      req.ctx = this;
      next();
    };
  }
}

module.exports = new AppContext();
