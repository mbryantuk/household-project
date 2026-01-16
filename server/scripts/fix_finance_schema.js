const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');

console.log(`🔧 Scanning ${DATA_DIR} for databases...`);

const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.db') || f === 'totem.db');

files.forEach(file => {
    const dbPath = path.join(DATA_DIR, file);
    console.log(`\nProcessing ${file}...`);
    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        // 1. Ensure Table Exists (for totem.db or fresh ones)
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
        
        db.run(CREATE_SQL, (err) => {
            if (!err) {
                // 2. Migrate Columns (for existing tables)
                const financeCols = [
                    ['member_id', 'INTEGER'], 
                    ['bank_account_id', 'INTEGER'], 
                    ['employer', 'TEXT'], 
                    ['role', 'TEXT'], 
                    ['employment_type', 'TEXT'],
                    ['work_type', 'TEXT'], 
                    ['gross_annual_salary', 'REAL'], 
                    ['addons', 'TEXT']
                ];
                
                financeCols.forEach(([col, type]) => {
                    db.run(`ALTER TABLE finance_income ADD COLUMN ${col} ${type}`, (alterErr) => {
                        if (!alterErr) console.log(`   + Added ${col}`);
                        // else console.log(`   = ${col} exists or error: ${alterErr.message}`);
                    });
                });
            } else {
                console.error("   Create Error:", err.message);
            }
        });
    });
    
    db.close();
});
