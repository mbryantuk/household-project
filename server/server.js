// Initialize OpenTelemetry Tracing before anything else
require('./tracing');

// Enforce UTC Timezone globally for the backend
process.env.TZ = 'UTC';

const { loadSecrets } = require('./config');
const { bootstrap } = require('./bootstrap');
const { startShoppingScheduler } = require('./services/shopping_scheduler');
const { addJob } = require('./services/queue');
const { initSocket } = require('./services/socket');
const { shutdownAnalytics } = require('./services/analytics');
const http = require('http');
const cron = require('node-cron');

async function startServer() {
  try {
    // 1. Load Secrets
    const config = await loadSecrets();

    // 2. Import App after config
    const app = require('./App');
    const { db } = require('./db/index');

    // 3. Create HTTP Server
    const server = http.createServer(app);

    // 4. Init Socket.io
    initSocket(server);

    // 5. Bootstrap and Start
    await bootstrap(db);

    if (process.env.NODE_ENV !== 'test') {
      server.listen(config.PORT, '0.0.0.0', () => {
        console.log(`🚀 Server LIVE on port ${config.PORT}`);
        startShoppingScheduler();

        // Item 99: Schedule Materialized View Refresh (Every 30 mins)
        cron.schedule('*/30 * * * *', () => {
          addJob('REFRESH_MATERIALIZED_VIEWS', { householdId: 0 }); // System scoped
        });
      });
    }

    process.on('SIGTERM', () => {
      shutdownAnalytics();
    });
  } catch (err) {
    console.error('Critical Failure: Server startup failed', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
