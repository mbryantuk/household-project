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
  });
};

export const pool = getPool();

pool.on('error', (err) => {
  logger.error('Unexpected error on idle postgres client', err);
  process.exit(-1);
});

export const db = drizzle(pool, { schema });

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
