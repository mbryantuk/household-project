import { z } from 'zod';
import logger from './utils/logger';

/**
 * ENVIRONMENT VALIDATOR (TypeScript)
 * Ensures all required environment variables are present and correctly typed.
 */
const envSchema = z.object({
  PORT: z.string().default('4001').transform(Number),
  SECRET_KEY: z.string().min(16, 'JWT Secret must be at least 16 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const env = {
  ...process.env,
  SECRET_KEY: process.env.SECRET_KEY || process.env.JWT_SECRET,
};

// Provide defaults for development if not set
if (env.NODE_ENV !== 'production') {
  env.SECRET_KEY = env.SECRET_KEY || 'super_secret_dev_key_must_be_long_enough';
}

const parsed = envSchema.safeParse(env);

if (!parsed.success) {
  logger.error('❌ Invalid environment variables: %o', parsed.error.format());
  process.exit(1);
}

const config = parsed.data;
export default config;
// For CommonJS compatibility during transition
module.exports = config;
