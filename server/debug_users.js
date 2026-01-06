const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'global_system.db');
const db = new sqlite3.Database(dbPath);

const householdId = 1; // Change this if checking a different household

console.log(`--- Checking Users in Household ${householdId} ---`);

const sql = `
    SELECT users.username, user_households.role 
    FROM user_households 
    JOIN users ON user_households.user_id = users.id 
    WHERE household_id = ?
`;

db.all(sql, [householdId], (err, rows) => {
    if (err) console.error(err);
    else {
        if (rows.length === 0) console.log("No users found in this household!");
        else console.table(rows);
    }
});