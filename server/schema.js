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

    // --- MEMBERS TABLE (Residents) ---
    `CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'adult',
        notes TEXT,
        alias TEXT, 
        dob TEXT, 
        species TEXT, 
        gender TEXT,
        emoji TEXT
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
    )`
];

// Columns to ensure exist (Lazy Migration)
// Format: [Table, Column, Type/Definition]
const MIGRATIONS = [
    ['users', 'avatar', 'TEXT'],
    ['users', 'dashboard_layout', 'TEXT'],
    ['members', 'emoji', 'TEXT'],
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
                if (err) console.error("Schema Init Error:", err.message, "\nSQL:", sql);
            });
        });

        // 2. Apply Migrations (Idempotent column additions)
        MIGRATIONS.forEach(([table, col, definition]) => {
            const sql = `ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`;
            db.run(sql, (err) => {
                // Ignore "duplicate column name" error (code 1 or message check)
                if (err && !err.message.includes('duplicate column name')) {
                    // console.warn(`Migration notice for ${table}.${col}:`, err.message);
                }
            });
        });
    });
}

module.exports = { initializeHouseholdSchema };