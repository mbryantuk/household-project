const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const { apiReference } = require('@scalar/express-api-reference');
const swaggerDocument = require('./swagger.json');
const pkg = require('./package.json');

// Import unified database instance
const { SECRET_KEY } = require('./config');
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

const app = express();

// Set Trust Proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*'],
        connectSrc: ["'self'", 'https://*'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Compression Middleware
const compressionConfig = require('./middleware/compression');
app.use(compressionConfig);

// Robust CORS Configuration
const { ALLOWED_ORIGINS } = require('./config');
const allowedOrigins = ALLOWED_ORIGINS.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      // In test mode, allow everything
      if (process.env.NODE_ENV === 'test') return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-bypass-maintenance',
      'x-api-version',
      'x-household-id',
    ],
    exposedHeaders: ['x-api-version'],
  })
);

// Payload Limits (10MB for JSON and URL-encoded to prevent DOS)
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/plain', limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Deep Sanitization (Item 125)
const deepSanitize = require('./middleware/sanitize');
app.use(deepSanitize);

// Idempotency & Dry-Run
const idempotency = require('./middleware/idempotency');
const dryRun = require('./middleware/dryRun');
const context = require('./context');

app.use(context.inject());
app.use(idempotency);
app.use(dryRun);

// --- RATE LIMITING ---
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
  { path: '/households/:id/members', router: memberRoutes },
  { path: '/households/:id/calendar', router: calendarRoutes },
  { path: '/households/:id/dates', router: calendarRoutes }, // Parity with Swagger/Tests
  { path: '/households/:id', router: detailsRoutes },
  { path: '/households/:id/meals', router: mealRoutes },
  { path: '/households/:id/shopping-list/schedules', router: shoppingScheduleRoutes },
  { path: '/households/:id/shopping-list', router: shoppingRoutes },
  { path: '/households/:id/notifications', router: notificationRoutes },
  { path: '/households', router: householdRoutes },
  { path: '/export', router: require('./routes/export') },
];

// System Routes
const systemRouter = express.Router();
systemRouter.get('/status', async (req, res) => {
  try {
    const { db } = require('./db/index');
    const { users } = require('./db/schema');
    const { count } = require('drizzle-orm');
    const [row] = await db.select({ val: count() }).from(users);
    res.json({ needsSetup: Number(row.val) === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

systemRouter.get('/holidays', async (req, res) => {
  try {
    const { getBankHolidays } = require('./services/bankHolidays');
    const holidays = await getBankHolidays();
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

systemRouter.post('/vitals', (req, res) => {
  // Item 159: Core Web Vitals Tracking receiver
  if (process.env.NODE_ENV !== 'test') {
    const body = req.body;
    try {
      // In a real production scenario, this might push to Datadog, PostHog, or a DB.
      // We parse the JSON text received from sendBeacon
      const vitalData = typeof body === 'string' ? JSON.parse(body) : body;
      if (vitalData && vitalData.name) {
        console.log(`[VITALS] ${vitalData.name}: ${vitalData.value} (Rating: ${vitalData.rating})`);
      }
    } catch (err) {
      // Silent catch
    }
  }
  res.status(204).end();
});

// 1. Mount at root
allRouters.forEach((r) => {
  app.use(r.path, r.router);
});
app.use('/system', systemRouter);

// 2. Mount under /api prefix
const apiRouter = express.Router({ mergeParams: true });
allRouters.forEach((r) => {
  apiRouter.use(r.path, r.router);
});
apiRouter.use('/system', systemRouter);
app.use('/api', apiRouter);

// Scalar API Reference
app.use('/api-docs', apiReference({ spec: { content: swaggerDocument } }));

// FRONTEND SERVING
const frontendPath = path.resolve(__dirname, '../web/dist');
const testResultsPath = path.resolve(__dirname, '../web/test-results');

if (fs.existsSync(testResultsPath)) {
  app.use('/test-results', express.static(testResultsPath));
}

if (fs.existsSync(frontendPath)) {
  // 1. Static files with aggressive edge caching for Vite-hashed assets
  app.use(
    '/assets',
    express.static(path.join(frontendPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    })
  );

  app.use(
    express.static(frontendPath, {
      index: false,
      setHeaders: (res, pathStr) => {
        if (pathStr.endsWith('.html')) {
          // Never cache the HTML entry point to ensure users get the latest asset hashes
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    })
  );

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
