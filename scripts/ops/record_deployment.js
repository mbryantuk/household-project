const pkg = require('../../package.json');
const { db } = require('../../server/db/index');
const { versionHistory } = require('../../server/db/schema');

const comment = process.argv[2] || 'System update';

async function main() {
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
