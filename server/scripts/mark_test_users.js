const { globalDb, dbRun, dbAll } = require('../db');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function markTestUsers() {
    console.log("⏳ Waiting for DB initialization...");
    await wait(2000); 
    
    console.log("🏷️  Marking Test Users...");

    try {
        // 1. Identify valid user IDs (those belonging to Household 18)
        const validUsers = await dbAll(globalDb, `SELECT user_id FROM user_households WHERE household_id = 18`);
        const validIds = validUsers.map(u => u.user_id);
        
        if (validIds.length === 0) {
            console.warn("⚠️  Warning: No users found in Household #18. Marking ALL users as test might be dangerous if you don't have other protected households.");
            // Default to protecting ID 1 if household 18 is empty, just in case
            validIds.push(1);
        }

        const validIdsStr = validIds.join(',');
        
        // 2. Update all users NOT in that list
        const result = await dbRun(globalDb, `UPDATE users SET is_test = 1 WHERE id NOT IN (${validIdsStr})`);
        
        console.log(`✅ Marked ${result.changes} users as TEST.`);
        
        // Verification
        const production = await dbAll(globalDb, `SELECT id, email FROM users WHERE is_test = 0`);
        console.log("🛡️  Protected Users:", production.map(u => `#${u.id} ${u.email}`));

    } catch (err) {
        console.error("❌ Marking Failed:", err);
    }
}

markTestUsers();