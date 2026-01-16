const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/totem.db');
const db = new sqlite3.Database(DB_PATH);

console.log(`🔍 Checking finance_income columns in ${DB_PATH}...`);

db.all("PRAGMA table_info(finance_income)", (err, rows) => {
    if (err) {
        console.error("Error:", err);
        process.exit(1);
    }
    console.table(rows);
    const columns = rows.map(r => r.name);
    console.log("Column List:", columns.join(', '));
    
    // Check specifically for requested fields
    const required = ['employer', 'role', 'employment_type', 'gross_annual_salary', 'member_id'];
    const missing = required.filter(c => !columns.includes(c));
    
    if (missing.length > 0) {
        console.error("❌ MISSING COLUMNS:", missing.join(', '));
    } else {
        console.log("✅ All required columns present.");
    }
});
