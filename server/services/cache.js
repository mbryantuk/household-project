const IORedis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let redis;

function getClient() {
  if (!redis) {
    redis = new IORedis(config.REDIS_URL);
  }
  return redis;
}

/**
 * CACHE SERVICE
 * Item 248: Redis-backed Response Caching
 */

async function get(key) {
  try {
    const val = await getClient().get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    logger.error(`[CACHE] Get failed for ${key}:`, err.message);
    return null;
  }
}

async function set(key, value, ttlSeconds = 300) {
  try {
    await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.error(`[CACHE] Set failed for ${key}:`, err.message);
  }
}

async function invalidate(pattern) {
  try {
    const keys = await getClient().keys(pattern);
    if (keys.length > 0) {
      await getClient().del(...keys);
      logger.info(`[CACHE] Invalidated ${keys.length} keys matching ${pattern}`);
    }
  } catch (err) {
    logger.error(`[CACHE] Invalidate failed for ${pattern}:`, err.message);
  }
}

/**
 * Invalidate all cache for a specific user
 */
async function invalidateUserCache(userId) {
  await invalidate(`cache:user:${userId}:*`);
}

/**
 * Invalidate all cache for a specific household
 */
async function invalidateHouseholdCache(hhId) {
  await invalidate(`cache:household:${hhId}:*`);
}

/**
 * Middleware for caching GET requests
 */
function cacheMiddleware(ttl = 300) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    let keyPrefix = '';
    if (req.hhId) {
      keyPrefix = `cache:household:${req.hhId}`;
    } else if (req.user?.id) {
      keyPrefix = `cache:user:${req.user.id}`;
    } else {
      return next(); // Skip caching if neither is present
    }

    // Construct key based on Prefix and Original URL
    const key = `${keyPrefix}:${req.originalUrl}`;
    const cached = await get(key);

    if (cached) {
      logger.debug(`[CACHE] Hit: ${key}`);
      return res.json({ success: true, data: cached, _cached: true });
    }

    // Intercept send
    const originalSend = res.json;
    res.json = function (body) {
      if (res.statusCode === 200 && body && body.success) {
        set(key, body.data, ttl);
      }
      return originalSend.call(this, body);
    };

    next();
  };
}

module.exports = {
  get,
  set,
  invalidate,
  invalidateUserCache,
  invalidateHouseholdCache,
  cacheMiddleware,
};
