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

// HELPER: Promisify DB get
const dbGet = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

// HELPER: Promisify DB all
const dbAll = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

// HELPER: Promisify DB run
const dbRun = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
    });
});

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
            ['enabled_modules', 'TEXT'], ['is_test', 'INTEGER DEFAULT 0']
        ];
        
        houseCols.forEach(([col, type]) => {
            globalDb.run(`ALTER TABLE households ADD COLUMN ${col} ${type}`, () => {
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
            ['is_active', 'BOOLEAN DEFAULT 1'],
            ['is_test', 'INTEGER DEFAULT 0']
        ];

        userCols.forEach(([col, type]) => {
            globalDb.run(`ALTER TABLE users ADD COLUMN ${col} ${type}`, () => {
                // Ignore "duplicate column name" errors
            });
        });

        globalDb.run(`ALTER TABLE user_households ADD COLUMN is_active BOOLEAN DEFAULT 1`, () => {
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
    
    const db = new sqlite3.Database(householdDbPath);
    db.configure('busyTimeout', 5000);
    
    // Always initialize schema (handles missing tables in existing files)
    initializeHouseholdSchema(db);

    // CRITICAL: Self-healing for NULL household_ids in tenant databases
    db.serialize(() => {
        const tables = [
            'members', 'dates', 'house_details', 'vehicles', 'assets', 
            'energy_accounts', 'recurring_costs', 'waste_collections',
            'water_accounts', 'council_accounts', 'meals', 'meal_plans'
        ];
        tables.forEach(table => {
            db.run(`UPDATE ${table} SET household_id = ? WHERE household_id IS NULL`, [householdId], () => {
                // Silent fail if table/column doesn't exist
            });
        });
    });

    return db;
};

module.exports = { globalDb, getHouseholdDb, dbGet, dbAll, dbRun };
