const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'server/data/totem.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, email, username, system_role FROM users", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
