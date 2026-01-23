const { globalDb, dbRun, dbAll } = require('../db');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function markTestHouseholds() {
    console.log("⏳ Waiting for DB initialization...");
    await wait(2000); // Allow db.js initGlobalDb to finish ALTER TABLE
    
    console.log("🏷️  Marking Test Households...");

    try {
        // Mark everything as test EXCEPT id 18 (and potentially 19 if it was a protected test one, but instruction said <> 18)
        // We will assume 18 is the PRODUCTION/GOLDEN household.
        const result = await dbRun(globalDb, `UPDATE households SET is_test = 1 WHERE id <> 18`);
        
        console.log(`✅ Marked ${result.changes} households as TEST.`);
        
        // Verification
        const production = await dbAll(globalDb, `SELECT id, name, is_test FROM households WHERE is_test = 0`);
        console.log("🛡️  Protected Households:", production.map(h => `#${h.id} ${h.name}`));

    } catch (err) {
        console.error("❌ Marking Failed:", err);
    }
}

markTestHouseholds();