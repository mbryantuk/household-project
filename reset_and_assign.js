const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const dbPath = path.join(__dirname, 'server/data/totem.db');
const db = new sqlite3.Database(dbPath);

const email = 'mbryantuk@gmail.com';
const newPassword = 'newpassword123';
const memberHhId = 25; // The Updated Manor
const viewerHhId = 289; // Matrix Alpha

const hash = bcrypt.hashSync(newPassword, 8);

db.serialize(() => {
    // 1. Reset Password
    db.run("UPDATE users SET password_hash = ? WHERE email = ?", [hash, email], function(err) {
        if (err) console.error("Error resetting password:", err.message);
        else console.log(`Password reset for ${email}. Changes: ${this.changes}`);
    });

    // 2. Get User ID
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
        if (err || !user) {
            console.error("User not found");
            return;
        }
        const userId = user.id;

        // 3. Assign as Member to HH 25
        db.run("INSERT OR REPLACE INTO user_households (user_id, household_id, role) VALUES (?, ?, 'member')", [userId, memberHhId], function(err) {
            if (err) console.error("Error assigning member:", err.message);
            else console.log(`Assigned User ${userId} to HH ${memberHhId} as Member`);
        });

        // 4. Assign as Viewer to HH 289
        db.run("INSERT OR REPLACE INTO user_households (user_id, household_id, role) VALUES (?, ?, 'viewer')", [userId, viewerHhId], function(err) {
            if (err) console.error("Error assigning viewer:", err.message);
            else console.log(`Assigned User ${userId} to HH ${viewerHhId} as Viewer`);
            db.close();
        });
    });
});
