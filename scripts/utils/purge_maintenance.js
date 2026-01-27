const fs = require('fs');
const path = require('path');
const { globalDb, dbAll, dbRun } = require('../../server/db');

const DATA_DIR = path.join(__dirname, '../../server/data');

async function aggressivePurge() {
    console.log("🧨 Starting Aggressive System Purge (Preserving HH #60 and Global)...");

    try {
        // 1. Clean up Global DB records first
        const households = await dbAll(globalDb, `SELECT id FROM households WHERE id != 60`);
        const ids = households.map(h => h.id);
        
        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            await dbRun(globalDb, `DELETE FROM user_households WHERE household_id IN (${placeholders})`, ids);
            await dbRun(globalDb, `DELETE FROM households WHERE id IN (${placeholders})`, ids);
            console.log("✅ Removed stale records from Global DB.");
        }

        // 2. Remove orphaned users
        await dbRun(globalDb, `DELETE FROM users WHERE id NOT IN (SELECT user_id FROM user_households WHERE household_id = 60) AND id != 1`);
        console.log("✅ Cleaned up orphaned users.");

        // 3. Physical File Purge (The "Kitchen Sink" method)
        const files = fs.readdirSync(DATA_DIR);
        let deletedCount = 0;

        files.forEach(file => {
            const fullPath = path.join(DATA_DIR, file);
            
            // Skip directories (like temp_uploads)
            if (fs.lstatSync(fullPath).isDirectory()) return;

            // PRESERVATION LIST
            const isGlobal = file.startsWith('global.db');
            const isHH60 = file.startsWith('household_60.db');
            const isGitKeep = file === '.gitkeep';

            if (!isGlobal && !isHH60 && !isGitKeep) {
                try {
                    fs.unlinkSync(fullPath);
                    deletedCount++;
                } catch (e) {
                    console.error(`Could not delete ${file}:`, e.message);
                }
            }
        });

        console.log(`✅ Deleted ${deletedCount} auxiliary/stale files.`);
        
        await dbRun(globalDb, `VACUUM`);
        console.log("🧹 Database vacuumed.");

    } catch (err) {
        console.error("❌ Aggressive Purge Failed:", err);
    }
}

aggressivePurge().then(() => {
    console.log("🏁 Aggressive Cleanup Complete.");
    process.exit(0);
});