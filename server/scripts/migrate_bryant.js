const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { globalDb } = require('../db');

const HOUSEHOLD_NAME = "Bryant Household";
const USER_EMAIL = "mbryantuk@gmail.com";
const TARGET_USER_NAME = "Matt";

async function runMigration() {
    console.log("🚀 Starting Bryant Household Migration...");

    const get = (sql, params) => new Promise((res, rej) => globalDb.get(sql, params, (err, row) => err ? rej(err) : res(row)));
    const run = (sql, params) => new Promise((res, rej) => globalDb.run(sql, params, function(err) { err ? rej(err) : res(this); }));

    try {
        // 1. Find or Create Household
        let household = await get("SELECT * FROM households WHERE name = ?", [HOUSEHOLD_NAME]);
        let householdId;

        if (household) {
            console.log(`✅ Found existing '${HOUSEHOLD_NAME}' (ID: ${household.id})`);
            householdId = household.id;
        } else {
            console.log(`⚡ Creating '${HOUSEHOLD_NAME}'...`);
            const res = await run("INSERT INTO households (name, theme) VALUES (?, 'default')", [HOUSEHOLD_NAME]);
            householdId = res.lastID;
            console.log(`✅ Created '${HOUSEHOLD_NAME}' (ID: ${householdId})`);
        }

        // 2. Find or Create User 'Matt'
        // Search by username 'Matt' or email 'mbryantuk@gmail.com'
        let user = await get("SELECT * FROM users WHERE email = ? OR username = ? OR first_name = ?", [USER_EMAIL, TARGET_USER_NAME, TARGET_USER_NAME]);
        let userId;

        if (user) {
            console.log(`✅ Found User '${user.username || user.first_name}' (ID: ${user.id})`);
            userId = user.id;
            
            // Update Email if different
            if (user.email !== USER_EMAIL) {
                console.log(`✏️ Updating email to ${USER_EMAIL}...`);
                await run("UPDATE users SET email = ? WHERE id = ?", [USER_EMAIL, userId]);
            }
        } else {
            console.log(`⚡ Creating User '${TARGET_USER_NAME}'...`);
            // Create with a default password (e.g., 'password') - user should reset
            const bcrypt = require('bcryptjs');
            const hash = bcrypt.hashSync('password', 8);
            
            const res = await run(
                "INSERT INTO users (username, first_name, email, password_hash, default_household_id) VALUES (?, ?, ?, ?, ?)", 
                [TARGET_USER_NAME, TARGET_USER_NAME, USER_EMAIL, hash, householdId]
            );
            userId = res.lastID;
            console.log(`✅ Created User '${TARGET_USER_NAME}' (ID: ${userId})`);
        }

        // 3. Link User to Household
        const link = await get("SELECT * FROM user_households WHERE user_id = ? AND household_id = ?", [userId, householdId]);
        if (!link) {
            console.log(`🔗 Linking User ${userId} to Household ${householdId}...`);
            await run("INSERT INTO user_households (user_id, household_id, role) VALUES (?, ?, 'admin')", [userId, householdId]);
            console.log("✅ Link created.");
        } else {
            console.log("✅ User already linked to household.");
        }

        // 4. Ensure User has default household set
        if (user && user.default_household_id !== householdId) {
             await run("UPDATE users SET default_household_id = ? WHERE id = ?", [householdId, userId]);
             console.log("✅ Set default household.");
        }

        console.log("🎉 Migration Complete!");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        // We don't close globalDb here as it might be shared, but in a script it's fine.
        // However, require('../db') opens it. 
        // Force exit after a moment
        setTimeout(() => process.exit(0), 1000);
    }
}

runMigration();
