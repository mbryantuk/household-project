const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { apiReference } = require('@scalar/express-api-reference');
const swaggerDocument = require('./swagger.json');
const pkg = require('./package.json');

// Import unified database instance
const { SECRET_KEY } = require('./config');
const { globalDb } = require('./db');
console.log('System Initialized with Secret Key Length:', SECRET_KEY ? SECRET_KEY.length : 0);
require('./services/crypto');

// Rate Limiters
const { apiLimiter, authLimiter, sensitiveLimiter } = require('./middleware/rate_limiter');

// Routes
const authRoutes = require('./routes/auth');
const passkeyRoutes = require('./routes/auth_passkeys');
const householdRoutes = require('./routes/households');
const memberRoutes = require('./routes/members');
const adminRoutes = require('./routes/admin');
const calendarRoutes = require('./routes/calendar');
const detailsRoutes = require('./routes/details');
const mealRoutes = require('./routes/meals');
const financeRoutes = require('./routes/finance');
const financeProfileRoutes = require('./routes/finance_profiles');
const shoppingRoutes = require('./routes/shopping');
const shoppingScheduleRoutes = require('./routes/shopping_schedules');
const choresRoutes = require('./routes/chores');
const notificationRoutes = require('./routes/notifications');

const { createBackup, cleanOldBackups } = require('./services/backup');

const app = express();

// Set Trust Proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Robust CORS Configuration
app.use(
  cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-bypass-maintenance', 'x-api-version'],
    exposedHeaders: ['x-api-version'],
  })
);

app.use(express.json());

// --- RATE LIMITING ---
// In test environment, limiters can cause flakiness.
// We only apply them globally in production/dev.
if (process.env.NODE_ENV !== 'test') {
  app.use(['/auth', '/api/auth', '/passkeys', '/api/passkeys'], authLimiter);
  app.use(['/api/households/:id/backups', '/api/export'], sensitiveLimiter);
  app.use('/api', apiLimiter);
}
// --------------------

// Global Version Header
app.use((req, res, next) => {
  res.setHeader('x-api-version', pkg.version);
  next();
});

// Maintenance Mode Middleware
app.use((req, res, next) => {
  const lockFile = path.join(__dirname, 'data/upgrading.lock');
  const isAuthPath = req.path.includes('/auth/login') || req.path.includes('/auth/register');
  const bypassLock =
    process.env.BYPASS_MAINTENANCE === 'true' || req.headers['x-bypass-maintenance'] === 'true';

  if (fs.existsSync(lockFile) && isAuthPath && !bypassLock) {
    return res.status(503).json({
      error: 'System Upgrade in Progress',
      message:
        'We are currently performing a scheduled maintenance. Please try again in a few minutes.',
    });
  }
  next();
});

// Logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`📡 [${req.method}] ${req.path}`);
  }
  next();
});

// MOUNT API ROUTES
const allRouters = [
  { path: '/auth', router: authRoutes },
  { path: '/passkeys', router: passkeyRoutes },
  { path: '/admin', router: adminRoutes },
  { path: '/households/:id/finance/profiles', router: financeProfileRoutes },
  { path: '/households/:id/finance', router: financeRoutes },
  { path: '/households/:id/chores', router: choresRoutes },
  { path: '/', router: householdRoutes },
  { path: '/', router: memberRoutes },
  { path: '/', router: calendarRoutes },
  { path: '/', router: detailsRoutes },
  { path: '/', router: mealRoutes },
  { path: '/households/:id/shopping-list/schedules', router: shoppingScheduleRoutes },
  { path: '/', router: shoppingRoutes },
  { path: '/households/:id/notifications', router: notificationRoutes },
  { path: '/export', router: require('./routes/export') },
];

// 1. Mount at root
allRouters.forEach((r) => {
  app.use(r.path, r.router);
});

// 2. Mount under /api prefix
const apiRouter = express.Router({ mergeParams: true });
allRouters.forEach((r) => {
  apiRouter.use(r.path, r.router);
});
app.use('/api', apiRouter);

// Scalar API Reference
app.use('/api-docs', apiReference({ spec: { content: swaggerDocument } }));

app.get('/system/status', (req, res) => {
  globalDb.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ needsSetup: row.count === 0 });
  });
});

// FRONTEND SERVING
const frontendPath = path.resolve(__dirname, '../web/dist');
const testResultsPath = path.resolve(__dirname, '../web/test-results');

if (fs.existsSync(testResultsPath)) {
  app.use('/test-results', express.static(testResultsPath));
}

if (fs.existsSync(frontendPath)) {
  // 1. Static files
  app.use('/assets', express.static(path.join(frontendPath, 'assets')));
  app.use(express.static(frontendPath, { index: false }));

  // 2. SPA Fallback - Only for non-API requests
  app.get('*', (req, res, next) => {
    const apiPaths = ['/auth', '/admin', '/api', '/system', '/households', '/api-docs'];
    if (apiPaths.some((p) => req.path.startsWith(p))) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

module.exports = app;
