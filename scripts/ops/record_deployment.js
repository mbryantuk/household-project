const pkg = require('../../package.json');
const { db } = require('../../server/db/index');
const { versionHistory } = require('../../server/db/schema');

const comment = process.argv[2] || 'System update';

async function main() {
  const dbUrl = process.env.DATABASE_URL || require('../../server/config').DATABASE_URL;
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
    console.error('❌ Failed to record deployment:', err);
  }
  process.exit(0);
}

main();
