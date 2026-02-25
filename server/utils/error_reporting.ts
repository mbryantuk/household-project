import logger from './logger';

/**
 * Item 73: Error Monitoring Service
 * Standardizes crash reporting across the backend.
 */
class ErrorReportingService {
  /**
   * Report a non-fatal error
   */
  report(error: Error, context: any = {}) {
    logger.error({
      msg: '[REPORTER] Non-fatal error captured',
      error: error.message,
      stack: error.stack,
      ...context,
    });

    // Future: Sentry.captureException(error, { extra: context });
  }

  /**
   * Report a fatal crash and flush logs
   */
  async crash(error: Error, context: any = {}) {
    logger.fatal({
      msg: '[REPORTER] FATAL CRASH',
      error: error.message,
      stack: error.stack,
      ...context,
    });

    // Future: Sentry.captureException(error, { level: 'fatal', extra: context });
    // await Sentry.flush(2000);
  }
}

const reporter = new ErrorReportingService();
export default reporter;

// CJS compatibility
if (typeof module !== 'undefined') {
  module.exports = reporter;
  module.exports.default = reporter;
}
