const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../server/data/global.db');
const db = new sqlite3.Database(DB_PATH);

const DEFAULT_LAYOUT = [
  { i: 'clock-1', x: 0, y: 0, w: 4, h: 4, type: 'clock' },
  { i: 'budget-1', x: 4, y: 0, w: 4, h: 5, type: 'budget_status' },
  { i: 'wealth-1', x: 8, y: 0, w: 4, h: 7, type: 'wealth' },
  { i: 'income-1', x: 0, y: 4, w: 4, h: 4, type: 'income' },
  { i: 'banking-1', x: 4, y: 5, w: 4, h: 4, type: 'banking' },
  { i: 'savings-1', x: 8, y: 7, w: 4, h: 4, type: 'savings' },
  { i: 'calendar-1', x: 0, y: 8, w: 8, h: 8, type: 'calendar' },
  { i: 'notes-1', x: 8, y: 11, w: 4, h: 8, type: 'notes' },
  { i: 'credit-1', x: 0, y: 16, w: 4, h: 4, type: 'credit' },
  { i: 'loans-1', x: 4, y: 16, w: 4, h: 4, type: 'loans' },
  { i: 'mortgage-1', x: 8, y: 19, w: 4, h: 4, type: 'mortgage' },
  { i: 'pensions-1', x: 0, y: 20, w: 4, h: 4, type: 'pensions' },
  { i: 'vehicles-1', x: 4, y: 20, w: 4, h: 4, type: 'vehicles' },
  { i: 'carfin-1', x: 8, y: 23, w: 4, h: 4, type: 'carfin' },
  { i: 'birthdays-1', x: 0, y: 24, w: 4, h: 4, type: 'birthdays' },
];

const layoutJson = JSON.stringify({ 1: DEFAULT_LAYOUT });

console.log("🛠️ Migrating all users to new Bento Box Dashboard layout...");

db.serialize(() => {
    db.run("UPDATE users SET dashboard_layout = ?", [layoutJson], function(err) {
        if (err) console.error("Migration Error:", err.message);
        else console.log(`✅ Successfully updated ${this.changes} users to new layout.`);
        db.close();
    });
});
