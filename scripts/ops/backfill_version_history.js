const { execSync } = require('child_process');
const { globalDb, dbRun } = require('../../server/db');

async function backfill() {
  try {
    console.log('🔍 Fetching version history from Git...');
    const log = execSync('git log --pretty=format:"%ad|%s" --date=iso').toString();
    const lines = log.split('\n');

    // Pattern matches:
    // 1. v3.0.92 - Message
    // 2. nightly: v3.0.92-20260201 - Message
    const versionPattern = /^(?:nightly: )?v(\d+\.\d+\.\d+(?:-\d+)?)\s*-\s*(.*)$/;

    let count = 0;
    for (const line of lines) {
      const [date, subject] = line.split('|');
      const match = subject.match(versionPattern);

      if (match) {
        const version = match[1];
        let comment = match[2];

        // Deduplicate version in comment if present (e.g. "v3.2.1 - v3.2.0: Fix" -> "v3.2.0: Fix")
        const versionCleanPattern = new RegExp(
          `^v?${version.replace(/\./g, '\\.')}\s*[-:]?\s*`,
          'i'
        );
        comment = comment.replace(versionCleanPattern, '');

        // Check if already exists
        const existing = await new Promise((resolve) => {
          globalDb.get(
            'SELECT id FROM version_history WHERE version = ? AND comment = ?',
            [version, comment],
            (err, row) => {
              resolve(row);
            }
          );
        });

        if (!existing) {
          await dbRun(
            globalDb,
            'INSERT INTO version_history (version, comment, created_at) VALUES (?, ?, ?)',
            [version, comment, date]
          );
          count++;
        }
      }
    }
    console.log(`✅ Backfilled ${count} version entries from Git history.`);
  } catch (err) {
    console.error('❌ Failed to backfill history:', err);
  }
  process.exit(0);
}

backfill();
