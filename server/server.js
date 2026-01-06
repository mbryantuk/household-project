const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const householdRoutes = require('./routes/households');
const memberRoutes = require('./routes/members');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');

const app = express();
const PORT = 4001;

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }
const DB_PATH = path.join(dataDir, 'totem.db');

const globalDb = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("Database error:", err.message);
    else console.log("✅ Connected to SQLite");
});

app.use(cors());
app.use(bodyParser.json());

// Log every incoming request
app.use((req, res, next) => {
    console.log(`📡 [${req.method}] ${req.path}`);
    next();
});

// 4. MOUNT API ROUTES (FLAT)
app.use('/auth', authRoutes);      
app.use('/', householdRoutes); 
app.use('/', memberRoutes);    
app.use('/', adminRoutes);
app.use('/', userRoutes);

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

    // C. 🛡️ API SHIELD (Must be last)
    app.use((req, res, next) => {
        // List of actual top-level API paths
        const apiPaths = ['/auth', '/households', '/members', '/admin', '/users', '/system', '/my-households'];
        const isApi = apiPaths.some(p => req.path.startsWith(p));

        if (isApi) {
            console.error(`❌ API 404: ${req.method} ${req.path}`);
            return res.status(404).json({ error: "Endpoint not found" });
        }

        if (req.method === 'GET') {
            return res.sendFile(path.join(frontendPath, 'index.html'));
        }
        next();
    });
}

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server LIVE on ${PORT}`));

module.exports = { app, globalDb };