const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../../server/data/totem.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Create a default household
    db.run("INSERT INTO households (name) VALUES (?)", ["Wayne Manor"], function(err) {
        if (err) {
            console.error("Error creating household:", err.message);
            db.close();
            return;
        }
        const hhId = this.lastID;
        console.log(`Created default household with ID: ${hhId}`);
        db.close();
    });
});
