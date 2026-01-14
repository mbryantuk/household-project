const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const apiReference = require('@scalar/express-api-reference');
const swaggerDocument = require('./swagger.json');

// Import unified database instance
const { globalDb } = require('./db');
const { bootstrap } = require('./bootstrap');

// Routes
const authRoutes = require('./routes/auth');
const householdRoutes = require('./routes/households');
const memberRoutes = require('./routes/members');
const adminRoutes = require('./routes/admin');
const calendarRoutes = require('./routes/calendar');
const detailsRoutes = require('./routes/details');
const mealRoutes = require('./routes/meals');

const { createBackup, cleanOldBackups } = require('./services/backup');

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

// Log every incoming request
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
        console.log(`📡 [${req.method}] ${req.path}`);
    }
    next();
});

// Scalar API Reference
app.use(
  '/api-docs',
  apiReference({
    spec: {
      content: swaggerDocument,
    },
  }),
);

// 4. MOUNT API ROUTES
app.use('/auth', authRoutes);      
app.use('/admin', adminRoutes);
app.use('/', householdRoutes); 
app.use('/', memberRoutes);    
app.use('/', calendarRoutes);
app.use('/', detailsRoutes);
app.use('/', mealRoutes);

app.get('/system/status', (req, res) => {
    globalDb.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ needsSetup: row.count === 0 });
    });
});

// 5. FRONTEND SERVING
const frontendPath = path.resolve(__dirname, '../web/dist');

if (fs.existsSync(frontendPath)) {
    app.use('/assets', express.static(path.join(frontendPath, 'assets')));
    app.use(express.static(frontendPath));

    app.use((req, res, next) => {
        const apiPaths = ['/auth', '/households', '/members', '/admin', '/system', '/my-households', '/users', '/create-user'];
        const isApi = apiPaths.some(p => req.path.startsWith(p));

        if (isApi) {
            return res.status(404).json({ error: "Endpoint not found" });
        }

        if (req.method === 'GET') {
            return res.sendFile(path.join(frontendPath, 'index.html'));
        }
        next();
    });
}

// Scheduled Tasks
if (process.env.NODE_ENV !== 'test') {
    cron.schedule('0 0 * * *', async () => {
        try {
            await createBackup();
            globalDb.all("SELECT id FROM households WHERE auto_backup = 1", [], async (err, rows) => {
                if (err) return;
                for (const hh of rows) {
                    await createBackup(hh.id);
                }
            });
            cleanOldBackups(30);
        } catch (err) {
            console.error('Cron failure:', err);
        }
    });
}

// Initialize Superuser and Start Server
let server;
const bootstrapPromise = bootstrap(globalDb).then(() => {
    if (process.env.NODE_ENV !== 'test') {
        server = app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server LIVE on ${PORT}`));
    }
}).catch(err => {
    console.error("Critical Failure: Bootstrap failed", err);
});

module.exports = { app, globalDb, server, bootstrapPromise };