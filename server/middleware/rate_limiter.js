const rateLimit = require('express-rate-limit');

/**
 * Helper to check for bypass header
 */
const isBypass = (req) => {
  return req.headers['x-bypass-maintenance'] === 'true' || process.env.NODE_ENV === 'test_bypass';
};

/**
 * Standard API Limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: process.env.NODE_ENV !== 'test', // Disable validations in test
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again in 15 minutes.',
  },
  skip: isBypass,
});

/**
 * Strict Auth Limiter
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: process.env.NODE_ENV !== 'test', // Disable validations in test
  message: {
    error: 'Too many login attempts',
    message: 'Too many attempts from this IP, please try again after 15 minutes',
  },
  skip: isBypass,
});

/**
 * Sensitive Action Limiter
 */
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: process.env.NODE_ENV !== 'test', // Disable validations in test
  message: {
    error: 'Action limit exceeded',
    message: 'Too many sensitive actions performed. Please slow down.',
  },
  skip: isBypass,
});

module.exports = { apiLimiter, authLimiter, sensitiveLimiter };
