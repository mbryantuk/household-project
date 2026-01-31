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
        // 1. IDENTIFY TEST HOUSEHOLDS TO KEEP
        // ==========================================
        // We want ONLY the absolute latest of each core test type
        const testTypes = ['Smoke Test %', 'Routing Test %', 'Brady Family %'];
        const keepIds = [PERMANENT_HOUSEHOLD_ID];
        const preservedNames = [];

        for (const pattern of testTypes) {
            const latest = await dbGet(globalDb, `
                SELECT id, name FROM households 
                WHERE name LIKE ? 
                ORDER BY id DESC LIMIT 1
            `, [pattern]);
            
            if (latest) {
                keepIds.push(latest.id);
                preservedNames.push(latest.name);
            }
        }

        // AGGRESSIVE: We no longer keep "others". We purge EVERYTHING else.
        
        console.log(`📍 Preserving specific test targets: ${preservedNames.join(', ')}`);
        console.log(`📍 Total test households preserved: ${keepIds.join(', ')}`);

        // ==========================================
        // 2. DELETE ALL OTHER TEST HOUSEHOLDS
        // ==========================================
        const placeholders = keepIds.map(() => '?').join(',');
        const householdsToDelete = await dbAll(globalDb, `
            SELECT id FROM households 
            WHERE (is_test = 1 OR name LIKE 'Smoke Test %' OR name LIKE 'Routing Test %' OR name LIKE 'Brady Family %' OR name LIKE 'Meal%')
            AND id NOT IN (${placeholders})
        `, keepIds);
        
        if (householdsToDelete.length > 0) {
            const deleteIds = householdsToDelete.map(h => h.id);
            const delPlaceholders = deleteIds.map(() => '?').join(',');

            await dbRun(globalDb, `DELETE FROM user_households WHERE household_id IN (${delPlaceholders})`, deleteIds);
            await dbRun(globalDb, `DELETE FROM households WHERE id IN (${delPlaceholders})`, deleteIds);
            console.log(`✅ Deleted ${householdsToDelete.length} old test household records.`);
        }

        // ==========================================
        // 3. PURGE ORPHAN TEST USERS
        // ==========================================
        // We delete users who are marked as test OR have test-prefixed emails,
        // EXCEPT for the MAINTAINED_USER_EMAIL.
        const testUserPatterns = ['ephemeral%', 'mike%', 'carol%', 'greg%', 'marcia%', 'peter%', 'jan%', 'bobby%', 'cindy%', 'smoke%', 'routing%', 'brady%', 'test%'];
        const userDelPlaceholders = testUserPatterns.map(() => 'email LIKE ?').join(' OR ');
        
        await dbRun(globalDb, `
            DELETE FROM users 
            WHERE (is_test = 1 OR ${userDelPlaceholders}) 
            AND email != ?
        `, [...testUserPatterns, MAINTAINED_USER_EMAIL]);
        console.log(`✅ Purged orphan test user accounts.`);

        // ==========================================
        // 4. FILE CLEANUP
        // ==========================================
        const cleanupDirs = [DATA_DIR, BACKUP_DIR, path.join(DATA_DIR, 'temp_uploads')];
        let deletedFiles = 0;

        const scanAndRemove = (dir) => {
            if (!fs.existsSync(dir)) return;
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    scanAndRemove(fullPath);
                } else {
                    const match = item.match(/^household_(\d+)\.db/);
                    if (match) {
                        const id = parseInt(match[1]);
                        if (!keepIds.includes(id)) {
                            try {
                                fs.unlinkSync(fullPath);
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
        console.log(`✅ Purged ${deletedFiles} orphan database files.`);

        // ==========================================
        // 4. RESTORE ACCESS TO ALL PRESERVED TEST HOUSEHOLDS
        // ==========================================
        const targetUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [MAINTAINED_USER_EMAIL]);
        
        if (targetUser) {
            for (const hhId of keepIds) {
                const existingLink = await dbGet(globalDb, 
                    `SELECT * FROM user_households WHERE user_id = ? AND household_id = ?`, 
                    [targetUser.id, hhId]
                );

                if (!existingLink) {
                    await dbRun(globalDb, 
                        `INSERT INTO user_households (user_id, household_id, role, is_active) VALUES (?, ?, 'admin', 1)`,
                        [targetUser.id, hhId]
                    );
                } else {
                    await dbRun(globalDb, 
                        `UPDATE user_households SET role = 'admin', is_active = 1 WHERE user_id = ? AND household_id = ?`,
                        [targetUser.id, hhId]
                    );
                }
            }

            // Set the absolute latest one as the default landing spot
            const latestOverall = keepIds.filter(id => id !== PERMANENT_HOUSEHOLD_ID)[0];
            if (latestOverall) {
                await dbRun(globalDb, `UPDATE users SET default_household_id = ?, last_household_id = ? WHERE id = ?`, [latestOverall, latestOverall, targetUser.id]);
            }
            
            console.log(`🔗 Refreshed links for ${MAINTAINED_USER_EMAIL}. Access granted to ${keepIds.length} households.`);
        }

    } catch (err) {
        console.error("❌ Cleanup Failed:", err);
    }
}

if (require.main === module) {
    cleanupTestData().then(() => process.exit(0));
}

module.exports = cleanupTestData;
