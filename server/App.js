const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { apiReference } = require('@scalar/express-api-reference');
const swaggerDocument = require('./swagger.json');

// Import unified database instance
const { SECRET_KEY } = require('./config');
console.log("System Initialized with Secret Key Length:", SECRET_KEY ? SECRET_KEY.length : 0);
require('./services/crypto'); 

// Routes
const authRoutes = require('./routes/auth');
const webauthnRoutes = require('./routes/webauthn');
const householdRoutes = require('./routes/households');
const memberRoutes = require('./routes/members');
const adminRoutes = require('./routes/admin');
const calendarRoutes = require('./routes/calendar');
const detailsRoutes = require('./routes/details');
const mealRoutes = require('./routes/meals');
const financeRoutes = require('./routes/finance');
const financeProfileRoutes = require('./routes/finance_profiles');

const { createBackup, cleanOldBackups } = require('./services/backup');

const app = express();

// Security Middleware
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());

// Maintenance Mode Middleware
app.use((req, res, next) => {
    const lockFile = path.join(__dirname, 'data/upgrading.lock');
    const isAuthPath = req.path.includes('/auth/login') || req.path.includes('/auth/register');
    const bypassLock = process.env.BYPASS_MAINTENANCE === 'true' || req.headers['x-bypass-maintenance'] === 'true';
    
    if (fs.existsSync(lockFile) && isAuthPath && !bypassLock) {
        return res.status(503).json({ 
            error: "System Upgrade in Progress", 
            message: "We are currently performing a scheduled maintenance. Please try again in a few minutes." 
        });
    }
    next();
});

// Rate Limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000, // Increased for stability during rapid test cycles
    message: "Too many login attempts, please try again later."
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Logging
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
        res.on('finish', () => {
            const status = res.statusCode;
            const emoji = status >= 500 ? '❌' : (status >= 400 ? '⚠️' : '✅');
            console.log(`${emoji} [${res.statusCode}] ${req.method} ${req.path}`);
        });
    }
    next();
});

// MOUNT API ROUTES
// We mount everything at both root and /api for maximum compatibility with various proxy setups
const allRouters = [
    { path: '/auth/webauthn', router: webauthnRoutes },
    { path: '/auth', router: authRoutes },
    { path: '/admin', router: adminRoutes },
    { path: '/households/:id/finance/profiles', router: financeProfileRoutes },
    { path: '/households/:id/finance', router: financeRoutes },
    { path: '/', router: householdRoutes },
    { path: '/', router: memberRoutes },
    { path: '/', router: calendarRoutes },
    { path: '/', router: detailsRoutes },
    { path: '/', router: mealRoutes }
];

// 1. Mount at root
allRouters.forEach(r => {
    app.use(r.path, r.router);
});

// 2. Mount under /api prefix
const apiRouter = express.Router({ mergeParams: true });
allRouters.forEach(r => {
    apiRouter.use(r.path, r.router);
});
app.use('/api', apiRouter);

// Scalar API Reference
app.use('/api-docs', apiReference({ spec: { content: swaggerDocument } }));

app.get('/system/status', (req, res) => {
    globalDb.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
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
        if (apiPaths.some(p => req.path.startsWith(p))) {
            return res.status(404).json({ error: "Endpoint not found" });
        }
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`❌ [ERROR] ${req.method} ${req.path}:`, err);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
        path: req.path
    });
});

module.exports = app;