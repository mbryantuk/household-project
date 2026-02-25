import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import config from '../config';
import logger from '../utils/logger';

/**
 * HEARTHSTONE POSTGRES CONNECTION
 * This replaces the globalDb SQLite instance for core identity and tenancy.
 */

// Use a getter for the pool to ensure it uses the latest process.env values (critical for tests)
const getPool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL || config.DATABASE_URL,
    max: 20, // Max connections in the pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Timeout after 2s when acquiring connection
  });
};

export const pool = getPool();

pool.on('error', (err) => {
  logger.error('Unexpected error on idle postgres client', err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });

// Item 155: Query Execution Monitoring
const SLOW_QUERY_THRESHOLD_MS = 100;

/**
 * Log queries that exceed the threshold
 */
const originalQuery = pool.query.bind(pool);
pool.query = async (...args: any[]) => {
  const start = Date.now();
  try {
    const result = await originalQuery(...args);
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn({
        msg: '[DB] Slow Query Detected',
        duration: `${duration}ms`,
        query: typeof args[0] === 'string' ? args[0].substring(0, 200) : 'Complex Query',
      });
    }
    return result;
  } catch (err) {
    throw err;
  }
};

export const checkDbConnection = async () => {
  try {
    const client = await pool.connect();
    logger.info('✅ Successfully connected to PostgreSQL');
    client.release();
    return true;
  } catch (err) {
    logger.error('❌ Failed to connect to PostgreSQL:', err);
    return false;
  }
};
