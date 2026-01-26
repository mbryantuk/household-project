const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { initializeGlobalSchema, initializeHouseholdSchema } = require('./schema');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const globalDb = new sqlite3.Database(path.join(DATA_DIR, 'global.db'), (err) => {
    if (err) console.error("Global DB connection error:", err.message);
    else {
        // Optimization for concurrent access
        globalDb.run("PRAGMA journal_mode=WAL");
        globalDb.run("PRAGMA synchronous=NORMAL");
        globalDb.run("PRAGMA busy_timeout=5000"); // Wait up to 5s if locked
        console.log("Connected to Global SQLite database (Optimized).");
        initializeGlobalSchema(globalDb);
    }
});

const getHouseholdDb = (householdId) => {
    const dbPath = path.join(DATA_DIR, `household_${householdId}.db`);
    const dbExists = fs.existsSync(dbPath);
    const db = new sqlite3.Database(dbPath);
    
    // Apply optimizations to every tenant connection
    db.run("PRAGMA journal_mode=WAL");
    db.run("PRAGMA synchronous=NORMAL");
    db.run("PRAGMA busy_timeout=5000");

    if (!dbExists || true) {
        initializeHouseholdSchema(db);
    }
    return db;
};

// Unified Database Helpers (Promises)
const dbGet = (db, query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (db, query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbRun = (db, query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function(err) { err ? reject(err) : resolve({ id: this.lastID, changes: this.changes }); });
});

async function bootstrap(db) {
    return new Promise((resolve) => {
        resolve();
    });
}

module.exports = { globalDb, getHouseholdDb, bootstrap, dbGet, dbAll, dbRun };