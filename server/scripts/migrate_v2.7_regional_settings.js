const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/totem.db');
const db = new sqlite3.Database(dbPath);

console.log("🚀 Starting v2.7 Regional Settings Migration...");

db.serialize(() => {
    // Add Regional Settings Columns
    db.run(`ALTER TABLE households ADD COLUMN timezone TEXT DEFAULT 'UTC'`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error("Error adding timezone:", err.message);
        else console.log("✅ Added 'timezone' column.");
    });

    db.run(`ALTER TABLE households ADD COLUMN language TEXT DEFAULT 'en-US'`, (err) => {
        if (err && !err.message.includes('duplicate column')) console.error("Error adding language:", err.message);
        else console.log("✅ Added 'language' column.");
    });
});

db.close(() => {
    console.log("🏁 Migration Complete.");
});
