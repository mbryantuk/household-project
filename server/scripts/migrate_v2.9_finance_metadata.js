const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');

function migrate() {
    console.log("🚀 Starting Migration: v2.9 Finance Metadata Expansion...");

    const files = fs.readdirSync(dataDir).filter(f => f.startsWith('household_') && f.endsWith('.db'));

    files.forEach(file => {
        const dbPath = path.join(dataDir, file);
        console.log(`Processing ${file}...`);
        const db = new sqlite3.Database(dbPath);

        db.serialize(() => {
            // 1. Create finance_agreements if missing
            db.run(`CREATE TABLE IF NOT EXISTS finance_agreements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                household_id INTEGER,
                provider TEXT,
                agreement_name TEXT,
                account_number TEXT,
                total_amount REAL,
                remaining_balance REAL,
                monthly_payment REAL,
                interest_rate REAL,
                start_date DATE,
                end_date DATE,
                emoji TEXT,
                notes TEXT
            )`);

            // 2. Add 'account_number' to multiple tables
            ['finance_credit_cards', 'finance_loans', 'finance_mortgages'].forEach(table => {
                db.run(`ALTER TABLE ${table} ADD COLUMN account_number TEXT`, (err) => {});
            });

            // 3. Expand vehicle_finance
            db.run(`ALTER TABLE vehicle_finance ADD COLUMN total_amount REAL`, (err) => {});
            db.run(`ALTER TABLE vehicle_finance ADD COLUMN remaining_balance REAL`, (err) => {});
            db.run(`ALTER TABLE vehicle_finance ADD COLUMN interest_rate REAL`, (err) => {});
            db.run(`ALTER TABLE vehicle_finance ADD COLUMN emoji TEXT`, (err) => {});
        });

        db.close();
    });
}

migrate();