const { verbose } = require('sqlite3');

/**
 * Defines the schema for a standard Household Database.
 * This includes tables for Users, Members, Calendar Dates, and future modules.
 */

const SCHEMA_DEFINITIONS = [
    // --- USERS TABLE (Local access) ---
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password_hash TEXT,
        email TEXT,
        avatar TEXT,
        role TEXT DEFAULT 'member', -- admin, member, viewer
        dashboard_layout TEXT
    )`,

    // --- MEMBERS TABLE (Residents & Pets) ---
    `CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        avatar TEXT -- base64 or URL
    )`,

    // --- DATES TABLE (Calendar) ---
    `CREATE TABLE IF NOT EXISTS dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        end_date TEXT,      -- YYYY-MM-DD or ISO8601
        is_all_day BOOLEAN DEFAULT 1,
        type TEXT DEFAULT 'event', -- birthday, anniversary, holiday, other
        description TEXT,
        emoji TEXT,
        recurrence TEXT DEFAULT 'none', -- none, daily, weekly, monthly, yearly
        recurrence_end_date TEXT,
        member_id INTEGER
    )`,

    // --- HOUSE INFORMATION (Technical/Structural) ---
    `CREATE TABLE IF NOT EXISTS house_details (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        property_type TEXT,
        construction_year INTEGER,
        tenure TEXT, -- Freehold, Leasehold
        council_tax_band TEXT,
        broadband_provider TEXT,
        broadband_account TEXT,
        broadband_router_model TEXT,
        wifi_password TEXT,
        emergency_contacts TEXT, -- JSON string
        smart_home_hub TEXT,
        notes TEXT
    )`,

    // --- VEHICLES ---
    `CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        registration TEXT,
        vin TEXT,
        year INTEGER,
        fuel_type TEXT, -- Petrol, Diesel, Electric, Hybrid
        mileage INTEGER,
        last_service_date TEXT,
        last_service_mileage INTEGER,
        insurance_provider TEXT,
        insurance_policy TEXT,
        insurance_expiry TEXT,
        mot_due TEXT,
        tax_due TEXT,
        emoji TEXT,
        notes TEXT
    )`,

    // --- ASSETS & WARRANTIES ---
    `CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT, -- Appliance, Electronics, Furniture, Tool, Other
        location TEXT, -- Room name
        manufacturer TEXT,
        model_number TEXT,
        serial_number TEXT,
        status TEXT DEFAULT 'active', -- active, broken, disposed
        purchase_date TEXT,
        purchase_price REAL,
        purchase_store TEXT,
        warranty_expiry TEXT,
        manual_url TEXT,
        notes TEXT,
        emoji TEXT
    )`,

    // --- ENERGY ACCOUNTS ---
    `CREATE TABLE IF NOT EXISTS energy_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        type TEXT, -- Dual Fuel, Electric, Gas
        account_number TEXT,
        tariff_name TEXT,
        contract_end TEXT,
        electric_meter_serial TEXT,
        electric_mpan TEXT,
        gas_meter_serial TEXT,
        gas_mprn TEXT,
        payment_method TEXT,
        notes TEXT
    )`,

    // --- WATER ---
    `CREATE TABLE IF NOT EXISTS water_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        provider TEXT,
        account_number TEXT,
        supply_type TEXT, -- Metered, Unmetered
        meter_serial TEXT,
        waste_provider TEXT,
        waste_account_number TEXT,
        notes TEXT
    )`,

    // --- COUNCIL & WASTE ---
    `CREATE TABLE IF NOT EXISTS council_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        authority_name TEXT,
        account_number TEXT,
        payment_method TEXT,
        monthly_amount REAL,
        payment_day INTEGER,
        notes TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS waste_info (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        collection_day TEXT,
        frequency TEXT, -- Weekly, Fortnightly
        bin_types TEXT, -- JSON array
        next_collection TEXT,
        notes TEXT
    )`
];

// Columns to ensure exist (Lazy Migration)
const MIGRATIONS = [
    ['users', 'avatar', 'TEXT'],
    ['users', 'dashboard_layout', 'TEXT'],
    ['members', 'emoji', 'TEXT'],
    ['members', 'breed', 'TEXT'],
    ['members', 'microchip_number', 'TEXT'],
    ['dates', 'emoji', 'TEXT'],
    ['dates', 'member_id', 'INTEGER'],
    ['dates', 'end_date', 'TEXT'],
    ['dates', 'is_all_day', 'BOOLEAN DEFAULT 1'],
    ['dates', 'recurrence', "TEXT DEFAULT 'none'"],
    ['dates', 'recurrence_end_date', 'TEXT']
];

/**
 * Applies the schema and migrations to the provided database connection.
 * @param {import('sqlite3').Database} db 
 */
function initializeHouseholdSchema(db) {
    db.serialize(() => {
        // 1. Create Tables
        SCHEMA_DEFINITIONS.forEach(sql => {
            db.run(sql, (err) => {
                if (err && !err.message.includes('already exists')) {
                    // console.error("Schema Init Error:", err.message, "\nSQL:", sql);
                }
            });
        });

        // 2. Apply Migrations
        MIGRATIONS.forEach(([table, col, definition]) => {
            const sql = `ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`;
            db.run(sql, (err) => {
                // Ignore errors
            });
        });
    });
}

module.exports = { initializeHouseholdSchema };