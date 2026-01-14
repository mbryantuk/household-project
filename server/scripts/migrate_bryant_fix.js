const sqlite3 = require('sqlite3').verbose();
const { globalDb } = require('../db');

const TARGET_HOUSEHOLD_ID = 1;
const USER_EMAIL = "mbryantuk@gmail.com";
const TARGET_USER_NAME = "Matt";

async function runMigrationFix() {
    console.log("🚀 Starting Bryant Household Fix Migration...");

    const get = (sql, params) => new Promise((res, rej) => globalDb.get(sql, params, (err, row) => err ? rej(err) : res(row)));
    const run = (sql, params) => new Promise((res, rej) => globalDb.run(sql, params, function(err) { err ? rej(err) : res(this); }));

    try {
        // 1. Verify Household ID 1 exists
        let household = await get("SELECT * FROM households WHERE id = ?", [TARGET_HOUSEHOLD_ID]);
        if (!household) {
            console.error(`❌ Household ID ${TARGET_HOUSEHOLD_ID} not found!`);
            return;
        }
        console.log(`✅ Targeted Household: '${household.name}' (ID: ${household.id})`);

        // 2. Find User 'Matt' or by Email
        let user = await get("SELECT * FROM users WHERE email = ? OR username = ? OR first_name = ?", [USER_EMAIL, TARGET_USER_NAME, TARGET_USER_NAME]);
        let userId;

        if (user) {
            console.log(`✅ Found User '${user.username || user.first_name}' (ID: ${user.id})`);
            userId = user.id;
            
            // Update Email
            if (user.email !== USER_EMAIL) {
                console.log(`✏️ Updating email to ${USER_EMAIL}...`);
                await run("UPDATE users SET email = ? WHERE id = ?", [USER_EMAIL, userId]);
            }
        } else {
            // Should exist from previous run, but just in case
            console.log(`⚡ Creating User '${TARGET_USER_NAME}'...`);
            const bcrypt = require('bcryptjs');
            const hash = bcrypt.hashSync('password', 8);
            const res = await run(
                "INSERT INTO users (username, first_name, email, password_hash, default_household_id) VALUES (?, ?, ?, ?, ?)", 
                [TARGET_USER_NAME, TARGET_USER_NAME, USER_EMAIL, hash, TARGET_HOUSEHOLD_ID]
            );
            userId = res.lastID;
        }

        // 3. Link User to Household 1
        // Check if link exists
        const link = await get("SELECT * FROM user_households WHERE user_id = ? AND household_id = ?", [userId, TARGET_HOUSEHOLD_ID]);
        if (link) {
            console.log(`✅ User already linked to Household ${TARGET_HOUSEHOLD_ID}. Updating role to Admin.`);
            await run("UPDATE user_households SET role = 'admin' WHERE user_id = ? AND household_id = ?", [userId, TARGET_HOUSEHOLD_ID]);
        } else {
            console.log(`🔗 Linking User ${userId} to Household ${TARGET_HOUSEHOLD_ID}...`);
            await run("INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')", [userId, TARGET_HOUSEHOLD_ID]);
        }

        // 4. Set Default Household
        await run("UPDATE users SET default_household_id = ? WHERE id = ?", [TARGET_HOUSEHOLD_ID, userId]);
        console.log("✅ Set default household to ID 1.");

        console.log("🎉 Fix Complete!");

    } catch (err) {
        console.error("❌ Fix Failed:", err);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}

runMigrationFix();
