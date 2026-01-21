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
        theme TEXT DEFAULT 'totem',
        default_household_id INTEGER,
        is_active INTEGER DEFAULT 1,
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
        auto_backup INTEGER DEFAULT 1,
        backup_retention INTEGER DEFAULT 7,
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
    `CREATE TABLE IF NOT EXISTS vehicle_finance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        vehicle_id INTEGER,
        provider TEXT,
        account_number TEXT, -- Encrypted
        total_amount REAL,
        remaining_balance REAL,
        monthly_payment REAL,
        interest_rate REAL,
        start_date DATE,
        end_date DATE,
        payment_day INTEGER,
        emoji TEXT,
        notes TEXT,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS vehicle_insurance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        vehicle_id INTEGER,
        provider TEXT,
        policy_number TEXT, -- Encrypted
        renewal_date DATE,
        premium REAL,
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
        parent_type TEXT, -- house, vehicle, member, general, pet, asset
        parent_id INTEGER,
        name TEXT,
        amount REAL,
        frequency TEXT, -- monthly, annual, weekly, one-off
        category TEXT, -- insurance, tax, service, utility, subscription, other
        payment_day INTEGER,
        last_paid DATE,
        next_due DATE,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        nearest_working_day INTEGER DEFAULT 1,
        is_subscription INTEGER DEFAULT 0,
        term_type TEXT DEFAULT 'rolling' -- fixed, rolling
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
    `CREATE TABLE IF NOT EXISTS water_info (
        household_id INTEGER PRIMARY KEY,
        provider TEXT,
        account_number TEXT, -- Encrypted
        supply_type TEXT,
        meter_serial TEXT,
        monthly_amount REAL,
        payment_day INTEGER,
        notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS council_info (
        household_id INTEGER PRIMARY KEY,
        authority_name TEXT,
        account_number TEXT, -- Encrypted
        payment_method TEXT,
        monthly_amount REAL,
        payment_day INTEGER,
        band TEXT,
        notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS energy_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        provider TEXT,
        account_number TEXT, -- Encrypted
        type TEXT, -- Gas, Electric, Dual
        tariff_name TEXT,
        contract_end_date DATE,
        monthly_amount REAL,
        payment_day INTEGER,
        notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS waste_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        bin_type TEXT, 
        waste_type TEXT, -- Alias for tests
        frequency TEXT,
        day_of_week TEXT,
        collection_day TEXT, -- Alias for tests
        next_date DATE,
        color TEXT,
        emoji TEXT,
        notes TEXT
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
        notes TEXT
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
        notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS finance_loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        lender TEXT,
        loan_type TEXT,
        account_number TEXT, -- Encrypted
        total_amount REAL,
        remaining_balance REAL,
        interest_rate REAL,
        monthly_payment REAL,
        start_date DATE,
        end_date DATE,
        emoji TEXT,
        notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS finance_mortgages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        asset_id INTEGER, -- Linked to assets table (Property)
        lender TEXT,
        property_address TEXT,
        account_number TEXT, -- Encrypted
        total_amount REAL,
        remaining_balance REAL,
        interest_rate REAL,
        monthly_payment REAL,
        term_years INTEGER,
        term_months INTEGER DEFAULT 0,
        start_date DATE,
        fixed_rate_expiry DATE,
        repayment_type TEXT, -- Repayment, Interest Only
        equity_loan_amount REAL DEFAULT 0,
        equity_loan_start_date DATE,
        equity_loan_interest_rate REAL DEFAULT 1.75,
        equity_loan_cpi_rate REAL DEFAULT 2.0,
        estimated_value REAL DEFAULT 0,
        other_secured_debt REAL DEFAULT 0,
        mortgage_type TEXT DEFAULT 'mortgage', -- mortgage, equity
        payment_day INTEGER,
        follow_on_rate REAL,
        follow_on_payment REAL,
        original_purchase_price REAL,
        emoji TEXT,
        notes TEXT,
        FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL
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
        notes TEXT
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
        notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS finance_agreements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        provider TEXT,
        agreement_name TEXT,
        account_number TEXT, -- Encrypted
        total_amount REAL,
        remaining_balance REAL,
        monthly_payment REAL,
        interest_rate REAL,
        start_date DATE,
        end_date DATE,
        emoji TEXT,
        notes TEXT
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
        PRIMARY KEY (household_id, cycle_start, item_key)
    )`,
    `CREATE TABLE IF NOT EXISTS finance_budget_cycles (
        household_id INTEGER,
        cycle_start DATE, 
        actual_pay REAL,
        current_balance REAL,
        PRIMARY KEY (household_id, cycle_start)
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

        const mortgageCols = [
            ['equity_loan_amount', 'REAL'],
            ['equity_loan_start_date', 'DATE'],
            ['equity_loan_interest_rate', 'REAL'],
            ['equity_loan_cpi_rate', 'REAL'],
            ['estimated_value', 'REAL'],
            ['other_secured_debt', 'REAL'],
            ['mortgage_type', "TEXT DEFAULT 'mortgage'"],
            ['asset_id', 'INTEGER'],
            ['term_months', 'INTEGER DEFAULT 0'],
            ['follow_on_rate', 'REAL'],
            ['follow_on_payment', 'REAL'],
            ['original_purchase_price', 'REAL']
        ];

        mortgageCols.forEach(([col, type]) => {
            db.run(`ALTER TABLE finance_mortgages ADD COLUMN ${col} ${type}`, () => {});
        });

        const additionalFinanceCols = [
            ['finance_budget_progress', 'actual_amount', 'REAL'],
            ['finance_pensions', 'payment_day', 'INTEGER'],
            ['finance_income', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['finance_credit_cards', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['finance_loans', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['finance_mortgages', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['finance_agreements', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['vehicle_finance', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['water_info', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['council_info', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['energy_accounts', 'nearest_working_day', 'INTEGER DEFAULT 1'],
            ['finance_pensions', 'nearest_working_day', 'INTEGER DEFAULT 1']
        ];

        additionalFinanceCols.forEach(([table, col, type]) => {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, () => {});
        });

        // 🛠️ MIGRATION: Ensure recurring_costs has all required columns
        const recurringCostCols = [
            ['last_paid', 'DATE'],
            ['next_due', 'DATE'],
            ['is_active', 'INTEGER DEFAULT 1']
        ];
        recurringCostCols.forEach(([col, type]) => {
            db.run(`ALTER TABLE recurring_costs ADD COLUMN ${col} ${type}`, () => {});
        });
    });
}

module.exports = { GLOBAL_SCHEMA, TENANT_SCHEMA, initializeGlobalSchema, initializeHouseholdSchema };