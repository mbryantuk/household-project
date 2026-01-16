const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/totem.db');
const db = new sqlite3.Database(DB_PATH);

console.log(`🔧 Re-creating finance_income in ${DB_PATH}...`);

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS finance_income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER,
    member_id INTEGER,
    bank_account_id INTEGER,
    employer TEXT,
    role TEXT,
    employment_type TEXT,
    work_type TEXT,
    gross_annual_salary REAL,
    addons TEXT,
    amount REAL,
    frequency TEXT,
    payment_day INTEGER,
    emoji TEXT,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE SET NULL,
    FOREIGN KEY(bank_account_id) REFERENCES finance_current_accounts(id) ON DELETE SET NULL
)`;

db.serialize(() => {
    db.run(CREATE_SQL, (err) => {
        if (err) console.error("Create Error:", err);
        else console.log("✅ Table created/ensured.");
    });
    
    // Also ensure current_accounts
    db.run(`CREATE TABLE IF NOT EXISTS finance_current_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        bank_name TEXT,
        account_name TEXT,
        account_number TEXT,
        sort_code TEXT,
        overdraft_limit REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        emoji TEXT,
        notes TEXT
    )`, (err) => {
         if (err) console.error("Error ensuring finance_current_accounts:", err);
         else console.log("✅ finance_current_accounts check passed.");
    });
});

setTimeout(() => {
    db.close(() => console.log("🏁 Done."));
}, 1000);