/**
 * MODERN TEST RESULTS CHECKER
 */
import { db } from '../../server/db/index';
import { testResults } from '../../server/db/schema';
import { desc } from 'drizzle-orm';

async function checkResults() {
  try {
    const rows = await db.select().from(testResults).orderBy(desc(testResults.createdAt)).limit(5);

    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('❌ Query failed:', err.message);
  }
  process.exit(0);
}

checkResults();
