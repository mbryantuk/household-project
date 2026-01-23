const fs = require('fs');
const path = require('path');
const { globalDb, dbAll, dbRun } = require('../db');

const DATA_DIR = path.join(__dirname, '../data');

async function cleanupTestData() {
    console.log("🧹 Starting Test Data Cleanup...");

    try {
        // ==========================================
        // 1. HOUSEHOLDS
        // ==========================================
        const households = await dbAll(globalDb, `SELECT id, name FROM households WHERE is_test = 1`);
        
        if (households.length > 0) {
            console.log(`Found ${households.length} test households to delete.`);
            const ids = households.map(h => h.id);
            const placeholders = ids.map(() => '?').join(',');

            // Delete from Global DB
            await dbRun(globalDb, `DELETE FROM user_households WHERE household_id IN (${placeholders})`, ids);
            await dbRun(globalDb, `DELETE FROM households WHERE id IN (${placeholders})`, ids);
            console.log("✅ Removed household records from Global DB.");

            // Delete DB Files
            let deletedFiles = 0;
            for (const hh of households) {
                const dbFile = path.join(DATA_DIR, `household_${hh.id}.db`);
                if (fs.existsSync(dbFile)) {
                    try {
                        fs.unlinkSync(dbFile);
                        deletedFiles++;
                    } catch (err) {
                        console.error(`Failed to delete file for HH #${hh.id}:`, err.message);
                    }
                }
            }
            console.log(`✅ Deleted ${deletedFiles} household database files.`);
        } else {
            console.log("✨ No test households found.");
        }

        // ==========================================
        // 2. USERS
        // ==========================================
        const users = await dbAll(globalDb, `SELECT id, email FROM users WHERE is_test = 1`);

        if (users.length > 0) {
            console.log(`Found ${users.length} test users to delete.`);
            const ids = users.map(u => u.id);
            const placeholders = ids.map(() => '?').join(',');

            // Delete from Global DB (Links should be gone if HHs are gone, but clean up stragglers)
            await dbRun(globalDb, `DELETE FROM user_households WHERE user_id IN (${placeholders})`, ids);
            await dbRun(globalDb, `DELETE FROM users WHERE id IN (${placeholders})`, ids);
            console.log("✅ Removed user records from Global DB.");
        } else {
            console.log("✨ No test users found.");
        }

    } catch (err) {
        console.error("❌ Cleanup Failed:", err);
    }
}

cleanupTestData();