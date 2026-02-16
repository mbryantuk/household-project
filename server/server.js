const app = require('./App');
const { globalDb } = require('./db');
const { bootstrap } = require('./bootstrap');
const { startShoppingScheduler } = require('./services/shopping_scheduler');

const PORT = process.env.PORT || 4001;

bootstrap(globalDb).then(() => {
    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server LIVE on port ${PORT}`);
            startShoppingScheduler();
        });
    }
}).catch(err => {
    console.error("Critical Failure: Bootstrap failed", err);
    process.exit(1);
});

module.exports = { app };
