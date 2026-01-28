const fs = require('fs');
const path = require('path');
const { globalDb, dbAll, dbRun, dbGet } = require('../db');

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAINTAINED_USER_EMAIL = 'mbryantuk@gmail.com';
const PERMANENT_HOUSEHOLD_ID = 60; // Bryant

async function cleanupTestData() {
    console.log("🧹 Starting Aggressive Test Data Cleanup...");

    try {
        // ==========================================
        // 1. IDENTIFY LATEST TEST HOUSEHOLD
        // ==========================================
        const latestTest = await dbGet(globalDb, `SELECT id FROM households WHERE is_test = 1 ORDER BY id DESC LIMIT 1`);
        const latestId = latestTest ? latestTest.id : null;
        
        if (latestId) {
            console.log(`📍 Latest test household identified: #${latestId}`);
        } else {
            console.log("📍 No test households found to preserve.");
        }

        // ==========================================
        // 2. DELETE ALL OTHER HOUSEHOLDS FROM GLOBAL DB
        // ==========================================
        const keepIds = [PERMANENT_HOUSEHOLD_ID];
        if (latestId) keepIds.push(latestId);

        const placeholders = keepIds.map(() => '?').join(',');
        const householdsToDelete = await dbAll(globalDb, `
            SELECT id FROM households 
            WHERE id NOT IN (${placeholders})
        `, keepIds);
        
        if (householdsToDelete.length > 0) {
            const deleteIds = householdsToDelete.map(h => h.id);
            const delPlaceholders = deleteIds.map(() => '?').join(',');

            await dbRun(globalDb, `DELETE FROM user_households WHERE household_id IN (${delPlaceholders})`, deleteIds);
            await dbRun(globalDb, `DELETE FROM households WHERE id IN (${delPlaceholders})`, deleteIds);
            console.log(`✅ Deleted ${householdsToDelete.length} household records from global DB.`);
        }

        // ==========================================
        // 3. AGGRESSIVE FILE CLEANUP (DATA & BACKUPS)
        // ==========================================
        const cleanupDirs = [DATA_DIR, BACKUP_DIR];
        let deletedFiles = 0;

        const scanAndRemove = (dir) => {
            if (!fs.existsSync(dir)) return;
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    scanAndRemove(fullPath);
                    // Optionally remove empty dir
                    try { if (fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath); } catch(e) {}
                } else {
                    // Match household_ID.db (and -wal, -shm)
                    const match = item.match(/^household_(\d+)\.db/);
                    if (match) {
                        const id = parseInt(match[1]);
                        if (!keepIds.includes(id)) {
                            try {
                                fs.unlinkSync(fullPath);
                                // Also try to unlink wal/shm if they exist
                                ['-wal', '-shm'].forEach(ext => {
                                    const sidecar = fullPath + ext;
                                    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
                                });
                                deletedFiles++;
                            } catch (err) {}
                        }
                    }
                }
            }
        };

        cleanupDirs.forEach(scanAndRemove);
        console.log(`✅ Purged ${deletedFiles} orphan database files from system.`);

        // ==========================================
        // 4. DELETE ALL TEST USERS (EXCEPT MAINTAINED)
        // ==========================================
        const testUsers = await dbAll(globalDb, `
            SELECT id FROM users 
            WHERE is_test = 1 AND email != ?
        `, [MAINTAINED_USER_EMAIL]);

        if (testUsers.length > 0) {
            const ids = testUsers.map(u => u.id);
            const delPlaceholders = ids.map(() => '?').join(',');
            await dbRun(globalDb, `DELETE FROM user_households WHERE user_id IN (${delPlaceholders})`, ids);
            await dbRun(globalDb, `DELETE FROM users WHERE id IN (${delPlaceholders})`, ids);
            console.log(`✅ Removed ${testUsers.length} test user records.`);
        }

        // ==========================================
        // 5. RESTORE ACCESS TO BRYANT AND LATEST TEST
        // ==========================================
        const targetUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [MAINTAINED_USER_EMAIL]);
        
        if (targetUser) {
            for (const hhId of keepIds) {
                const hhExists = await dbGet(globalDb, `SELECT id FROM households WHERE id = ?`, [hhId]);
                if (!hhExists) continue;

                const existingLink = await dbGet(globalDb, 
                    `SELECT * FROM user_households WHERE user_id = ? AND household_id = ?`, 
                    [targetUser.id, hhId]
                );

                if (!existingLink) {
                    await dbRun(globalDb, 
                        `INSERT INTO user_households (user_id, household_id, role, is_active) VALUES (?, ?, 'admin', 1)`,
                        [targetUser.id, hhId]
                    );
                    console.log(`🔗 Linked ${MAINTAINED_USER_EMAIL} to household #${hhId}.`);
                } else {
                    await dbRun(globalDb, 
                        `UPDATE user_households SET role = 'admin', is_active = 1 WHERE user_id = ? AND household_id = ?`,
                        [targetUser.id, hhId]
                    );
                }
            }

            const defaultHh = latestId || PERMANENT_HOUSEHOLD_ID;
            await dbRun(globalDb, `UPDATE users SET default_household_id = ? WHERE id = ?`, [defaultHh, targetUser.id]);
            console.log(`🎯 Set default household for ${MAINTAINED_USER_EMAIL} to #${defaultHh}.`);
        }

        // Final orphan purge
        await dbRun(globalDb, `
            DELETE FROM user_households 
            WHERE household_id NOT IN (SELECT id FROM households)
            OR user_id NOT IN (SELECT id FROM users)
        `);

    } catch (err) {
        console.error("❌ Cleanup Failed:", err);
    }
}

if (require.main === module) {
    cleanupTestData().then(() => process.exit(0));
}

module.exports = cleanupTestData;