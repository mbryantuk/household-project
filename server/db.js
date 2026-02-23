const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { initializeHouseholdSchema } = require('./schema');

/**
 * LEGACY DATABASE INITIALIZATION (SQLite)
 * Still used for individual household data files.
 */

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Global SQLite is now LEGACY and mostly used for backward compatibility during migration
const GLOBAL_DB_PATH = path.join(DATA_DIR, 'global.db');
const globalDb = new sqlite3.Database(GLOBAL_DB_PATH, (err) => {
  if (err) console.error('Global DB Connection Error:', err.message);
  else if (process.env.NODE_ENV !== 'test')
    console.log('Connected to Legacy Global SQLite database.');
});

/**
 * GET HOUSEHOLD DB (SQLite Tenant)
 */
function getHouseholdDb(id) {
  const dbPath = path.join(DATA_DIR, `household_${id}.db`);
  return new sqlite3.Database(dbPath);
}

/**
 * ENSURE HOUSEHOLD SCHEMA (SQLite)
 * Uses the standard schema.js initialization
 */
async function ensureHouseholdSchema(db, id) {
  return await initializeHouseholdSchema(db);
}

/**
 * HELPER: Promisified DB GET
 */
function dbGet(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * HELPER: Promisified DB ALL
 */
function dbAll(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * HELPER: Promisified DB RUN
 */
function dbRun(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

module.exports = {
  globalDb,
  getHouseholdDb,
  ensureHouseholdSchema,
  dbGet,
  dbAll,
  dbRun,
};
