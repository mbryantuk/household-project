const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const dbPath = path.join(__dirname, '../../server/data/totem.db');
const db = new sqlite3.Database(dbPath);

const email = 'mbryantuk@gmail.com';
const username = 'mbryantuk';
const password = 'StandardPassword123!';
const householdId = 1;
const role = 'admin';

const hash = bcrypt.hashSync(password, 8);

db.serialize(() => {
    // 1. Check if user already exists
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
        if (err) {
            console.error("Error checking user:", err.message);
            db.close();
            return;
        }

        if (user) {
            console.log(`User ${email} already exists. Updating password and assigning to household.`);
            updateUser(user.id);
        } else {
            console.log(`Creating user ${email}...`);
            createUser();
        }
    });

    function createUser() {
        db.run(
            "INSERT INTO users (email, username, password_hash, first_name, last_name, system_role, default_household_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [email, username, hash, 'Matt', 'Bryant', 'user', householdId],
            function(err) {
                if (err) {
                    console.error("Error creating user:", err.message);
                    db.close();
                    return;
                }
                const userId = this.lastID;
                console.log(`User created with ID: ${userId}`);
                assignToHousehold(userId);
            }
        );
    }

    function updateUser(userId) {
        db.run(
            "UPDATE users SET password_hash = ?, default_household_id = ? WHERE id = ?",
            [hash, householdId, userId],
            function(err) {
                if (err) {
                    console.error("Error updating user:", err.message);
                    db.close();
                    return;
                }
                assignToHousehold(userId);
            }
        );
    }

    function assignToHousehold(userId) {
        db.run(
            "INSERT OR REPLACE INTO user_households (user_id, household_id, role) VALUES (?, ?, ?)",
            [userId, householdId, role],
            function(err) {
                if (err) {
                    console.error("Error assigning user to household:", err.message);
                } else {
                    console.log(`User ${userId} assigned to household ${householdId} as ${role}.`);
                }
                db.close();
            }
        );
    }
});
