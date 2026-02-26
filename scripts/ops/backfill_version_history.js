/**
 * MODERN VERSION HISTORY BACKFILLER
 * Item 5: Migrated to PostgreSQL.
 */
import { execSync } from 'child_process';
import { db } from '../../server/db/index';
import { versionHistory } from '../../server/db/schema';
import { and, eq } from 'drizzle-orm';

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

        // Check if already exists in PostgreSQL
        const [existing] = await db
          .select()
          .from(versionHistory)
          .where(and(eq(versionHistory.version, version), eq(versionHistory.comment, comment)))
          .limit(1);

        if (!existing) {
          await db.insert(versionHistory).values({
            version,
            comment,
            createdAt: new Date(date),
          });
          count++;
        }
      }
    }
    console.log(`✅ Backfilled ${count} version entries from Git history into PostgreSQL.`);
  } catch (err) {
    console.error('❌ Failed to backfill history:', err.message);
  }
  process.exit(0);
}

backfill();
