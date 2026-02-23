const { loadSecrets } = require('./config');
const { bootstrap } = require('./bootstrap');
const { startShoppingScheduler } = require('./services/shopping_scheduler');

async function startServer() {
  try {
    // 1. Load Secrets (from Infisical if configured)
    const config = await loadSecrets();

    // 2. Import App after config is loaded
    const app = require('./App');
    const { globalDb } = require('./db');

    // 3. Bootstrap and Start
    await bootstrap(globalDb);

    if (process.env.NODE_ENV !== 'test') {
      app.listen(config.PORT, '0.0.0.0', () => {
        console.log(`🚀 Server LIVE on port ${config.PORT}`);
        startShoppingScheduler();
      });
    }
  } catch (err) {
    console.error('Critical Failure: Server startup failed', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
