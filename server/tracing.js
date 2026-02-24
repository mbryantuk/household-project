// Item 148: Distributed Tracing (OpenTelemetry)
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Configuration for OpenTelemetry export
// Defaults to a localhost OTLP receiver (like Jaeger or Datadog agent)
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Too noisy
      },
    }),
  ],
  serviceName: 'hearthstone-api',
});

// Start the SDK but only if tracing is enabled via environment to avoid breaking tests/local dev
if (process.env.ENABLE_TRACING === 'true') {
  sdk
    .start()
    .then(() => console.log('🔭 OpenTelemetry Tracing initialized'))
    .catch((error) => console.log('Error initializing tracing', error));

  // Gracefully shut down the SDK on process exit
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}
