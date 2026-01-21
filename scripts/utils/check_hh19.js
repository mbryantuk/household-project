const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const globalDbPath = path.join(__dirname, '../../server/data/totem.db');
const globalDb = new sqlite3.Database(globalDbPath);

globalDb.serialize(() => {
    console.log("--- USER HOUSEHOLDS FOR HH 19 ---");
    globalDb.all("SELECT * FROM user_households WHERE household_id = 19", [], (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });

    console.log("--- USERS ---");
    globalDb.all("SELECT id, email, username, system_role, is_active FROM users", [], (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });
});

globalDb.close();
