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
const { startHeartbeatMonitor } = require('./services/health_monitor');
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
    await initSocket(server);

    // 5. Bootstrap and Start
    await bootstrap(db);
    startHeartbeatMonitor();

    if (process.env.NODE_ENV !== 'test') {
      server.listen(config.PORT, '0.0.0.0', () => {
        console.log(`🚀 Server LIVE on port ${config.PORT}`);
        startShoppingScheduler();

        // Item 99: Schedule Materialized View Refresh (Every 30 mins)
        cron.schedule('*/30 * * * *', () => {
          addJob('REFRESH_MATERIALIZED_VIEWS', { householdId: 0 }); // System scoped
        });

        // Item 221: Nightly Finance Checks (2 AM)
        cron.schedule('0 2 * * *', async () => {
          const { households: hhTable } = require('./db/schema');
          const { sql } = require('drizzle-orm');
          const allHh = await db
            .select({ id: hhTable.id })
            .from(hhTable)
            .where(sql`deleted_at IS NULL`);
          for (const hh of allHh) {
            addJob('FINANCE_OVERDRAFT_CHECK', { householdId: hh.id });
            addJob('SMART_REMINDERS', { householdId: hh.id });
            addJob('MAINTENANCE_AUTO', { householdId: hh.id });

            // Item 225: Nightly S3 Backup
            if (process.env.STORAGE_DRIVER === 's3') {
              addJob('S3_BACKUP', { householdId: hh.id });
            }
          }
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
