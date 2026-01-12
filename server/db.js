const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { initializeHouseholdSchema } = require('./schema');

// Ensure paths are consistent with server.js configuration
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'totem.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const globalDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening Global DB:", err.message);
    } else {
        if (process.env.NODE_ENV !== 'test') {
            console.log("Connected to Global SQLite database.");
        }
        initGlobalDb();
    }
});

function initGlobalDb() {
    globalDb.serialize(() => {
        // --- GLOBAL USERS TABLE (SaaS Architecture) ---
        globalDb.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            avatar TEXT,
            system_role TEXT DEFAULT 'user', -- 'sysadmin' or 'user'
            default_household_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            dashboard_layout TEXT,
            sticky_note TEXT
        )`);

        // --- GLOBAL HOUSEHOLDS TABLE ---
        globalDb.run(`CREATE TABLE IF NOT EXISTS households (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            access_key TEXT UNIQUE, -- Kept for legacy/api reference, but not for login
            theme TEXT DEFAULT 'default',
            address_street TEXT,
            address_city TEXT,
            address_zip TEXT,
            date_format TEXT DEFAULT 'MM/DD/YYYY',
            currency TEXT DEFAULT 'USD',
            decimals INTEGER DEFAULT 2,
            avatar TEXT,
            auto_backup BOOLEAN DEFAULT 1,
            backup_retention INTEGER DEFAULT 7,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // --- USER-HOUSEHOLD MAPPING (Tenancy) ---
        globalDb.run(`CREATE TABLE IF NOT EXISTS user_households (
            user_id INTEGER,
            household_id INTEGER,
            role TEXT DEFAULT 'member', -- 'admin', 'member', 'viewer'
            joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, household_id),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(household_id) REFERENCES households(id) ON DELETE CASCADE
        )`);

        // Migrations / Fixes
        const houseCols = [
            ['address_street', 'TEXT'], ['address_city', 'TEXT'], ['address_zip', 'TEXT'],
            ['date_format', "TEXT DEFAULT 'MM/DD/YYYY'"], ['currency', "TEXT DEFAULT 'USD'"],
            ['decimals', 'INTEGER DEFAULT 2'], ['avatar', 'TEXT'],
            ['auto_backup', 'BOOLEAN DEFAULT 1'], ['backup_retention', 'INTEGER DEFAULT 7']
        ];
        
        houseCols.forEach(([col, type]) => {
            globalDb.run(`ALTER TABLE households ADD COLUMN ${col} ${type}`, (err) => {});
        });

        // Ensure email column exists in users (if migrating from old schema)
        globalDb.run(`ALTER TABLE users ADD COLUMN email TEXT UNIQUE`, (err) => {});
        globalDb.run(`ALTER TABLE users ADD COLUMN first_name TEXT`, (err) => {});
        globalDb.run(`ALTER TABLE users ADD COLUMN last_name TEXT`, (err) => {});
        globalDb.run(`ALTER TABLE users ADD COLUMN default_household_id INTEGER`, (err) => {});
        globalDb.run(`ALTER TABLE users ADD COLUMN sticky_note TEXT`, (err) => {});
    });
}

/**
 * Tenant Database Factory
 * Automatically fixes NULL household_ids for legacy data.
 */
const getHouseholdDb = (householdId) => {
    const householdDbPath = path.join(dataDir, `household_${householdId}.db`);
    const db = new sqlite3.Database(householdDbPath);
    
    // Initialize Schema & Migrations
    initializeHouseholdSchema(db);

    // CRITICAL: Self-healing for NULL household_ids in tenant databases
    db.serialize(() => {
        const tables = ['members', 'dates', 'house_details', 'vehicles', 'assets', 'energy_accounts', 'recurring_costs', 'waste_collections'];
        tables.forEach(table => {
            db.run(`UPDATE ${table} SET household_id = ? WHERE household_id IS NULL`, [householdId], (err) => {
                // Ignore if table doesn't exist yet
            });
        });
    });

    return db;
};

module.exports = { globalDb, getHouseholdDb };