const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'server', 'data', 'totem.db');
const db = new sqlite3.Database(dbPath);

const tablesToKeep = ['users', 'households', 'user_households', 'sqlite_sequence'];

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    
    rows.forEach(row => {
        if (!tablesToKeep.includes(row.name)) {
            console.log(`Dropping table ${row.name} from totem.db...`);
            db.run(`DROP TABLE IF EXISTS ${row.name}`);
        }
    });
    
    db.close(() => {
        console.log("Cleanup complete.");
    });
});
