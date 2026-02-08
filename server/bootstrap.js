const { initialize } = require('./db');

async function bootstrap(db) {
    await initialize();
    // No longer creating default superuser
}

module.exports = { bootstrap };