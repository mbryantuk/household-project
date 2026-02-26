/**
 * MODERN BUDGET SETTINGS MIGRATOR
 */
import { db } from '../../server/db/index';
import { userProfiles } from '../../server/db/schema';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🛠️ Ensuring budget_settings exist for all user profiles in PostgreSQL...');

  try {
    // In Drizzle/Postgres, the column already exists in the schema.
    // This script ensures they have a default if they are null.
    await db
      .update(userProfiles)
      .set({ budgetSettings: '{}' })
      .where(sql`budget_settings IS NULL`);

    console.log(`✅ Successfully initialized budget settings.`);
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  }

  process.exit(0);
}

migrate();
