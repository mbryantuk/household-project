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
    let latestBrady = null;
    let skipDb = false;

    if (!dbUrl) {
      console.log('⚠️ DATABASE_URL not set, skipping Postgres cleanup (useful after ephemeral testcontainers).');
      skipDb = true;
    }

    if (!skipDb) {
      try {
        // 1. Identify the latest Brady household to preserve it
        const bradyHouseholds = await db
          .select({ id: households.id })
          .from(households)
          .where(like(households.name, 'The Brady Bunch %'))
          .orderBy(desc(households.id))
          .limit(1);

        latestBrady = bradyHouseholds.length > 0 ? bradyHouseholds[0] : null;

        if (latestBrady) {
          keepIds.push(latestBrady.id);
          console.log(`📍 Preserving Latest Brady Household: ID ${latestBrady.id}`);
        }

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
          like(users.email, 'mike%'),
          like(users.email, 'carol%'),
          like(users.email, 'greg%'),
          like(users.email, 'marcia%'),
          like(users.email, 'peter%'),
          like(users.email, 'jan%'),
          like(users.email, 'bobby%'),
          like(users.email, 'cindy%'),
          like(users.email, 'smoke%'),
          like(users.email, 'routing%'),
          like(users.email, 'brady%'),
          like(users.email, 'test%'),
          eq(users.isTest, 1),
        ];

        await db.delete(users).where(
          and(
            or(...testUserPatterns),
            not(eq(users.email, MAINTAINED_USER_EMAIL))
          )
        );
        console.log(`✅ Purged orphan test user accounts.`);
      } catch (err) {
        console.error('⚠️ DB Cleanup Failed (possibly due to ephemeral test db):', err.message);
        skipDb = true;
      }
    }

    // 5. FILE CLEANUP
    const cleanupDirs = [DATA_DIR, BACKUP_DIR];
    cleanupDirs.forEach((dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file);

        // Pattern for .db files
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

        // Pattern for .zip backup files
        const zipMatch = file.match(/^household-(\d+)-backup-.*\.zip/);
        if (zipMatch) {
          const id = parseInt(zipMatch[1]);
          if (!keepIds.includes(id)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (e) {}
          }
        }
      });
    });

    // 6. RESTORE PRIMARY ACCESS
    if (!skipDb) {
      const targetUsers = await db.select({ id: users.id }).from(users).where(eq(users.email, MAINTAINED_USER_EMAIL));
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

        // Default to latest Brady
        if (latestBrady) {
          await db.update(users).set({ lastHouseholdId: latestBrady.id }).where(eq(users.id, targetUser.id));
        }
        console.log(`🔗 Access verified for ${MAINTAINED_USER_EMAIL} to households: ${keepIds.join(', ')}`);
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
