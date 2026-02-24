const xss = require('xss');

/**
 * Deep Sanitization Middleware (Item 125)
 * Recursively traverses req.body, req.query, and req.params and strips malicious HTML/JS.
 * We run this *before* Zod validation so the rest of the application never touches dirty strings.
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return xss(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v));
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj = {};
    for (const [key, val] of Object.entries(value)) {
      sanitizedObj[key] = sanitizeValue(val);
    }
    return sanitizedObj;
  }
  return value;
}

const deepSanitize = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

module.exports = deepSanitize;
