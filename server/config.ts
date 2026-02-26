import { z } from 'zod';
import logger from './utils/logger';

/**
 * ENVIRONMENT VALIDATOR (TypeScript)
 */
const envSchema = z.object({
  PORT: z.string().default('4001').transform(Number),
  SECRET_KEY: z.string().min(16, 'JWT Secret must be at least 16 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:4001,http://localhost:5173'),

  // Storage Config
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('data/uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Secrets Management (Infisical)
  INFISICAL_CLIENT_ID: z.string().optional(),
  INFISICAL_CLIENT_SECRET: z.string().optional(),
  INFISICAL_PROJECT_ID: z.string().optional(),
});

type ConfigType = z.infer<typeof envSchema>;

/**
 * ASYNCHRONOUS SECRET LOADER
 */
async function loadSecrets() {
  const env: Record<string, string | undefined> = { ...process.env };

  if (process.env.INFISICAL_CLIENT_ID && process.env.INFISICAL_CLIENT_SECRET) {
    try {
      const { InfisicalClient } = await import('@infisical/sdk');
      const client = new InfisicalClient({
        clientId: process.env.INFISICAL_CLIENT_ID,
        clientSecret: process.env.INFISICAL_CLIENT_SECRET,
      });

      const secrets = await client.listSecrets({
        environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        projectId: process.env.INFISICAL_PROJECT_ID!,
      });

      secrets.forEach((s) => {
        env[s.secretKey] = s.secretValue;
      });
      logger.info('🔐 Secrets loaded successfully from Infisical.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      logger.error('❌ Failed to load secrets from Infisical:', error.message);
    }
  }

  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    logger.error('❌ Invalid environment variables: %o', parsed.error.format());
    process.exit(1);
  }

  // Update the singleton export
  Object.assign(config, parsed.data);
  return parsed.data;
}

// Initial synchronous parse for immediate module requirements
const config = {
  ...envSchema.parse({
    ...process.env,
    SECRET_KEY: process.env.SECRET_KEY || 'super_secret_dev_key_must_be_long_enough',
  }),
} as ConfigType;

export default config;
export { loadSecrets };

// CJS compatibility
module.exports = config;
module.exports.loadSecrets = loadSecrets;
module.exports.default = config;
