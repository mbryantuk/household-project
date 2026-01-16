const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { initializeGlobalSchema, initializeHouseholdSchema } = require('./schema');

// Ensure paths are consistent
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'totem.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Single Global DB Instance
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
globalDb.configure('busyTimeout', 5000);

function initGlobalDb() {
    globalDb.serialize(() => {
        // Initialize Global Schema Only
        initializeGlobalSchema(globalDb);

        // Self-healing Migrations (Ensure columns exist in case of older DB)
        const houseCols = [
            ['address_street', 'TEXT'], ['address_city', 'TEXT'], ['address_zip', 'TEXT'],
            ['date_format', "TEXT DEFAULT 'DD/MM/YYYY'"], ['currency', "TEXT DEFAULT 'GBP'"],
            ['decimals', 'INTEGER DEFAULT 2'], ['avatar', 'TEXT'],
            ['auto_backup', 'BOOLEAN DEFAULT 1'], ['backup_retention', 'INTEGER DEFAULT 7'],
            ['enabled_modules', 'TEXT']
        ];
        
        houseCols.forEach(([col, type]) => {
            globalDb.run(`ALTER TABLE households ADD COLUMN ${col} ${type}`, (err) => {
                // Ignore "duplicate column name" errors
            });
        });

        const userCols = [
            ['email', 'TEXT UNIQUE'],
            ['username', 'TEXT UNIQUE'],
            ['first_name', 'TEXT'],
            ['last_name', 'TEXT'],
            ['default_household_id', 'INTEGER'],
            ['sticky_note', 'TEXT'],
            ['theme', "TEXT DEFAULT 'totem'"],
            ['is_active', 'BOOLEAN DEFAULT 1']
        ];

        userCols.forEach(([col, type]) => {
            globalDb.run(`ALTER TABLE users ADD COLUMN ${col} ${type}`, (err) => {
                // Ignore "duplicate column name" errors
            });
        });

        globalDb.run(`ALTER TABLE user_households ADD COLUMN is_active BOOLEAN DEFAULT 1`, (err) => {
            // Ignore "duplicate column name" errors
        });
    });
}

/**
 * Tenant Database Factory
 */
const getHouseholdDb = (householdId) => {
    if (!householdId) {
        throw new Error("getHouseholdDb called without householdId");
    }
    const householdDbPath = path.join(dataDir, `household_${householdId}.db`);
    
    // Check if we need to initialize the file (sync check for simplicity in factory)
    const exists = fs.existsSync(householdDbPath);
    
    const db = new sqlite3.Database(householdDbPath);
    db.configure('busyTimeout', 5000);
    
    // Always initialize schema (handles missing tables in existing files)
    initializeHouseholdSchema(db);

    // CRITICAL: Self-healing for NULL household_ids in tenant databases
    db.serialize(() => {
        const tables = [
            'members', 'dates', 'house_details', 'vehicles', 'assets', 
            'energy_accounts', 'recurring_costs', 'waste_collections',
            'water_info', 'council_info', 'meals', 'meal_plans'
        ];
        tables.forEach(table => {
            db.run(`UPDATE ${table} SET household_id = ? WHERE household_id IS NULL`, [householdId], (err) => {
                // Silent fail if table/column doesn't exist
            });
        });
    });

    return db;
};

module.exports = { globalDb, getHouseholdDb };