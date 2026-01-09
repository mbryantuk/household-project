const { verbose } = require('sqlite3');

/**
 * Defines the schema for a standard Household Database.
 * Every data model includes household_id for multi-tenancy enforcement.
 * Assets and Vehicles include financial fields for budget integration.
 */

const SCHEMA_DEFINITIONS = [
    // --- USERS TABLE ---
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        username TEXT,
        password_hash TEXT,
        email TEXT,
        avatar TEXT,
        role TEXT DEFAULT 'member', -- admin, member, viewer
        dashboard_layout TEXT
    )`,

    // --- MEMBERS TABLE ---
    `CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'adult', -- adult, child, pet, viewer
        notes TEXT,
        alias TEXT, 
        dob TEXT, 
        species TEXT, 
        breed TEXT,
        color TEXT,
        microchip_number TEXT,
        gender TEXT,
        emoji TEXT,
        avatar TEXT
    )`,

    // --- DATES TABLE ---
    `CREATE TABLE IF NOT EXISTS dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        end_date TEXT,
        is_all_day BOOLEAN DEFAULT 1,
        type TEXT DEFAULT 'event',
        description TEXT,
        emoji TEXT,
        recurrence TEXT DEFAULT 'none',
        recurrence_end_date TEXT,
        member_id INTEGER
    )`,

    // --- HOUSE INFORMATION ---
    `CREATE TABLE IF NOT EXISTS house_details (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        household_id INTEGER,
        property_type TEXT,
        construction_year INTEGER,
        tenure TEXT,
        council_tax_band TEXT,
        broadband_provider TEXT,
        broadband_account TEXT,
        broadband_router_model TEXT,
        wifi_password TEXT,
        emergency_contacts TEXT,
        smart_home_hub TEXT,
        notes TEXT
    )`,

    // --- VEHICLES (Asset-First with Financials) ---
    `CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        registration TEXT,
        year INTEGER,
        fuel_type TEXT,
        mileage INTEGER,
        mot_due TEXT,
        tax_due TEXT,
        emoji TEXT,
        notes TEXT,
        -- Financial Fields
        purchase_value REAL DEFAULT 0,
        replacement_cost REAL DEFAULT 0,
        monthly_maintenance_cost REAL DEFAULT 0,
        depreciation_rate REAL DEFAULT 0
    )`,

    // --- VEHICLE SUB-MODULES ---
    `CREATE TABLE IF NOT EXISTS vehicle_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        vehicle_id INTEGER,
        date TEXT NOT NULL,
        mileage INTEGER,
        description TEXT,
        cost REAL,
        provider TEXT,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS vehicle_finance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        vehicle_id INTEGER,
        provider TEXT NOT NULL,
        monthly_payment REAL,
        start_date TEXT,
        end_date TEXT,
        balloon_payment REAL,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS vehicle_insurance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        vehicle_id INTEGER,
        provider TEXT NOT NULL,
        policy_number TEXT,
        expiry_date TEXT,
        premium REAL,
        excess REAL,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`,

    // --- ASSETS (Appliance Register with Financials) ---
    `CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        name TEXT NOT NULL,
        category TEXT, -- Appliance, Electronics, etc.
        location TEXT,
        manufacturer TEXT,
        model_number TEXT,
        serial_number TEXT,
        status TEXT DEFAULT 'active',
        purchase_date TEXT,
        warranty_expiry TEXT,
        notes TEXT,
        emoji TEXT,
        -- Financial Fields
        purchase_value REAL DEFAULT 0,
        replacement_cost REAL DEFAULT 0,
        monthly_maintenance_cost REAL DEFAULT 0,
        depreciation_rate REAL DEFAULT 0
    )`,

    // --- ENERGY ACCOUNTS ---
    `CREATE TABLE IF NOT EXISTS energy_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        provider TEXT NOT NULL,
        type TEXT,
        account_number TEXT,
        contract_end TEXT,
        payment_method TEXT,
        notes TEXT
    )`,

    // --- WATER INFO ---
    `CREATE TABLE IF NOT EXISTS water_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        household_id INTEGER,
        provider TEXT,
        account_number TEXT,
        notes TEXT
    )`,

    // --- COUNCIL INFO ---
    `CREATE TABLE IF NOT EXISTS council_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        household_id INTEGER,
        authority_name TEXT,
        monthly_amount REAL,
        notes TEXT
    )`,

    // --- WASTE COLLECTIONS ---
    `CREATE TABLE IF NOT EXISTS waste_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER,
        waste_type TEXT NOT NULL,
        frequency TEXT NOT NULL, -- Daily, Weekly, Biweekly, Monthly
        collection_day TEXT NOT NULL,
        notes TEXT
    )`
];

const MIGRATIONS = [
    ['users', 'household_id', 'INTEGER'],
    ['members', 'household_id', 'INTEGER'],
    ['dates', 'household_id', 'INTEGER'],
    ['house_details', 'household_id', 'INTEGER'],
    ['vehicles', 'household_id', 'INTEGER'],
    ['vehicles', 'purchase_value', 'REAL DEFAULT 0'],
    ['vehicles', 'replacement_cost', 'REAL DEFAULT 0'],
    ['vehicles', 'monthly_maintenance_cost', 'REAL DEFAULT 0'],
    ['vehicles', 'depreciation_rate', 'REAL DEFAULT 0'],
    ['assets', 'household_id', 'INTEGER'],
    ['assets', 'purchase_value', 'REAL DEFAULT 0'],
    ['assets', 'replacement_cost', 'REAL DEFAULT 0'],
    ['assets', 'monthly_maintenance_cost', 'REAL DEFAULT 0'],
    ['assets', 'depreciation_rate', 'REAL DEFAULT 0']
];

function initializeHouseholdSchema(db) {
    db.serialize(() => {
        SCHEMA_DEFINITIONS.forEach(sql => {
            db.run(sql, (err) => {
                // Ignore "already exists"
            });
        });

        MIGRATIONS.forEach(([table, col, definition]) => {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`, (err) => {
                // Ignore "duplicate column"
            });
        });
    });
}

module.exports = { initializeHouseholdSchema };