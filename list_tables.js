const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'server', 'data', 'totem.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log("Tables in totem.db:");
    rows.forEach(row => console.log("- " + row.name));
    db.close();
});
