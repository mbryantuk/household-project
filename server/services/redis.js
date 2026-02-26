const IORedis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let redisClient;

if (process.env.NODE_ENV === 'test' && !process.env.REDIS_URL) {
  // Mock for tests if no Redis URL provided
  redisClient = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    on: () => {},
  };
} else {
  redisClient = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: true,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Error:', err.message);
  });

  redisClient.on('connect', () => {
    logger.info('✅ Connected to Redis');
  });
}

module.exports = redisClient;
