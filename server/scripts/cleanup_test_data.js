const fs = require('fs');
const path = require('path');
const { globalDb, dbAll, dbRun, dbGet } = require('../db');

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAINTAINED_USER_EMAIL = 'mbryantuk@gmail.com';
const PERMANENT_HOUSEHOLD_ID = 60; // Bryant

async function cleanupTestData() {
  console.log('🧹 Starting Aggressive Test Data Cleanup...');

  try {
    // 1. Identify the latest Brady household to preserve it
    const latestBrady = await dbGet(
      globalDb,
      `
            SELECT id FROM households 
            WHERE name LIKE 'The Brady Bunch %' 
            ORDER BY id DESC LIMIT 1
        `
    );

    const keepIds = [PERMANENT_HOUSEHOLD_ID];
    if (latestBrady) {
      keepIds.push(latestBrady.id);
      console.log(`📍 Preserving Latest Brady Household: ID ${latestBrady.id}`);
    }

    // 2. TAGGING: Mark any household NOT in the keep list as 'is_test = 1'
    // This ensures they are captured by the purge logic even if they were created as 'live'
    const placeholders = keepIds.map(() => '?').join(',');
    await dbRun(
      globalDb,
      `
            UPDATE households 
            SET is_test = 1 
            WHERE id NOT IN (${placeholders})
        `,
      keepIds
    );

    // 3. PURGE: Delete all is_test = 1 households NOT in the keep list
    const householdsToDelete = await dbAll(
      globalDb,
      `
            SELECT id FROM households 
            WHERE is_test = 1 AND id NOT IN (${placeholders})
        `,
      keepIds
    );

    if (householdsToDelete.length > 0) {
      const deleteIds = householdsToDelete.map((h) => h.id);
      const delPlaceholders = deleteIds.map(() => '?').join(',');

      await dbRun(
        globalDb,
        `DELETE FROM user_households WHERE household_id IN (${delPlaceholders})`,
        deleteIds
      );
      await dbRun(globalDb, `DELETE FROM households WHERE id IN (${delPlaceholders})`, deleteIds);
      console.log(`✅ Purged ${householdsToDelete.length} old test households.`);
    }

    // 4. ORPHAN USERS: Purge test users except the primary maintainer
    const testUserPatterns = [
      'ephemeral%',
      'mike%',
      'carol%',
      'greg%',
      'marcia%',
      'peter%',
      'jan%',
      'bobby%',
      'cindy%',
      'smoke%',
      'routing%',
      'brady%',
      'test%',
    ];
    const userDelPlaceholders = testUserPatterns.map(() => 'email LIKE ?').join(' OR ');

    await dbRun(
      globalDb,
      `
            DELETE FROM users 
            WHERE (is_test = 1 OR ${userDelPlaceholders}) 
            AND email != ?
        `,
      [...testUserPatterns, MAINTAINED_USER_EMAIL]
    );
    console.log(`✅ Purged orphan test user accounts.`);

    // 5. FILE CLEANUP
    const cleanupDirs = [DATA_DIR, BACKUP_DIR];
    cleanupDirs.forEach((dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file);
        const match = file.match(/^household_(\d+)\.db/);
        if (match) {
          const id = parseInt(match[1]);
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
    const targetUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [
      MAINTAINED_USER_EMAIL,
    ]);
    if (targetUser) {
      for (const hhId of keepIds) {
        await dbRun(
          globalDb,
          `
                    INSERT OR REPLACE INTO user_households (user_id, household_id, role, is_active) 
                    VALUES (?, ?, 'admin', 1)
                `,
          [targetUser.id, hhId]
        );
      }

      // Default to latest Brady
      if (latestBrady) {
        await dbRun(globalDb, `UPDATE users SET last_household_id = ? WHERE id = ?`, [
          latestBrady.id,
          targetUser.id,
        ]);
      }
      console.log(
        `🔗 Access verified for ${MAINTAINED_USER_EMAIL} to households: ${keepIds.join(', ')}`
      );
    }
  } catch (err) {
    console.error('❌ Cleanup Failed:', err);
  }
}

if (require.main === module) {
  cleanupTestData().then(() => process.exit(0));
}

module.exports = cleanupTestData;
