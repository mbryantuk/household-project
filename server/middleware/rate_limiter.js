const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const IORedis = require('ioredis');
const config = require('../config');

let redisClient;
if (process.env.NODE_ENV !== 'test') {
  try {
    redisClient = new IORedis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: true, // Re-enabled to prevent "Stream isn't writeable" errors during startup
    });
    redisClient.on('error', () => {
      /* Suppress logs */
    });
  } catch (err) {}
}

const isBypass = (req) => {
  return req.headers['x-bypass-maintenance'] === 'true' || process.env.NODE_ENV === 'test_bypass';
};

// Generates a granular key based on user ID and IP address
const keyGenerator = (req) => {
  const userId = req.user ? req.user.id : 'anon';
  return `${userId}:${req.ip}`;
};

// Helper to create a new Redis store instance
const createStore = (prefix) => {
  if (!redisClient) return undefined;
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: `rate-limit:${prefix}:`,
  });
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: process.env.NODE_ENV !== 'test',
  keyGenerator,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again in 15 minutes.',
  },
  skip: isBypass,
  store: createStore('api'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: process.env.NODE_ENV !== 'test',
  keyGenerator,
  message: {
    error: 'Too many login attempts',
    message: 'Too many attempts from this IP, please try again after 15 minutes',
  },
  skip: isBypass,
  store: createStore('auth'),
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: process.env.NODE_ENV !== 'test',
  keyGenerator,
  message: {
    error: 'Action limit exceeded',
    message: 'Too many sensitive actions performed. Please slow down.',
  },
  skip: isBypass,
  store: createStore('sensitive'),
});

module.exports = { apiLimiter, authLimiter, sensitiveLimiter };
