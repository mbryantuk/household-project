const { pool } = require('../db/index');
const { globalDb } = require('../db');
const { closeAll: closeQueue } = require('../services/queue');

afterAll(async () => {
  // 1. Close Postgres pool
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing Postgres pool:', err);
    }
  }

  // 2. Close legacy SQLite global DB
  if (globalDb) {
    try {
      await new Promise((resolve, reject) => {
        globalDb.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      console.error('Error closing legacy global SQLite DB:', err);
    }
  }

  // 3. Close BullMQ / Redis connections
  try {
    await closeQueue();
  } catch (err) {
    console.error('Error closing queue connections:', err);
  }
});
