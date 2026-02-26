// Initialize OpenTelemetry Tracing before anything else
require('./tracing');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { apiReference } = require('@scalar/express-api-reference');
const swaggerDocument = require('./swagger.json');
const pkg = require('./package.json');

// Core Configuration
const { ALLOWED_ORIGINS, SECRET_KEY } = require('./config');
require('./services/crypto');

// Middleware & Utilities
const { apiLimiter, authLimiter, sensitiveLimiter } = require('./middleware/rate_limiter');
const deepSanitize = require('./middleware/sanitize');
const idempotency = require('./middleware/idempotency');
const dryRun = require('./middleware/dryRun');
const context = require('./context');
const response = require('./utils/response');
const { register, httpRequestDurationMicroseconds } = require('./utils/metrics');
const compressionConfig = require('./middleware/compression');

// Routes
const authRoutes = require('./routes/auth');
const passkeyRoutes = require('./routes/auth_passkeys');
const apiKeyRoutes = require('./routes/api_keys');
const householdRoutes = require('./routes/households');
const publicCalendarFeed = require('./routes/calendar_feed');
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
const webhookRoutes = require('./routes/webhooks');
const webhookConfigRoutes = require('./routes/webhook_configs');
const systemRoutes = require('./routes/system');
const assetsVehiclesRoutes = require('./routes/assets_vehicles');
const utilityRoutes = require('./routes/utilities');
const transactionRoutes = require('./routes/transactions');
const commentRoutes = require('./routes/comments');

const app = express();

app.set('trust proxy', 1);

// 🛡️ 1. BASE SECURITY & OPTIMIZATION (No CORS yet)
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
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*'],
        connectSrc: ["'self'", 'https://*'],
        frameSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compressionConfig);
app.use(cookieParser());

// 📂 2. FRONTEND STATIC ASSETS (Served BEFORE API logic/CORS)
const frontendPath = path.resolve(__dirname, '../web/dist');
if (fs.existsSync(frontendPath)) {
  // Serve hashed assets with aggressive caching
  app.use(
    '/assets',
    express.static(path.join(frontendPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: false,
    })
  );

  // Serve root static files (favicon, manifest, etc)
  app.use(express.static(frontendPath, { index: false }));
}

// 🔐 3. API GLOBAL MIDDLEWARE
const allowedOrigins = ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Allow same-origin (no origin header)
      if (!origin) return callback(null, true);

      // 2. Allow whitelisted origins
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes('*') ||
        process.env.NODE_ENV === 'test'
      ) {
        return callback(null, true);
      }

      // 3. Same-site fallback
      try {
        const url = new URL(origin);
        if (url.hostname === 'hearthstone.mbryantuk.uk') return callback(null, true);
      } catch (e) {}

      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-version',
      'x-household-id',
      'x-dry-run',
      'idempotency-key',
    ],
    credentials: true,
    exposedHeaders: ['x-api-version'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(context.inject());
app.use(deepSanitize);
app.use(idempotency);
app.use(dryRun);

// Metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  next();
});

// 🚀 4. MOUNT API ROUTES
const apiRouters = [
  { path: '/auth', router: authRoutes },
  { path: '/auth/api-keys', router: apiKeyRoutes },
  { path: '/passkeys', router: passkeyRoutes },
  { path: '/admin', router: adminRoutes },
  { path: '/households/:hhId/finance/profiles', router: financeProfileRoutes },
  { path: '/households/:hhId/finance', router: financeRoutes },
  { path: '/households/:hhId/chores', router: choresRoutes },
  { path: '/households/:hhId/members', router: memberRoutes },
  { path: '/households/:hhId/calendar', router: calendarRoutes },
  { path: '/households/:hhId/details', router: detailsRoutes },
  { path: '/households/:hhId/meals', router: mealRoutes },
  { path: '/households/:hhId/shopping-list', router: shoppingRoutes },
  { path: '/households/:hhId/notifications', router: notificationRoutes },
  { path: '/households/:hhId/utilities', router: utilityRoutes },
  { path: '/households/:hhId/transactions', router: transactionRoutes },
  { path: '/households/:hhId/webhooks', router: webhookConfigRoutes },
  { path: '/households/:hhId/comments', router: commentRoutes },
  { path: '/households/:hhId', router: assetsVehiclesRoutes },
  { path: '/households', router: householdRoutes },
  { path: '/webhooks', router: webhookRoutes },
  { path: '/system', router: systemRoutes },
  { path: '/export', router: require('./routes/export') },
];

apiRouters.forEach((r) => {
  app.use(`/api${r.path}`, r.router);
});

// Public / Unauthenticated routes
app.use('/api/public/calendar', publicCalendarFeed);

app.get('/api/system/status', async (req, res) => {
  const { users: userTable } = require('./db/schema');
  const { count } = require('drizzle-orm');
  const [row] = await req.ctx.db.select({ val: count() }).from(userTable);
  res.json({ success: true, data: { needsSetup: Number(row.val) === 0 } });
});

app.get('/api/system/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// 🏠 5. SPA CATCH-ALL
if (fs.existsSync(frontendPath)) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 🏮 6. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  const logger = req.ctx?.logger || console;
  if (err.message !== 'Not allowed by CORS') {
    logger.error({ msg: '🔥 Unhandled Error', err: err.message, path: req.path, stack: err.stack });
  }
  if (res.headersSent) return next(err);
  response.error(res, err);
});

module.exports = app;
