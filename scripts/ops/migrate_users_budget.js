const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../server/data/global.db');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found at ${DB_PATH}`);
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  console.log('Adding budget_settings to users table...');
  db.run("ALTER TABLE users ADD COLUMN budget_settings TEXT DEFAULT '{}'", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Column budget_settings already exists.');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('Column budget_settings added successfully.');
    }
  });
});

db.close();
