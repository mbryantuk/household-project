const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { initializeHouseholdSchema } = require('./schema');

// Ensure paths are consistent with server.js configuration
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'totem.db');

// Ensure the data directory exists for the global and tenant databases
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Global Database Connection
 * Stores SysAdmins and Households (metadata only).
 */
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

/**
 * Schema Initialization
 */
function initGlobalDb() {
    globalDb.serialize(() => {
        // Users table: NOW ONLY FOR SYSTEM ADMINS
        globalDb.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            email TEXT,
            avatar TEXT,
            system_role TEXT DEFAULT 'sysadmin' -- Mostly 'sysadmin' now
        )`);

        // Migration: Ensure avatar exists in global users
        globalDb.run(`ALTER TABLE users ADD COLUMN avatar TEXT`, (err) => {});

        // Households table: Added access_key
        globalDb.run(`CREATE TABLE IF NOT EXISTS households (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            access_key TEXT UNIQUE, -- The "Door Key" for login
            theme TEXT DEFAULT 'default',
            address_street TEXT,
            address_city TEXT,
            address_zip TEXT,
            date_format TEXT DEFAULT 'MM/DD/YYYY',
            currency TEXT DEFAULT 'USD',
            decimals INTEGER DEFAULT 2,
            avatar TEXT
        )`);

        // Migration: Ensure new columns exist for existing installations
        const newCols = [
            ['address_street', 'TEXT'],
            ['address_city', 'TEXT'],
            ['address_zip', 'TEXT'],
            ['date_format', "TEXT DEFAULT 'MM/DD/YYYY'"],
            ['currency', "TEXT DEFAULT 'USD'"],
            ['decimals', 'INTEGER DEFAULT 2'],
            ['avatar', 'TEXT']
        ];
        
        newCols.forEach(([col, type]) => {
            globalDb.run(`ALTER TABLE households ADD COLUMN ${col} ${type}`, (err) => {
                // Ignore "duplicate column name" errors
            });
        });
        
        // user_households is DEPRECATED in this new model 
        // (Users live inside the household DB now)
        globalDb.run(`DROP TABLE IF EXISTS user_households`);
    });
}

/**
 * Tenant Database Factory
 * Creates or opens a separate database file for a specific household.
 * Now includes the local 'users' table.
 * @param {string|number} householdId 
 */
const getHouseholdDb = (householdId) => {
    const householdDbPath = path.join(dataDir, `household_${householdId}.db`);
    const db = new sqlite3.Database(householdDbPath);
    
    // Initialize Local Schema centralized in schema.js
    initializeHouseholdSchema(db);

    return db;
};

module.exports = { globalDb, getHouseholdDb };