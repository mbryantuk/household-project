const sqlite3 = require('sqlite3').verbose();
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
    }
});

const initialize = () => initializeGlobalSchema(globalDb);

const getHouseholdDb = (householdId) => {
    const dbPath = path.join(DATA_DIR, `household_${householdId}.db`);
    const db = new sqlite3.Database(dbPath);
    db.run("PRAGMA journal_mode=WAL");
    db.run("PRAGMA synchronous=NORMAL");
    db.run("PRAGMA busy_timeout=10000");
    return db;
};

const ensureHouseholdSchema = async (db, householdId) => {
    // Check if a standard table exists
    const row = await dbGet(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='members'");
    if (!row) {
        console.log(`[DB] Initializing schema for household ${householdId}...`);
        await initializeHouseholdSchema(db);
        console.log(`[DB] Schema ready for household ${householdId}.`);
    }
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

module.exports = { globalDb, initialize, getHouseholdDb, ensureHouseholdSchema, dbGet, dbAll, dbRun };