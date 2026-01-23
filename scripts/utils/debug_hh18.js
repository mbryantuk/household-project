const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../server/data/household_18.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Recurring Costs (TV Licence) ---");
    db.all("SELECT id, name, parent_type, parent_id, amount FROM recurring_costs WHERE name LIKE '%TV Licence%'", (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });

    console.log("\n--- Assets (TV) ---");
    db.all("SELECT id, name, category FROM assets WHERE name LIKE '%TV%'", (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });
});

db.close();

