const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/totem.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    db.all("SELECT id, username, system_role FROM users", [], (err, rows) => {
        if (err) {
            console.error("Error:", err.message);
        } else {
            console.table(rows);
        }
        db.close();
    });
});
