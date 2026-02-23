const { loadSecrets } = require('./config');
const { bootstrap } = require('./bootstrap');
const { startShoppingScheduler } = require('./services/shopping_scheduler');
const { initSocket } = require('./services/socket');
const http = require('http');

async function startServer() {
  try {
    // 1. Load Secrets
    const config = await loadSecrets();

    // 2. Import App after config
    const app = require('./App');
    const { globalDb } = require('./db');

    // 3. Create HTTP Server
    const server = http.createServer(app);

    // 4. Init Socket.io
    initSocket(server);

    // 5. Bootstrap and Start
    await bootstrap(globalDb);

    if (process.env.NODE_ENV !== 'test') {
      server.listen(config.PORT, '0.0.0.0', () => {
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
