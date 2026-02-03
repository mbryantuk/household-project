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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        cycle_start DATE, -- The payday date starting this cycle
        item_key TEXT,    -- Format: 'type_id' e.g. 'mortgage_5'
        is_paid INTEGER DEFAULT 0,
        actual_amount REAL,
        actual_date DATE,
        PRIMARY KEY (household_id, cycle_start, item_key)
    )`,
    `CREATE TABLE IF NOT EXISTS finance_budget_cycles (
        household_id INTEGER,
        cycle_start DATE, 
        actual_pay REAL,
        current_balance REAL,
        bank_account_id INTEGER,
        PRIMARY KEY (household_id, cycle_start),
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
    db.serialize(() => {
        TENANT_SCHEMA.forEach(sql => {
            db.run(sql, (err) => {
                if (err && !err.message.includes('already exists')) {
                    console.error("Household Schema Init Error:", err.message);
                }
            });
        });

        // 🛠️ MIGRATION: Ensure new finance columns exist
        const financeIncomeCols = [
            ['member_id', 'INTEGER'], 
            ['bank_account_id', 'INTEGER'], 
            ['employer', 'TEXT'], 
            ['role', 'TEXT'], 
            ['employment_type', 'TEXT'],
            ['work_type', 'TEXT'], 
            ['gross_annual_salary', 'REAL'], 
            ['addons', 'TEXT'],
            ['is_primary', 'INTEGER DEFAULT 0']
        ];
        
        financeIncomeCols.forEach(([col, type]) => {
            db.run(`ALTER TABLE finance_income ADD COLUMN ${col} ${type}`, () => {});
        });

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
            ['finance_budget_cycles', 'bank_account_id', 'INTEGER']
        ];

        additionalFinanceCols.forEach(([table, col, type]) => {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, () => {});
        });

        // 🛠️ COMPREHENSIVE MIGRATION TO recurring_costs
        const legacyTables = [
            { name: 'finance_recurring_charges', type: 'charge' },
            { name: 'water_accounts', type: 'water' },
            { name: 'energy_accounts', type: 'energy' },
            { name: 'council_accounts', type: 'council' },
            { name: 'waste_collections', type: 'waste' },
            { name: 'vehicle_finance', type: 'vehicle_finance' },
            { name: 'vehicle_insurance', type: 'vehicle_insurance' },
            { name: 'vehicle_service_plans', type: 'vehicle_service' },
            { name: 'finance_loans', type: 'loan' },
            { name: 'finance_agreements', type: 'agreement' },
            { name: 'finance_mortgages', type: 'mortgage' }
        ];

        legacyTables.forEach(table => {
            db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table.name}'`, (err, row) => {
                if (row) {
                    console.log(`🛠️ Migrating ${table.name} to recurring_costs...`);
                    db.all(`SELECT * FROM ${table.name}`, (err, rows) => {
                        if (rows && rows.length > 0) {
                            rows.forEach(r => {
                                let object_type = 'household';
                                let object_id = null;
                                let category_id = table.type;
                                let metadata = {};
                                let amount = r.amount || r.monthly_amount || r.monthly_payment || r.premium || r.monthly_cost || 0;
                                let frequency = r.frequency || 'monthly';
                                let start_date = r.start_date || r.purchase_date || r.date || null;
                                let day_of_month = r.payment_day || r.day_of_month || null;
                                let name = r.name || r.provider || r.authority_name || r.lender || r.bin_type || r.agreement_name || 'Legacy Cost';
                                let emoji = r.emoji || null;
                                let notes = r.notes || null;

                                // Specialized Mapping
                                if (table.name.startsWith('vehicle_')) {
                                    object_type = 'vehicle';
                                    object_id = r.vehicle_id;
                                } else if (table.name === 'finance_recurring_charges') {
                                    object_type = r.linked_entity_type || 'household';
                                    object_id = r.linked_entity_id;
                                    category_id = r.segment;
                                }

                                // Collect Metadata
                                Object.keys(r).forEach(key => {
                                    if (!['id', 'household_id', 'amount', 'monthly_amount', 'monthly_payment', 'premium', 'monthly_cost', 'frequency', 'start_date', 'payment_day', 'day_of_month', 'name', 'provider', 'authority_name', 'lender', 'bin_type', 'agreement_name', 'emoji', 'notes', 'vehicle_id', 'linked_entity_type', 'linked_entity_id'].includes(key)) {
                                        metadata[key] = r[key];
                                    }
                                });

                                db.run(`INSERT INTO recurring_costs (
                                    household_id, object_type, object_id, category_id, name, amount, frequency, 
                                    start_date, day_of_month, emoji, notes, metadata
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                                    r.household_id, object_type, object_id, category_id, name, amount, frequency,
                                    start_date, day_of_month, emoji, notes, JSON.stringify(metadata)
                                ]);
                            });
                        }
                        // Drop Table after migration
                        console.log(`✅ ${table.name} migrated. Dropping legacy table.`);
                        db.run(`DROP TABLE ${table.name}`);
                    });
                }
            });
        });
    });
}

module.exports = { GLOBAL_SCHEMA, TENANT_SCHEMA, initializeGlobalSchema, initializeHouseholdSchema };
