const { pool } = require('../db/index');
const { globalDb } = require('../db');
const { closeAll: closeQueue } = require('../services/queue');
const { closeSocket } = require('../services/socket');
const { stopHeartbeatMonitor } = require('../services/health_monitor');
const { shutdownAnalytics } = require('../services/analytics');
const { stopShoppingScheduler } = require('../services/shopping_scheduler');
const redisClient = require('../services/redis');

afterAll(async () => {
  // 0. Stop background services
  stopHeartbeatMonitor();
  shutdownAnalytics();
  stopShoppingScheduler();

  // 1. Close Postgres pool
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing Postgres pool:', err);
    }
  }

  // 2. Close legacy SQLite global DB
  if (globalDb) {
    try {
      await new Promise((resolve, reject) => {
        globalDb.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      console.error('Error closing legacy global SQLite DB:', err);
    }
  }

  // 3. Close BullMQ / Redis connections
  try {
    await closeQueue();
  } catch (err) {
    console.error('Error closing queue connections:', err);
  }

  // 4. Close Socket.io connections
  try {
    await closeSocket();
  } catch (err) {
    console.error('Error closing socket connections:', err);
  }

  // 5. Close general Redis client
  if (redisClient && typeof redisClient.quit === 'function') {
    try {
      await redisClient.quit();
    } catch (err) {
      // Ignore if already closed
    }
  }
});
