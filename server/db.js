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
 * This database stores users, households, and their relationships.
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
 * Creates the core tables used by auth.js, admin.js, and households.js
 */
function initGlobalDb() {
    globalDb.serialize(() => {
        // Users table: Matches requirements for login and registration
        globalDb.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            email TEXT,
            system_role TEXT DEFAULT 'user'
        )`);

        // Households table: Matches requirements for household management
        globalDb.run(`CREATE TABLE IF NOT EXISTS households (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            theme TEXT DEFAULT 'default'
        )`);

        // Join table: Connects users to households with specific roles
        globalDb.run(`CREATE TABLE IF NOT EXISTS user_households (
            user_id INTEGER,
            household_id INTEGER,
            role TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(household_id) REFERENCES households(id),
            PRIMARY KEY (user_id, household_id)
        )`);
    });
}

/**
 * Tenant Database Factory
 * Creates or opens a separate database file for a specific household's members.
 * @param {string|number} householdId 
 */
const getHouseholdDb = (householdId) => {
    const householdDbPath = path.join(dataDir, `household_${householdId}.db`);
    return new sqlite3.Database(householdDbPath);
};

module.exports = { globalDb, getHouseholdDb };