const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const dbPath = path.join(__dirname, '../../server/data/global.db');
const db = new sqlite3.Database(dbPath);

const email = 'mbryantuk@gmail.com';
const username = 'mbryantuk';
const password = 'StandardPassword123!';
const householdName = 'Bryant Manor';
const role = 'admin';

const hash = bcrypt.hashSync(password, 8);

db.serialize(() => {
    // 1. Ensure Household exists
    db.get("SELECT id FROM households WHERE name = ?", [householdName], (err, hh) => {
        if (err) { console.error(err); db.close(); return; }
        
        if (hh) {
            console.log(`Household ${householdName} exists with ID: ${hh.id}`);
            processUser(hh.id);
        } else {
            console.log(`Creating household ${householdName}...`);
            db.run("INSERT INTO households (name) VALUES (?)", [householdName], function(err) {
                if (err) { console.error(err); db.close(); return; }
                console.log(`Household created with ID: ${this.lastID}`);
                processUser(this.lastID);
            });
        }
    });

    function processUser(householdId) {
        db.get("SELECT id FROM users WHERE email = ?", [email], (err, user) => {
            if (err) { console.error(err); db.close(); return; }

            if (user) {
                console.log(`User ${email} exists. Updating...`);
                db.run(
                    "UPDATE users SET password_hash = ?, default_household_id = ? WHERE id = ?",
                    [hash, householdId, user.id],
                    (err) => {
                        if (err) console.error(err);
                        assignToHousehold(user.id, householdId);
                    }
                );
            } else {
                console.log(`Creating user ${email}...`);
                db.run(
                    "INSERT INTO users (email, username, password_hash, first_name, last_name, system_role, default_household_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [email, username, hash, 'Matt', 'Bryant', 'user', householdId],
                    function(err) {
                        if (err) { console.error(err); db.close(); return; }
                        assignToHousehold(this.lastID, householdId);
                    }
                );
            }
        });
    }

    function assignToHousehold(userId, householdId) {
        db.run(
            "INSERT OR REPLACE INTO user_households (user_id, household_id, role, is_active) VALUES (?, ?, ?, 1)",
            [userId, householdId, role],
            (err) => {
                if (err) console.error(err);
                else console.log(`User assigned to ${householdName} as ${role}`);
                db.close();
            }
        );
    }
});