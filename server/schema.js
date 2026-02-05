const GLOBAL_SCHEMA = [
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        username TEXT UNIQUE,
        password_hash TEXT,
        first_name TEXT,
        last_name TEXT,
        avatar TEXT,
        system_role TEXT DEFAULT 'user',
        dashboard_layout TEXT,
        sticky_note TEXT,
        budget_settings TEXT,
        theme TEXT DEFAULT 'totem',
        default_household_id INTEGER,
        last_household_id INTEGER,
        is_test INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        mfa_enabled INTEGER DEFAULT 0,
        mfa_secret TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        device_info TEXT,
        ip_address TEXT,
        user_agent TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_revoked INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_type TEXT, -- 'backend', 'frontend'
        suite_name TEXT,
        passes INTEGER,
        fails INTEGER,
        total INTEGER,
        duration REAL,
        report_json TEXT,
        version TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS version_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        address_street TEXT,
        address_city TEXT,
        address_zip TEXT,
        avatar TEXT,
        date_format TEXT DEFAULT 'DD/MM/YYYY',
        currency TEXT DEFAULT 'GBP',
        decimals INTEGER DEFAULT 2,
        enabled_modules TEXT DEFAULT '["pets", "vehicles", "meals"]',
        metadata_schema TEXT,
        auto_backup INTEGER DEFAULT 1,
        backup_retention INTEGER DEFAULT 7,
        is_test INTEGER DEFAULT 0,
        nightly_version_filter TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_households (
        user_id INTEGER,
        household_id INTEGER,
        role TEXT DEFAULT 'member',
        is_active INTEGER DEFAULT 1,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, household_id)
    )`
];

const TENANT_SCHEMA = [
    `CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT,
        first_name TEXT,
        middle_name TEXT,
        last_name TEXT,
        alias TEXT,
        type TEXT, -- adult, child, pet
        species TEXT, -- for pets
        emoji TEXT,
        color TEXT,
        dob TEXT, -- Encrypted
        birth_date DATE, -- Legacy/Plain
        will_details TEXT, -- Encrypted
        life_insurance_provider TEXT, -- Encrypted
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        make TEXT,
        model TEXT,
        registration TEXT, -- Encrypted
        type TEXT, -- Car, Van, etc.
        emoji TEXT,
        purchase_date DATE,
        purchase_value REAL,
        current_value REAL DEFAULT 0,
        replacement_cost REAL,
        monthly_maintenance_cost REAL,
        depreciation_rate REAL,
        mot_due DATE,
        tax_due DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vehicle_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        vehicle_id INTEGER,
        date DATE,
        description TEXT,
        cost REAL,
        mileage INTEGER,
        notes TEXT,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT,
        category TEXT,
        emoji TEXT,
        purchase_date DATE,
        purchase_value REAL,
        replacement_cost REAL,
        location TEXT,
        serial_number TEXT, -- Encrypted
        warranty_expiry DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS recurring_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        object_type TEXT, -- 'household', 'member', 'vehicle', 'asset', 'pet'
        object_id INTEGER,
        category_id TEXT, -- 'water', 'energy', 'council_tax', 'insurance', 'subscription', 'utility', 'service_plan', 'finance', 'mortgage', 'other'
        name TEXT,
        amount REAL,
        frequency TEXT, -- 'weekly', 'monthly', 'quarterly', 'yearly', 'one_off'
        start_date DATE,
        day_of_month INTEGER,
        month_of_year INTEGER,
        day_of_week INTEGER,
        adjust_for_working_day INTEGER DEFAULT 1,
        emoji TEXT,
        notes TEXT,
        metadata TEXT, -- JSON String
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        title TEXT,
        date DATE,
        end_date DATE,
        type TEXT, -- holiday, birthday, renewal, task
        parent_type TEXT,
        parent_id INTEGER,
        member_id INTEGER, -- Legacy
        is_all_day INTEGER DEFAULT 1,
        remind_days INTEGER DEFAULT 0,
        description TEXT,
        emoji TEXT,
        recurrence TEXT DEFAULT 'none',
        recurrence_end_date DATE
    )`,
    `CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT,
        description TEXT,
        emoji TEXT,
        category TEXT,
        last_prepared DATE
    )`,
    `CREATE TABLE IF NOT EXISTS meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        date DATE,
        member_id INTEGER,
        meal_id INTEGER,
        type TEXT DEFAULT 'dinner',
        servings INTEGER DEFAULT 1,
        notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS house_details (
        household_id INTEGER PRIMARY KEY,
        property_type TEXT,
        construction_year INTEGER,
        tenure TEXT,
        council_tax_band TEXT,
        broadband_provider TEXT,
        broadband_account TEXT,
        wifi_password TEXT,
        smart_home_hub TEXT,
        color TEXT,
        emergency_contacts TEXT,
        notes TEXT,
        enabled_modules TEXT,
        purchase_price REAL DEFAULT 0,
        current_valuation REAL DEFAULT 0
    )`,
    // FINANCE TABLES
    `CREATE TABLE IF NOT EXISTS finance_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT,
        is_default INTEGER DEFAULT 0,
        emoji TEXT DEFAULT '💰',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS finance_income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        member_id INTEGER, -- Assigned Person
        bank_account_id INTEGER, -- Linked Bank Account
        employer TEXT,
        role TEXT,
        employment_type TEXT, -- self_employed, contractor, employed, retired, unemployed
        work_type TEXT, -- full_time, part_time
        gross_annual_salary REAL,
        addons TEXT, -- JSON or text description of bonuses/stock
        amount REAL, -- Net amount received (Takehome)
        frequency TEXT, -- monthly, weekly, bi-weekly
        payment_day INTEGER,
        emoji TEXT,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        is_primary INTEGER DEFAULT 0,
        nearest_working_day INTEGER DEFAULT 1,
        FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE SET NULL,
        FOREIGN KEY(bank_account_id) REFERENCES finance_current_accounts(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS finance_savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        institution TEXT,
        account_name TEXT,
        account_number TEXT, -- Encrypted
        interest_rate REAL,
        current_balance REAL,
        emoji TEXT,
        notes TEXT,
        deposit_amount REAL DEFAULT 0,
        deposit_day INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS finance_savings_pots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        savings_id INTEGER,
        name TEXT,
        target_amount REAL,
        current_amount REAL,
        emoji TEXT,
        notes TEXT,
        FOREIGN KEY (savings_id) REFERENCES finance_savings(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS finance_current_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        bank_name TEXT,
        account_name TEXT,
        account_number TEXT, -- Encrypted
        sort_code TEXT, -- Encrypted
        overdraft_limit REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        emoji TEXT,
        notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS finance_credit_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        provider TEXT,
        card_name TEXT,
        account_number TEXT, -- Encrypted
        credit_limit REAL,
        current_balance REAL,
        apr REAL,
        payment_day INTEGER,
        emoji TEXT,
        notes TEXT,
        nearest_working_day INTEGER DEFAULT 1,
        parent_type TEXT DEFAULT 'general',
        parent_id INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS finance_pensions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        provider TEXT,
        plan_name TEXT,
        account_number TEXT, -- Encrypted
        type TEXT, -- SIPP, Workplace, etc.
        current_value REAL,
        monthly_contribution REAL,
        emoji TEXT,
        notes TEXT,
        payment_day INTEGER,
        nearest_working_day INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS finance_pensions_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pension_id INTEGER,
        value REAL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pension_id) REFERENCES finance_pensions(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS finance_investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT,
        symbol TEXT,
        platform TEXT,
        asset_type TEXT, -- Stocks, Crypto, Bonds
        units REAL,
        current_value REAL,
        total_invested REAL,
        emoji TEXT,
        notes TEXT,
        monthly_contribution REAL DEFAULT 0,
        payment_day INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS finance_budget_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT,
        monthly_limit REAL,
        emoji TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS finance_budget_progress (
        household_id INTEGER,
        financial_profile_id INTEGER,
        cycle_start DATE, -- The payday date starting this cycle
        item_key TEXT,    -- Format: 'type_id' e.g. 'mortgage_5'
        is_paid INTEGER DEFAULT 0,
        actual_amount REAL,
        actual_date DATE,
        PRIMARY KEY (household_id, financial_profile_id, cycle_start, item_key)
    )`,
    `CREATE TABLE IF NOT EXISTS finance_budget_cycles (
        household_id INTEGER,
        financial_profile_id INTEGER,
        cycle_start DATE, 
        actual_pay REAL,
        current_balance REAL,
        bank_account_id INTEGER,
        PRIMARY KEY (household_id, financial_profile_id, cycle_start),
        FOREIGN KEY(bank_account_id) REFERENCES finance_current_accounts(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS finance_assignments (
        household_id INTEGER,
        entity_type TEXT, -- income, savings, credit_card, loan, mortgage, pension, investment, current_account, agreement, vehicle_finance
        entity_id INTEGER,
        member_id INTEGER,
        PRIMARY KEY (entity_type, entity_id, member_id)
    )`
];

function initializeGlobalSchema(db) {
    db.serialize(() => {
        GLOBAL_SCHEMA.forEach(sql => {
            db.run(sql, (err) => {
                if (err && !err.message.includes('already exists')) {
                    console.error("Global Schema Init Error:", err.message);
                }
            });
        });

        // 🛠️ MIGRATION: Add budget_settings to users
        db.all("PRAGMA table_info(users)", (err, rows) => {
            if (err) return console.error("Failed to check users schema", err);
            const hasBudgetSettings = rows.some(r => r.name === 'budget_settings');
            if (!hasBudgetSettings) {
                console.log("🛠️ Migrating users table: Adding budget_settings...");
                db.run("ALTER TABLE users ADD COLUMN budget_settings TEXT", (err) => {
                    if (err) console.error("Migration failed:", err.message);
                    else console.log("✅ budget_settings column added.");
                });
            }
        });

        // 🛠️ MIGRATION: Add last_household_id to users
        db.all("PRAGMA table_info(users)", (err, rows) => {
            if (err) return console.error("Failed to check users schema", err);
            const hasLastHh = rows.some(r => r.name === 'last_household_id');
            if (!hasLastHh) {
                console.log("🛠️ Migrating users table: Adding last_household_id...");
                db.run("ALTER TABLE users ADD COLUMN last_household_id INTEGER", (err) => {
                    if (err) console.error("Migration failed:", err.message);
                    else console.log("✅ last_household_id column added.");
                });
            }
        });

        // 🛠️ MIGRATION: Add nightly_version_filter to households
        db.all("PRAGMA table_info(households)", (err, rows) => {
            if (err) return console.error("Failed to check households schema", err);
            const hasNightlyVersionFilter = rows.some(r => r.name === 'nightly_version_filter');
            if (!hasNightlyVersionFilter) {
                console.log("🛠️ Migrating households table: Adding nightly_version_filter...");
                db.run("ALTER TABLE households ADD COLUMN nightly_version_filter TEXT", (err) => {
                    if (err) console.error("Migration failed:", err.message);
                    else console.log("✅ nightly_version_filter column added.");
                });
            }
        });

        // 🛠️ MIGRATION: Add metadata_schema to households
        db.all("PRAGMA table_info(households)", (err, rows) => {
            if (err) return console.error("Failed to check households schema", err);
            const hasMetadataSchema = rows.some(r => r.name === 'metadata_schema');
            if (!hasMetadataSchema) {
                console.log("🛠️ Migrating households table: Adding metadata_schema...");
                db.run("ALTER TABLE households ADD COLUMN metadata_schema TEXT", (err) => {
                    if (err) console.error("Migration failed:", err.message);
                    else console.log("✅ metadata_schema column added.");
                });
            }
        });

        // 🛠️ MIGRATION: Add version to test_results
        db.all("PRAGMA table_info(test_results)", (err, rows) => {
            if (err) return console.error("Failed to check test_results schema", err);
            const hasVersion = rows.some(r => r.name === 'version');
            if (!hasVersion) {
                console.log("🛠️ Migrating test_results table: Adding version...");
                db.run("ALTER TABLE test_results ADD COLUMN version TEXT", (err) => {
                    if (err) console.error("Migration failed:", err.message);
                    else console.log("✅ version column added to test_results.");
                });
            }
        });

        // 🛠️ MIGRATION: Add MFA columns to users
        db.all("PRAGMA table_info(users)", (err, rows) => {
            if (err) return;
            if (!rows.some(r => r.name === 'mfa_enabled')) {
                console.log("🛠️ Migrating users: Adding mfa_enabled...");
                db.run("ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0");
            }
            if (!rows.some(r => r.name === 'mfa_secret')) {
                console.log("🛠️ Migrating users: Adding mfa_secret...");
                db.run("ALTER TABLE users ADD COLUMN mfa_secret TEXT");
            }
        });

        // 🛠️ MIGRATION: Ensure user_sessions exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'", (err, row) => {
            if (!row) {
                console.log("🛠️ Migrating global database: Adding user_sessions table...");
                db.run(`CREATE TABLE user_sessions (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER,
                    device_info TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    is_revoked INTEGER DEFAULT 0,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )`);
            }
        });

        // 🛠️ MIGRATION: Ensure version_history exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='version_history'", (err, row) => {
            if (!row) {
                console.log("🛠️ Migrating global database: Adding version_history table...");
                db.run(`CREATE TABLE version_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version TEXT,
                    comment TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);
            }
        });
    });
}

function initializeHouseholdSchema(db) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            TENANT_SCHEMA.forEach((sql, index) => {
                db.run(sql, (err) => {
                    if (err && !err.message.includes('already exists')) {
                        console.error("Household Schema Init Error:", err.message);
                    }
                    if (index === TENANT_SCHEMA.length - 1) {
                        // After last base table, run migrations
                        const additionalFinanceCols = [
                            ['finance_budget_progress', 'actual_amount', 'REAL'],
                            ['finance_budget_progress', 'actual_date', 'DATE'],
                            ['finance_pensions', 'payment_day', 'INTEGER'],
                            ['finance_income', 'nearest_working_day', 'INTEGER DEFAULT 1'],
                            ['finance_credit_cards', 'nearest_working_day', 'INTEGER DEFAULT 1'],
                            ['finance_pensions', 'nearest_working_day', 'INTEGER DEFAULT 1'],
                            ['house_details', 'purchase_price', 'REAL DEFAULT 0'],
                            ['house_details', 'current_valuation', 'REAL DEFAULT 0'],
                            ['finance_savings', 'deposit_amount', 'REAL DEFAULT 0'],
                            ['finance_savings', 'deposit_day', 'INTEGER'],
                            ['finance_investments', 'monthly_contribution', 'REAL DEFAULT 0'],
                            ['finance_investments', 'payment_day', 'INTEGER'],
                            ['finance_budget_cycles', 'bank_account_id', 'INTEGER'],
                            ['vehicles', 'current_value', 'REAL DEFAULT 0'],
                            ['recurring_costs', 'bank_account_id', 'INTEGER'],
                            ['finance_income', 'financial_profile_id', 'INTEGER'],
                            ['finance_current_accounts', 'financial_profile_id', 'INTEGER'],
                            ['finance_savings', 'financial_profile_id', 'INTEGER'],
                            ['finance_credit_cards', 'financial_profile_id', 'INTEGER'],
                            ['finance_pensions', 'financial_profile_id', 'INTEGER'],
                            ['finance_investments', 'financial_profile_id', 'INTEGER'],
                            ['recurring_costs', 'financial_profile_id', 'INTEGER']
                        ];

                        let migrationsDone = 0;
                        if (additionalFinanceCols.length === 0) resolve();

                        additionalFinanceCols.forEach(([table, col, type]) => {
                            db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, () => {
                                migrationsDone++;
                                if (migrationsDone === additionalFinanceCols.length) {
                                    // 🛠️ MIGRATION: Ensure Default Profile Exists and Backfill
                                    db.get("SELECT id FROM finance_profiles WHERE is_default = 1", (err, row) => {
                                        if (!row) {
                                            console.log("🛠️ Migrating: Creating Default Financial Profile...");
                                            db.run("INSERT INTO finance_profiles (household_id, name, is_default, emoji) VALUES (?, ?, 1, ?)", [1, "Joint Finances", "💰"], function(err) {
                                                if (!err && this.lastID) {
                                                    const defaultProfileId = this.lastID;
                                                    console.log(`✅ Default Profile Created (ID: ${defaultProfileId}). Backfilling data...`);
                                                    const tables = [
                                                        'finance_income', 'finance_current_accounts', 'finance_savings', 
                                                        'finance_credit_cards', 'finance_pensions', 'finance_investments', 
                                                        'recurring_costs'
                                                    ];
                                                    tables.forEach(t => {
                                                        db.run(`UPDATE ${t} SET financial_profile_id = ? WHERE financial_profile_id IS NULL`, [defaultProfileId]);
                                                    });

                                                    // 🛠️ MIGRATION: Recreate Budget Tables for Multi-Profile PK
                                                    db.all("PRAGMA table_info(finance_budget_cycles)", (err, info) => {
                                                        if (!info.some(c => c.name === 'financial_profile_id')) {
                                                            console.log("🛠️ Migrating: Recreating Budget Tables for Multi-Profile...");
                                                            db.serialize(() => {
                                                                db.all("SELECT * FROM finance_budget_cycles", [], (err, oldCycles) => {
                                                                    db.all("SELECT * FROM finance_budget_progress", [], (err, oldProgress) => {
                                                                        db.run("DROP TABLE IF EXISTS finance_budget_cycles");
                                                                        db.run("DROP TABLE IF EXISTS finance_budget_progress");
                                                                        
                                                                        db.run(`CREATE TABLE IF NOT EXISTS finance_budget_progress (
                                                                            household_id INTEGER,
                                                                            financial_profile_id INTEGER,
                                                                            cycle_start DATE,
                                                                            item_key TEXT,
                                                                            is_paid INTEGER DEFAULT 0,
                                                                            actual_amount REAL,
                                                                            actual_date DATE,
                                                                            PRIMARY KEY (household_id, financial_profile_id, cycle_start, item_key)
                                                                        )`);
                                                                        db.run(`CREATE TABLE IF NOT EXISTS finance_budget_cycles (
                                                                            household_id INTEGER,
                                                                            financial_profile_id INTEGER,
                                                                            cycle_start DATE, 
                                                                            actual_pay REAL,
                                                                            current_balance REAL,
                                                                            bank_account_id INTEGER,
                                                                            PRIMARY KEY (household_id, financial_profile_id, cycle_start),
                                                                            FOREIGN KEY(bank_account_id) REFERENCES finance_current_accounts(id) ON DELETE SET NULL
                                                                        )`);

                                                                        if (oldCycles && oldCycles.length > 0) {
                                                                            const stmtCyc = db.prepare("INSERT INTO finance_budget_cycles (household_id, financial_profile_id, cycle_start, actual_pay, current_balance, bank_account_id) VALUES (?, ?, ?, ?, ?, ?)");
                                                                            oldCycles.forEach(c => stmtCyc.run(c.household_id, defaultProfileId, c.cycle_start, c.actual_pay, c.current_balance, c.bank_account_id));
                                                                            stmtCyc.finalize();
                                                                        }

                                                                        if (oldProgress && oldProgress.length > 0) {
                                                                            const stmtProg = db.prepare("INSERT INTO finance_budget_progress (household_id, financial_profile_id, cycle_start, item_key, is_paid, actual_amount, actual_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
                                                                            oldProgress.forEach(p => stmtProg.run(p.household_id, defaultProfileId, p.cycle_start, p.item_key, p.is_paid, p.actual_amount, p.actual_date));
                                                                            stmtProg.finalize();
                                                                        }
                                                                        console.log("✅ Budget Tables Migrated.");
                                                                    });
                                                                });
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                    resolve();
                                }
                            });
                        });
                    }
                });
            });
        });
    });
}

module.exports = { GLOBAL_SCHEMA, TENANT_SCHEMA, initializeGlobalSchema, initializeHouseholdSchema };
