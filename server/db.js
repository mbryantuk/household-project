const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

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
            system_role TEXT DEFAULT 'sysadmin' -- Mostly 'sysadmin' now
        )`);

        // Households table: Added access_key
        globalDb.run(`CREATE TABLE IF NOT EXISTS households (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            access_key TEXT UNIQUE, -- The "Door Key" for login
            theme TEXT DEFAULT 'default'
        )`);
        
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
    
    // Initialize Local Schema
    db.serialize(() => {
        // Local Users: Specific to this household
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            password_hash TEXT,
            email TEXT,
            role TEXT DEFAULT 'member' -- admin, member, viewer
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT NOT NULL, 
            type TEXT DEFAULT 'adult', 
            notes TEXT,
            alias TEXT, dob TEXT, species TEXT, gender TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS dates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            type TEXT DEFAULT 'event',
            description TEXT
        )`);
    });

    return db;
};

module.exports = { globalDb, getHouseholdDb };