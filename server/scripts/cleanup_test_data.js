const fs = require('fs');
const path = require('path');
const { db } = require('../db/index');
const { households, users, userHouseholds } = require('../db/schema');
const { eq, inArray, like, not, and, desc, or } = require('drizzle-orm');

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAINTAINED_USER_EMAIL = 'mbryantuk@gmail.com';
const PERMANENT_HOUSEHOLD_ID = 60; // Bryant

async function cleanupTestData() {
  console.log('🧹 Starting Aggressive Test Data Cleanup...');

  try {
    const dbUrl = process.env.DATABASE_URL || require('../config').DATABASE_URL;
    let keepIds = [PERMANENT_HOUSEHOLD_ID];
    let skipDb = false;

    if (!dbUrl) {
      console.log(
        '⚠️ DATABASE_URL not set, skipping Postgres cleanup (useful after ephemeral testcontainers).'
      );
      skipDb = true;
    }

    if (!skipDb) {
      try {
        // 1. Identify households to preserve
        // Latest Brady
        const bradyHouseholds = await db
          .select({ id: households.id })
          .from(households)
          .where(like(households.name, 'The Brady Bunch %'))
          .orderBy(desc(households.id))
          .limit(1);
        if (bradyHouseholds.length > 0) keepIds.push(bradyHouseholds[0].id);

        // Diverse Profiles (Preserve the latest of each major type created by seed_diverse_households)
        const diverseNames = [
          'The High-Flyer',
          'The Golden Years',
          'The Wilson Hub',
          'Roomies 101',
          'The Miller Home',
          'The Tech Duo',
          'Green Pastures',
          'First Nest',
          'Global Base',
          'The Ancestral Home',
        ];

        for (const namePrefix of diverseNames) {
          const matched = await db
            .select({ id: households.id })
            .from(households)
            .where(like(households.name, `${namePrefix}%`))
            .orderBy(desc(households.id))
            .limit(1);
          if (matched.length > 0) keepIds.push(matched[0].id);
        }

        console.log(`📍 Preserving ${keepIds.length} key households: ${keepIds.join(', ')}`);

        // 2. TAGGING: Mark any household NOT in the keep list as 'is_test = 1'
        await db
          .update(households)
          .set({ isTest: 1 })
          .where(not(inArray(households.id, keepIds)));

        // 3. PURGE: Delete all is_test = 1 households NOT in the keep list
        const householdsToDelete = await db
          .select({ id: households.id })
          .from(households)
          .where(and(eq(households.isTest, 1), not(inArray(households.id, keepIds))));

        if (householdsToDelete.length > 0) {
          const deleteIds = householdsToDelete.map((h) => h.id);
          await db.delete(userHouseholds).where(inArray(userHouseholds.householdId, deleteIds));
          await db.delete(households).where(inArray(households.id, deleteIds));
          console.log(`✅ Purged ${householdsToDelete.length} old test households.`);
        }

        // 4. ORPHAN USERS: Purge test users except the primary maintainer
        const testUserPatterns = [
          like(users.email, 'ephemeral%'),
          like(users.email, 'admin.%'),
          like(users.email, 'mike%'),
          like(users.email, 'smoke%'),
          like(users.email, 'routing%'),
          like(users.email, 'test%'),
          eq(users.isTest, 1),
        ];

        await db
          .delete(users)
          .where(and(or(...testUserPatterns), not(eq(users.email, MAINTAINED_USER_EMAIL))));
        console.log(`✅ Purged orphan test user accounts.`);
      } catch (err) {
        console.error('⚠️ DB Cleanup Failed:', err.message);
        skipDb = true;
      }
    }

    // 5. FILE CLEANUP
    const cleanupDirs = [DATA_DIR, BACKUP_DIR];
    cleanupDirs.forEach((dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file);
        const dbMatch = file.match(/^household_(\d+)\.db/);
        if (dbMatch) {
          const id = parseInt(dbMatch[1]);
          if (!keepIds.includes(id)) {
            try {
              fs.unlinkSync(fullPath);
              ['-wal', '-shm'].forEach((ext) => {
                if (fs.existsSync(fullPath + ext)) fs.unlinkSync(fullPath + ext);
              });
            } catch (e) {}
          }
        }
      });
    });

    // 6. RESTORE PRIMARY ACCESS
    if (!skipDb) {
      const targetUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, MAINTAINED_USER_EMAIL));
      if (targetUsers.length > 0) {
        const targetUser = targetUsers[0];
        for (const hhId of keepIds) {
          await db
            .insert(userHouseholds)
            .values({ userId: targetUser.id, householdId: hhId, role: 'admin', isActive: true })
            .onConflictDoUpdate({
              target: [userHouseholds.userId, userHouseholds.householdId],
              set: { role: 'admin', isActive: true },
            });
        }
        console.log(
          `🔗 Access verified for ${MAINTAINED_USER_EMAIL} to ${keepIds.length} households.`
        );
      }
    }
  } catch (err) {
    console.error('❌ Cleanup Failed:', err);
  }
}

if (require.main === module) {
  cleanupTestData().then(() => process.exit(0));
}

module.exports = cleanupTestData;
