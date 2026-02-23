const { ApiResponseSchema } = require('@hearth/shared');

/**
 * Zod Validation Middleware
 * @param {import('zod').ZodSchema} schema
 * @param {string} source - 'body', 'query', 'params'
 */
const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data; // Replace with validated/parsed data
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(err);
    }
  };

module.exports = { validate };
