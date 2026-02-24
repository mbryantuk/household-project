const { pool } = require('../db/index');

afterAll(async () => {
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing pool:', err);
    }
  }
});
