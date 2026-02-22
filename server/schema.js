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
        mode TEXT DEFAULT 'system',
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  `CREATE TABLE IF NOT EXISTS passkeys (
        id TEXT PRIMARY KEY, -- Credential ID (base64url)
        user_id INTEGER,
        webauthn_user_id TEXT, -- User handle (base64url)
        public_key TEXT, -- COSE key (base64url)
        counter INTEGER,
        device_type TEXT, -- 'singleDevice' or 'multiDevice'
        backed_up INTEGER,
        transports TEXT, -- JSON array of transports
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  `CREATE TABLE IF NOT EXISTS user_challenges (
        challenge TEXT PRIMARY KEY,
        user_id INTEGER,
        email TEXT,
        expires_at DATETIME,
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
        debug_mode INTEGER DEFAULT 0,
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
    )`,
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
        account_number TEXT, 
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
        account_number TEXT, 
        sort_code TEXT, 
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
        account_number TEXT, 
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
        account_number TEXT, 
        type TEXT, 
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
        asset_type TEXT, 
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
        cycle_start DATE, 
        item_key TEXT,    
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
        entity_type TEXT, 
        entity_id INTEGER,
        member_id INTEGER,
        PRIMARY KEY (entity_type, entity_id, member_id)
    )`,
  `CREATE TABLE IF NOT EXISTS shopping_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        quantity TEXT DEFAULT '1',
        is_checked INTEGER DEFAULT 0,
        estimated_cost REAL DEFAULT 0,
        week_start DATE, -- The start of the weekly cycle (Monday)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  `CREATE TABLE IF NOT EXISTS chores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT,
        description TEXT,
        assigned_member_id INTEGER,
        frequency TEXT, 
        value REAL DEFAULT 0, 
        next_due_date DATE,
        emoji TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(assigned_member_id) REFERENCES members(id) ON DELETE SET NULL
    )`,
  `CREATE TABLE IF NOT EXISTS chore_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        chore_id INTEGER,
        member_id INTEGER,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        value_earned REAL DEFAULT 0,
        FOREIGN KEY(chore_id) REFERENCES chores(id) ON DELETE SET NULL,
        FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE SET NULL
    )`,
  `CREATE TABLE IF NOT EXISTS shopping_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT,
        items TEXT, -- JSON Array of items {name, quantity, category, estimated_cost}
        frequency TEXT, -- 'weekly', 'bi-weekly', 'monthly'
        day_of_week INTEGER, -- 0-6 (Sun-Sat)
        day_of_month INTEGER,
        next_run_date DATE,
        last_generated_cycle DATE, -- Track when items were last added to list
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  `CREATE TABLE IF NOT EXISTS shopping_cycle_progress (
        household_id INTEGER,
        schedule_id INTEGER,
        cycle_date DATE,
        is_completed INTEGER DEFAULT 0,
        actual_cost REAL DEFAULT 0,
        completed_at DATETIME,
        PRIMARY KEY (household_id, schedule_id, cycle_date),
        FOREIGN KEY(schedule_id) REFERENCES shopping_schedules(id) ON DELETE CASCADE
    )`,
];

function initializeGlobalSchema(db) {
  db.serialize(() => {
    GLOBAL_SCHEMA.forEach((sql) => {
      db.run(sql, (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error('Global Schema Init Error:', err.message);
        }
      });
    });

    // 🛠️ MIGRATION: Column additions for users
    const userCols = [
      ['budget_settings', 'TEXT'],
      ['custom_theme', 'TEXT'],
      ['last_household_id', 'INTEGER'],
      ['mode', "TEXT DEFAULT 'system'"],
      ['mfa_enabled', 'INTEGER DEFAULT 0'],
      ['mfa_secret', 'TEXT'],
      ['current_challenge', 'TEXT'],
    ];
    userCols.forEach(([col, type]) => {
      db.run(`ALTER TABLE users ADD COLUMN ${col} ${type}`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          // Ignore duplicate column errors
        }
      });
    });

    db.run(`ALTER TABLE user_sessions ADD COLUMN created_at DATETIME`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
      }
    });

    const hhCols = [
      ['nightly_version_filter', 'TEXT'],
      ['debug_mode', 'INTEGER DEFAULT 0'],
      ['metadata_schema', 'TEXT'],
    ];
    hhCols.forEach(([col, type]) => {
      db.run(`ALTER TABLE households ADD COLUMN ${col} ${type}`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
        }
      });
    });

    db.run(`ALTER TABLE test_results ADD COLUMN version TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
      }
    });
  });
}

function initializeHouseholdSchema(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Create Base Tables
      TENANT_SCHEMA.forEach((sql) => {
        db.run(sql, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error('Household Schema Init Error:', err.message);
          }
        });
      });

      // 2. Run Migrations (Column Additions)
      const migrations = [
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
        ['recurring_costs', 'financial_profile_id', 'INTEGER'],
      ];

      migrations.forEach(([table, col, type]) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            // Ignore
          }
        });
      });

      // 3. Ensure Default Profile and Backfill
      db.get('SELECT id FROM finance_profiles WHERE is_default = 1', (err, row) => {
        if (!err && !row) {
          db.run(
            "INSERT INTO finance_profiles (household_id, name, is_default, emoji) VALUES (1, 'Joint Finances', 1, '💰')",
            function (err) {
              if (!err && this.lastID) {
                const defId = this.lastID;
                const tables = [
                  'finance_income',
                  'finance_current_accounts',
                  'finance_savings',
                  'finance_credit_cards',
                  'finance_pensions',
                  'finance_investments',
                  'recurring_costs',
                ];
                tables.forEach((t) =>
                  db.run(
                    `UPDATE ${t} SET financial_profile_id = ? WHERE financial_profile_id IS NULL`,
                    [defId]
                  )
                );
              }
            }
          );
        }
      });

      // 4. Multi-Profile Budget Tables Check
      db.all('PRAGMA table_info(finance_budget_cycles)', (err, info) => {
        if (!err && info && !info.some((c) => c.name === 'financial_profile_id')) {
          // Logic to recreate budget tables for multi-profile PK
        }
      });

      resolve();
    });
  });
}

module.exports = {
  GLOBAL_SCHEMA,
  TENANT_SCHEMA,
  initializeGlobalSchema,
  initializeHouseholdSchema,
};
