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
        globalDb.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            email TEXT,
            avatar TEXT,
            system_role TEXT DEFAULT 'sysadmin',
            dashboard_layout TEXT
        )`);

        globalDb.run(`CREATE TABLE IF NOT EXISTS households (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            access_key TEXT UNIQUE,
            theme TEXT DEFAULT 'default',
            address_street TEXT,
            address_city TEXT,
            address_zip TEXT,
            date_format TEXT DEFAULT 'MM/DD/YYYY',
            currency TEXT DEFAULT 'USD',
            decimals INTEGER DEFAULT 2,
            avatar TEXT,
            auto_backup BOOLEAN DEFAULT 1,
            backup_retention INTEGER DEFAULT 7
        )`);

        const newCols = [
            ['address_street', 'TEXT'], ['address_city', 'TEXT'], ['address_zip', 'TEXT'],
            ['date_format', "TEXT DEFAULT 'MM/DD/YYYY'"], ['currency', "TEXT DEFAULT 'USD'"],
            ['decimals', 'INTEGER DEFAULT 2'], ['avatar', 'TEXT'],
            ['auto_backup', 'BOOLEAN DEFAULT 1'], ['backup_retention', 'INTEGER DEFAULT 7']
        ];
        
        newCols.forEach(([col, type]) => {
            globalDb.run(`ALTER TABLE households ADD COLUMN ${col} ${type}`, (err) => {});
        });
        
        globalDb.run(`DROP TABLE IF EXISTS user_households`);
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
        const tables = ['members', 'users', 'dates', 'house_details', 'vehicles', 'assets', 'energy_accounts', 'recurring_costs', 'waste_collections'];
        tables.forEach(table => {
            db.run(`UPDATE ${table} SET household_id = ? WHERE household_id IS NULL`, [householdId], (err) => {
                // Ignore if table doesn't exist yet
            });
        });
    });

    return db;
};

module.exports = { globalDb, getHouseholdDb };
