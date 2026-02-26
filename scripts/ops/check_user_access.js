/**
 * MODERN USER ACCESS CHECKER
 * Item 5: Migrated from SQLite to Centralized PostgreSQL.
 */
import { db } from '../../server/db/index';
import { users, userHouseholds, households, userProfiles } from '../../server/db/schema';
import { eq } from 'drizzle-orm';

const USER_EMAIL = 'mbryantuk@gmail.com';

async function checkAccess() {
  console.log(`🔍 Access Report for: ${USER_EMAIL}`);
  console.log('='.repeat(50));

  try {
    const results = await db
      .select({
        email: users.email,
        firstName: userProfiles.firstName,
        householdId: households.id,
        householdName: households.name,
        role: userHouseholds.role,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .innerJoin(userHouseholds, eq(users.id, userHouseholds.userId))
      .innerJoin(households, eq(userHouseholds.householdId, households.id))
      .where(eq(users.email, USER_EMAIL));

    if (results.length === 0) {
      console.log('❌ No households found for this user in PostgreSQL.');

      // Check if user exists at all
      const user = await db.select().from(users).where(eq(users.email, USER_EMAIL)).limit(1);
      if (user.length === 0) {
        console.log('❓ User does not exist in the Global Registry.');
      } else {
        console.log('✅ User exists but has no household associations.');
      }
    } else {
      results.forEach((row) => {
        console.log(`🏠 [ID: ${row.householdId}] ${row.householdName} (${row.role})`);
      });
    }
  } catch (err) {
    console.error('❌ Query failed:', err.message);
  }

  console.log('='.repeat(50));
  process.exit(0);
}

checkAccess();
