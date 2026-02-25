const client = require('prom-client');

/**
 * Item 150: Symptom-Based Alerting (Prometheus)
 * Centralized telemetry for system performance.
 */
const register = new client.Registry();

// 1. Default Metrics (CPU, Memory, Event Loop)
client.collectDefaultMetrics({ register });

// 2. Custom Metrics (API Latency)
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});
register.registerMetric(httpRequestDurationMicroseconds);

// 3. Custom Metrics (Database Load)
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});
register.registerMetric(dbQueryDuration);

module.exports = {
  register,
  httpRequestDurationMicroseconds,
  dbQueryDuration,
};
