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
const { globalDb } = require('./db');
const { bootstrap } = require('./bootstrap');
require('./services/crypto'); 

// Routes
const authRoutes = require('./routes/auth');
const householdRoutes = require('./routes/households');
const memberRoutes = require('./routes/members');
const adminRoutes = require('./routes/admin');
const calendarRoutes = require('./routes/calendar');
const detailsRoutes = require('./routes/details');
const mealRoutes = require('./routes/meals');
const financeRoutes = require('./routes/finance');
const chargeRoutes = require('./routes/charges');

const { createBackup, cleanOldBackups } = require('./services/backup');

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());

// Rate Limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: process.env.NODE_ENV === 'test' ? 1000 : 20,
    message: "Too many login attempts, please try again later."
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// Logging
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
        console.log(`📡 [${req.method}] ${req.path}`);
    }
    next();
});

// Scalar API Reference
app.use('/api-docs', apiReference({ spec: { content: swaggerDocument } }));

// MOUNT API ROUTES
// Auth and Admin
app.use('/auth', authRoutes);      
app.use('/admin', adminRoutes);

// Shared Household routers
const householdRouters = [
    householdRoutes, memberRoutes, calendarRoutes, detailsRoutes,
    mealRoutes, financeRoutes, chargeRoutes
];

// Mount everything at root for direct paths (/households, etc)
householdRouters.forEach(router => {
    app.use('/', router);
});

// Also mount under /api for frontend consistency
const apiRouter = express.Router();
householdRouters.forEach(router => {
    apiRouter.use('/', router);
});
app.use('/api', apiRouter);

app.get('/system/status', (req, res) => {
    globalDb.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ needsSetup: row.count === 0 });
    });
});

// FRONTEND SERVING
const frontendPath = path.resolve(__dirname, '../web/dist');
if (fs.existsSync(frontendPath)) {
    // 1. Static files
    app.use('/assets', express.static(path.join(frontendPath, 'assets')));
    app.use(express.static(frontendPath, { index: false })); // don't serve index yet

    // 2. SPA Fallback - Only for non-API requests
    app.get('*', (req, res, next) => {
        const apiPaths = ['/auth', '/admin', '/api', '/system', '/households', '/api-docs'];
        if (apiPaths.some(p => req.path.startsWith(p))) {
            return res.status(404).json({ error: "Endpoint not found" });
        }
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

module.exports = app;