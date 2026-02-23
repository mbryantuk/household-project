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

  // Storage Config
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('data/uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Auth Provider (Clerk)
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
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
