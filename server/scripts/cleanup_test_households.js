const fs = require('fs');
const path = require('path');
const { globalDb, dbAll, dbRun } = require('../db');

const DATA_DIR = path.join(__dirname, '../data');

async function cleanupTestHouseholds() {
    console.log("🧹 Starting Test Household Cleanup...");

    try {
        // 1. Find all test households
        const households = await dbAll(globalDb, `SELECT id, name FROM households WHERE is_test = 1`);
        
        if (households.length === 0) {
            console.log("✨ No test households found to delete.");
            return;
        }

        console.log(`Found ${households.length} test households to delete.`);
        const ids = households.map(h => h.id);
        const placeholders = ids.map(() => '?').join(',');

        // 2. Delete from Global DB
        await dbRun(globalDb, `DELETE FROM user_households WHERE household_id IN (${placeholders})`, ids);
        await dbRun(globalDb, `DELETE FROM households WHERE id IN (${placeholders})`, ids);
        console.log("✅ Removed records from Global DB.");

        // 3. Delete DB Files
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

    } catch (err) {
        console.error("❌ Cleanup Failed:", err);
    }
}

cleanupTestHouseholds();