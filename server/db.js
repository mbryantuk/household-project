const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const { initializeGlobalSchema, initializeHouseholdSchema } = require('./schema');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const globalDb = new sqlite3.Database(path.join(DATA_DIR, 'global.db'), (err) => {
    if (err) console.error("Global DB connection error:", err.message);
    else {
        globalDb.run("PRAGMA journal_mode=WAL");
        globalDb.run("PRAGMA synchronous=NORMAL");
        globalDb.run("PRAGMA busy_timeout=10000");
        console.log("Connected to Global SQLite database (Optimized).");
        initializeGlobalSchema(globalDb);
    }
});

// Connection Cache to prevent excessive file handles
const connections = new Map();

const getHouseholdDb = (householdId) => {
    if (connections.has(householdId)) {
        return connections.get(householdId);
    }

    const dbPath = path.join(DATA_DIR, `household_${householdId}.db`);
    const db = new sqlite3.Database(dbPath);
    db.run("PRAGMA journal_mode=WAL");
    db.run("PRAGMA synchronous=NORMAL");
    db.run("PRAGMA busy_timeout=10000");
    
    connections.set(householdId, db);
    return db;
};

const ensureHouseholdSchema = async (db, householdId) => {
    // ALWAYS run initializeHouseholdSchema to ensure migrations/new tables are applied
    // The schema file uses CREATE TABLE IF NOT EXISTS so it's safe.
    await initializeHouseholdSchema(db);
};

const dbGet = (db, query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (db, query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbRun = (db, query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function(err) { err ? reject(err) : resolve({ id: this.lastID, changes: this.changes }); });
});

module.exports = { globalDb, getHouseholdDb, ensureHouseholdSchema, dbGet, dbAll, dbRun };