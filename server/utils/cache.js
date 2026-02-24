const IORedis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

let redisClient = null;

// Only connect if not in test to avoid Jest hanging or needing mock redis
if (process.env.NODE_ENV !== 'test') {
  try {
    redisClient = new IORedis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    redisClient.on('error', (err) => {
      // Suppress verbose connection logs to avoid spam if Redis is down
    });
  } catch (err) {
    // Ignore initialization errors
  }
}

/**
 * Standardized Caching Layer (Item 111)
 * Provides a unified interface for caching DB responses or external API calls.
 */

const getCache = async (key) => {
  if (!redisClient || redisClient.status !== 'ready') return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    if (logger && logger.error) logger.error('Cache read error', err);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = 3600) => {
  if (!redisClient || redisClient.status !== 'ready') return;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    if (logger && logger.error) logger.error('Cache write error', err);
  }
};

const invalidateCacheByPrefix = async (prefix) => {
  if (!redisClient || redisClient.status !== 'ready') return;
  try {
    // Redis scan to support invalidation of dynamic tags/prefixes
    const stream = redisClient.scanStream({ match: `${prefix}*`, count: 100 });
    const keys = [];

    for await (const resultKeys of stream) {
      keys.push(...resultKeys);
    }

    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    if (logger && logger.error) logger.error('Cache invalidation error', err);
  }
};

module.exports = { getCache, setCache, invalidateCacheByPrefix };
