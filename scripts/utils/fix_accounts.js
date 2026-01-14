const { globalDb } = require('./server/db');
const bcrypt = require('bcryptjs');

const hhId = 1;
const passwordHash = bcrypt.hashSync('password123', 8);

async function runSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        globalDb.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function getSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        globalDb.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function main() {
    try {
        console.log("Starting account adjustments...");

        // 1. Fix mbryantuk@gmail.com (ID 94)
        console.log("Ensuring mbryantuk@gmail.com is admin of HH 1...");
        await runSql("UPDATE users SET default_household_id = ? WHERE email = 'mbryantuk@gmail.com'", [hhId]);
        // Mapping already exists based on previous check, but let's ensure it's correct
        const existingMap = await getSql("SELECT * FROM user_households WHERE user_id = 94 AND household_id = ?", [hhId]);
        if (!existingMap) {
            await runSql("INSERT INTO user_households (user_id, household_id, role) VALUES (94, ?, 'admin')", [hhId]);
        } else {
            await runSql("UPDATE user_households SET role = 'admin' WHERE user_id = 94 AND household_id = ?", [hhId]);
        }

        // 2. Create/Fix glitter_toes@hotmail.com (Member)
        console.log("Setting up glitter_toes@hotmail.com as Member...");
        let userMember = await getSql("SELECT id FROM users WHERE email = 'glitter_toes@hotmail.com'");
        if (!userMember) {
            const res = await runSql("INSERT INTO users (email, password_hash, first_name, system_role, default_household_id) VALUES ('glitter_toes@hotmail.com', ?, 'Member', 'user', ?)", [passwordHash, hhId]);
            userMember = { id: res.lastID };
        }
        await runSql("INSERT OR REPLACE INTO user_households (user_id, household_id, role) VALUES (?, ?, 'member')", [userMember.id, hhId]);

        // 3. Create/Fix willowfbryant@gmail.com (Viewer)
        console.log("Setting up willowfbryant@gmail.com as Viewer...");
        let userViewer = await getSql("SELECT id FROM users WHERE email = 'willowfbryant@gmail.com'");
        if (!userViewer) {
            const res = await runSql("INSERT INTO users (email, password_hash, first_name, system_role, default_household_id) VALUES ('willowfbryant@gmail.com', ?, 'Viewer', 'user', ?)", [passwordHash, hhId]);
            userViewer = { id: res.lastID };
        }
        await runSql("INSERT OR REPLACE INTO user_households (user_id, household_id, role) VALUES (?, ?, 'viewer')", [userViewer.id, hhId]);

        console.log("Account adjustments complete!");
    } catch (err) {
        console.error("Error during adjustment:", err);
    } finally {
        globalDb.close();
    }
}

main();
