const IORedis = require('ioredis');
const config = require('../config');

// Shared redis connection for idempotency.
// Use enableOfflineQueue: false so it doesn't hang if redis is down.
let redisClient = null;
if (process.env.NODE_ENV !== 'test') {
  try {
    redisClient = new IORedis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redisClient.on('error', () => {
      /* ignore */
    });
  } catch (err) {}
}

const idempotency = async (req, res, next) => {
  // Only apply to state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(req.method) === -1) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  if (!redisClient || redisClient.status !== 'ready') {
    return next(); // Fail open if cache is down
  }

  const userIdentifier = req.user ? req.user.id : 'anon';
  const cacheKey = `idempotency:${userIdentifier}:${idempotencyKey}`;

  try {
    const cachedResponse = await redisClient.get(cacheKey);
    if (cachedResponse) {
      const parsed = JSON.parse(cachedResponse);
      return res.status(parsed.status).json(parsed.body);
    }
  } catch (err) {
    console.error('[Idempotency] Read Error:', err);
    return next();
  }

  // Intercept res.json
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      const responseToCache = {
        status: res.statusCode,
        body: body,
      };
      redisClient.set(cacheKey, JSON.stringify(responseToCache), 'EX', 86400).catch(() => {});
    }
    return originalJson(body);
  };

  next();
};

module.exports = idempotency;
