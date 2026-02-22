import pino from 'pino';

/**
 * HEARTHSTONE STRUCTURED LOGGER (TypeScript)
 * Standardizes logs for ingestion by observability tools (Item 10)
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard'
    }
  } : undefined,
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version
  }
});

export default logger;
