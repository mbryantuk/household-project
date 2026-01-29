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
        // Keep the last 5 test households to ensure "Mega House" isn't buried by small integration tests
        // Also look for names that match our smoke test prefix in case is_test wasn't set
        const testHouseholds = await dbAll(globalDb, `
            SELECT id, name FROM households 
            WHERE is_test = 1 OR name LIKE 'Mega House %' OR name LIKE 'Route Test House %'
            ORDER BY id DESC LIMIT 5
        `);
        const testIds = testHouseholds.map(h => h.id);
        
        // Specifically identify the latest "Mega House" for user redirection
        const megaHouse = testHouseholds.find(h => h.name.includes('Mega House'));
        const latestId = testIds.length > 0 ? testIds[0] : null;
        const targetHhId = megaHouse ? megaHouse.id : latestId;

        if (testIds.length > 0) {
            console.log(`📍 Test households preserved: ${testIds.join(', ')}`);
            if (megaHouse) console.log(`🎯 Targeted Mega House for access: #${megaHouse.id}`);
        } else {
            console.log("📍 No test households found to preserve.");
        }

        // ==========================================
        // 2. DELETE ALL OTHER TEST HOUSEHOLDS
        // ==========================================
        const keepIds = [PERMANENT_HOUSEHOLD_ID, ...testIds];
        const placeholders = keepIds.map(() => '?').join(',');
        
        const householdsToDelete = await dbAll(globalDb, `
            SELECT id FROM households 
            WHERE is_test = 1 AND id NOT IN (${placeholders})
        `, keepIds);
        
        if (householdsToDelete.length > 0) {
            const deleteIds = householdsToDelete.map(h => h.id);
            const delPlaceholders = deleteIds.map(() => '?').join(',');

            await dbRun(globalDb, `DELETE FROM user_households WHERE household_id IN (${delPlaceholders})`, deleteIds);
            await dbRun(globalDb, `DELETE FROM households WHERE id IN (${delPlaceholders})`, deleteIds);
            console.log(`✅ Deleted ${householdsToDelete.length} old test household records.`);
        }

        // ==========================================
        // 3. FILE CLEANUP
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
        // 4. RESTORE ACCESS
        // ==========================================
        const targetUser = await dbGet(globalDb, `SELECT id FROM users WHERE email = ?`, [MAINTAINED_USER_EMAIL]);
        
        if (targetUser && targetHhId) {
            const existingLink = await dbGet(globalDb, 
                `SELECT * FROM user_households WHERE user_id = ? AND household_id = ?`, 
                [targetUser.id, targetHhId]
            );

            if (!existingLink) {
                await dbRun(globalDb, 
                    `INSERT INTO user_households (user_id, household_id, role, is_active) VALUES (?, ?, 'admin', 1)`,
                    [targetUser.id, targetHhId]
                );
            } else {
                await dbRun(globalDb, 
                    `UPDATE user_households SET role = 'admin', is_active = 1 WHERE user_id = ? AND household_id = ?`,
                    [targetUser.id, targetHhId]
                );
            }

            await dbRun(globalDb, `UPDATE users SET default_household_id = ?, last_household_id = ? WHERE id = ?`, [targetHhId, targetHhId, targetUser.id]);
            console.log(`🔗 Linked ${MAINTAINED_USER_EMAIL} to latest valid test household #${targetHhId}.`);
        }

    } catch (err) {
        console.error("❌ Cleanup Failed:", err);
    }
}

if (require.main === module) {
    cleanupTestData().then(() => process.exit(0));
}

module.exports = cleanupTestData;
