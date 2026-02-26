/**
 * MODERN DEPLOYMENT RECORDER
 * Item 5: Migrated to Centralized PostgreSQL.
 */
import pkg from '../../package.json';
import { db } from '../../server/db/index';
import { versionHistory } from '../../server/db/schema';
import config from '../../server/config';

const comment = process.argv[2] || 'System update';

async function main() {
  const dbUrl = process.env.DATABASE_URL || config.DATABASE_URL;
  if (!dbUrl) {
    console.log('⚠️ DATABASE_URL not set, skipping Postgres version_history update.');
    process.exit(0);
  }

  try {
    await db.insert(versionHistory).values({
      version: pkg.version,
      comment,
    });
    console.log(`✅ Recorded deployment v${pkg.version}: ${comment}`);
  } catch (err) {
    console.error('❌ Failed to record deployment:', err.message);
  }
  process.exit(0);
}

main();
