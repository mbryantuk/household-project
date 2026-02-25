import pino from 'pino';

/**
 * HEARTHSTONE STRUCTURED LOGGER (TypeScript)
 * Standardizes logs for ingestion by observability tools (Item 10)
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Transport is omitted to avoid dependency on pino-pretty (Item 10 debloat).
  // For local development with pretty logs, pipe the output to pino-pretty CLI:
  // node server.js | npx pino-pretty
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },
});

export default logger;

// CJS compatibility
if (typeof module !== 'undefined') {
  module.exports = logger;
  module.exports.default = logger;
}
