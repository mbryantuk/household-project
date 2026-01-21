const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../server/data/household_19.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- RECURRING COSTS SCHEMA ---");
    db.all("PRAGMA table_info(recurring_costs)", [], (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });

    console.log("--- RECURRING COSTS DATA ---");
    db.all("SELECT * FROM recurring_costs", [], (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });
});

db.close();