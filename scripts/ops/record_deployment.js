const { globalDb, dbRun } = require('../../server/db');
const pkg = require('../../package.json');

const comment = process.argv[2] || 'System update';

async function main() {
  try {
    await dbRun(globalDb, `INSERT INTO version_history (version, comment) VALUES (?, ?)`, [
      pkg.version,
      comment,
    ]);
    console.log(`✅ Recorded deployment v${pkg.version}: ${comment}`);
  } catch (err) {
    console.error('❌ Failed to record deployment:', err);
  }
  process.exit(0);
}

main();
